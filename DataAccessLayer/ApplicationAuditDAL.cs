using System;
using System.Collections.Generic;
using System.Data;
using JayRaj_Industries.Models;
using Npgsql;

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
            using NpgsqlConnection con = new NpgsqlConnection(_connectionString);
            using NpgsqlCommand cmd = new NpgsqlCommand(
                "select sp_logapplicationexception(@ControllerName, @ActionName, @ErrorMessage, @StackTrace, @InnerException, @RequestPath, @RequestMethod, @Payload, @UserName);",
                con);
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
            long headerId = InsertInvoiceAuditHeader(
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
                InsertInvoiceAuditDetail(headerId, item);
            }
        }
        catch
        {
            // Never throw from audit logging.
        }
    }

    private long InsertInvoiceAuditHeader(
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
        using NpgsqlConnection con = new NpgsqlConnection(_connectionString);
        using NpgsqlCommand cmd = new NpgsqlCommand(
            "select sp_insertinvoiceauditheader(@StartDate::date, @EndDate::date, @InvoiceProfile, @InvoiceNo, @InvoiceDate::date, @GeneratedBy, @ItemCount, @TotalQty, @TotalAmount, @AssessableValue, @CgstAmount, @SgstAmount, @GstAmount, @GrandTotal, @ControllerName, @SourceAction);",
            con);

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

        con.Open();
        object? value = cmd.ExecuteScalar();

        return value == null || value == DBNull.Value ? 0 : Convert.ToInt64(value);
    }

    private void InsertInvoiceAuditDetail(long headerId, InvoiceLineItem item)
    {
        using NpgsqlConnection con = new NpgsqlConnection(_connectionString);
        using NpgsqlCommand cmd = new NpgsqlCommand(
            "select sp_insertinvoiceauditdetail(@InvoiceAuditHeaderId, @SrNo, @ItemDescription, @Qty, @Unit, @Rate, @Amount);",
            con);

        cmd.Parameters.AddWithValue("@InvoiceAuditHeaderId", headerId);
        cmd.Parameters.AddWithValue("@SrNo", item.SrNo);
        cmd.Parameters.AddWithValue("@ItemDescription", DbValue(item.ItemDescription));
        cmd.Parameters.AddWithValue("@Qty", item.Qty);
        cmd.Parameters.AddWithValue("@Unit", DbValue(item.Unit));
        cmd.Parameters.AddWithValue("@Rate", item.Rate);
        cmd.Parameters.AddWithValue("@Amount", item.Amount);

        con.Open();
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
