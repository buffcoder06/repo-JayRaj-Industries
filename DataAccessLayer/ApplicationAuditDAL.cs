using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;
using JayRaj_Industries.Models;
using Microsoft.Extensions.Logging;

public class ApplicationAuditDAL
{
    private readonly string _connectionString;
    private readonly ILogger<ApplicationAuditDAL> _logger;

    public ApplicationAuditDAL(IConfiguration configuration, ILogger<ApplicationAuditDAL> logger)
    {
        _connectionString = configuration.GetConnectionString("Jayraj_Industries")
            ?? throw new InvalidOperationException("Connection string 'Jayraj_Industries' was not found.");
        _logger = logger;
    }

    public async Task LogExceptionAsync(
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
            await con.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }
        catch (Exception logEx)
        {
            // Never throw from audit logging — but make the failure visible in logs
            // instead of swallowing it silently.
            _logger.LogError(logEx, "Failed to write exception audit log for {Controller}.{Action}.", controllerName, actionName);
        }
    }

    public async Task LogInvoiceDataAsync(
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
            await con.OpenAsync();

            long headerId = await InsertInvoiceAuditHeaderAsync(
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
                await InsertInvoiceAuditDetailAsync(con, headerId, item);
            }
        }
        catch (Exception logEx)
        {
            // Never throw from audit logging — but make the failure visible in logs
            // instead of swallowing it silently.
            _logger.LogError(logEx, "Failed to write invoice audit log for {Controller}.{Action}.", controllerName, sourceAction);
        }
    }

    private async Task<long> InsertInvoiceAuditHeaderAsync(
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

        await cmd.ExecuteNonQueryAsync();

        return outputParam.Value == DBNull.Value ? 0 : Convert.ToInt64(outputParam.Value);
    }

    private async Task InsertInvoiceAuditDetailAsync(SqlConnection con, long headerId, InvoiceLineItem item)
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

        await cmd.ExecuteNonQueryAsync();
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
