using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using JayRaj_Industries.Models;

public class ApplicationAuditDAL
{
    private readonly string _connectionString;

    public ApplicationAuditDAL(string connectionString)
    {
        _connectionString = connectionString;
    }

    public void LogException(
        string controllerName,
        string actionName,
        Exception ex,
        string? requestPath = null,
        string? requestMethod = null,
        string? payload = null,
        string? userName = null)
    {
        try
        {
            using SqlConnection con = new SqlConnection(_connectionString);
            using SqlCommand cmd = new SqlCommand("sp_LogApplicationException", con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ControllerName", controllerName ?? string.Empty);
            cmd.Parameters.AddWithValue("@ActionName", (object?)actionName ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ErrorMessage", ex.Message);
            cmd.Parameters.AddWithValue("@StackTrace", (object?)ex.StackTrace ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@InnerException", (object?)ex.InnerException?.ToString() ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@RequestPath", (object?)requestPath ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@RequestMethod", (object?)requestMethod ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@Payload", (object?)payload ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@UserName", (object?)userName ?? DBNull.Value);
            con.Open();
            cmd.ExecuteNonQuery();
        }
        catch
        {
            // Never throw from audit logging.
        }
    }

    public void LogInvoiceData(
        string? startDate,
        string? endDate,
        string? invoiceProfile,
        string? invoiceNo,
        string? invoiceDate,
        string? generatedBy,
        string? controllerName,
        string? sourceAction,
        decimal assessableValue,
        decimal cgstAmount,
        decimal sgstAmount,
        decimal gstAmount,
        decimal grandTotal,
        List<InvoiceLineItem> items)
    {
        if (items == null)
        {
            return;
        }

        try
        {
            using SqlConnection con = new SqlConnection(_connectionString);
            con.Open();

            long headerId = InsertInvoiceAuditHeader(
                con,
                startDate,
                endDate,
                invoiceProfile,
                invoiceNo,
                invoiceDate,
                generatedBy,
                items.Count,
                SumQty(items),
                SumAmount(items),
                assessableValue,
                cgstAmount,
                sgstAmount,
                gstAmount,
                grandTotal,
                controllerName,
                sourceAction);

            foreach (var item in items)
            {
                InsertInvoiceAuditDetail(con, headerId, item);
            }
        }
        catch
        {
            // Never throw from audit logging.
        }
    }

    private long InsertInvoiceAuditHeader(
        SqlConnection con,
        string? startDate,
        string? endDate,
        string? invoiceProfile,
        string? invoiceNo,
        string? invoiceDate,
        string? generatedBy,
        int itemCount,
        decimal totalQty,
        decimal totalAmount,
        decimal assessableValue,
        decimal cgstAmount,
        decimal sgstAmount,
        decimal gstAmount,
        decimal grandTotal,
        string? controllerName,
        string? sourceAction)
    {
        using SqlCommand cmd = new SqlCommand("sp_InsertInvoiceAuditHeader", con);
        cmd.CommandType = CommandType.StoredProcedure;

        cmd.Parameters.AddWithValue("@StartDate", DbValue(startDate));
        cmd.Parameters.AddWithValue("@EndDate", DbValue(endDate));
        cmd.Parameters.AddWithValue("@InvoiceProfile", DbValue(invoiceProfile));
        cmd.Parameters.AddWithValue("@InvoiceNo", DbValue(invoiceNo));
        cmd.Parameters.AddWithValue("@InvoiceDate", DbValue(invoiceDate));
        cmd.Parameters.AddWithValue("@GeneratedBy", DbValue(generatedBy));
        cmd.Parameters.AddWithValue("@ItemCount", itemCount);
        cmd.Parameters.AddWithValue("@TotalQty", totalQty);
        cmd.Parameters.AddWithValue("@TotalAmount", totalAmount);
        cmd.Parameters.AddWithValue("@AssessableValue", assessableValue);
        cmd.Parameters.AddWithValue("@CgstAmount", cgstAmount);
        cmd.Parameters.AddWithValue("@SgstAmount", sgstAmount);
        cmd.Parameters.AddWithValue("@GstAmount", gstAmount);
        cmd.Parameters.AddWithValue("@GrandTotal", grandTotal);
        cmd.Parameters.AddWithValue("@ControllerName", DbValue(controllerName));
        cmd.Parameters.AddWithValue("@SourceAction", DbValue(sourceAction));

        var outputParam = new SqlParameter("@InvoiceAuditHeaderId", SqlDbType.BigInt)
        {
            Direction = ParameterDirection.Output
        };
        cmd.Parameters.Add(outputParam);

        cmd.ExecuteNonQuery();

        return outputParam.Value == DBNull.Value ? 0 : Convert.ToInt64(outputParam.Value);
    }

    private void InsertInvoiceAuditDetail(SqlConnection con, long headerId, InvoiceLineItem item)
    {
        using SqlCommand cmd = new SqlCommand("sp_InsertInvoiceAuditDetail", con);
        cmd.CommandType = CommandType.StoredProcedure;

        cmd.Parameters.AddWithValue("@InvoiceAuditHeaderId", headerId);
        cmd.Parameters.AddWithValue("@SrNo", item.SrNo);
        cmd.Parameters.AddWithValue("@ItemDescription", DbValue(item.ItemDescription));
        cmd.Parameters.AddWithValue("@Qty", item.Qty);
        cmd.Parameters.AddWithValue("@Unit", DbValue(item.Unit));
        cmd.Parameters.AddWithValue("@Rate", item.Rate);
        cmd.Parameters.AddWithValue("@Amount", item.Amount);

        cmd.ExecuteNonQuery();
    }

    private static decimal SumQty(IEnumerable<InvoiceLineItem> items)
    {
        decimal total = 0m;
        foreach (var item in items)
        {
            total += item.Qty;
        }
        return total;
    }

    private static decimal SumAmount(IEnumerable<InvoiceLineItem> items)
    {
        decimal total = 0m;
        foreach (var item in items)
        {
            total += item.Amount;
        }
        return total;
    }

    private static object DbValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? DBNull.Value : value;
    }
}
