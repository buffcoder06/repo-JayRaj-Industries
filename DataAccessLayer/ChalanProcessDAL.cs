using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.Threading.Tasks;
using JayRaj_Industries.Models;

public class ChalanProcessDAL
{
    private readonly string _connectionString;

    public ChalanProcessDAL(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("Jayraj_Industries")
            ?? throw new InvalidOperationException("Connection string 'Jayraj_Industries' was not found.");
    }

    private async Task<int> ExecuteNonQueryAsync(string storedProcedure, params SqlParameter[] parameters)
    {
        using (SqlConnection con = new SqlConnection(_connectionString))
        using (SqlCommand cmd = new SqlCommand(storedProcedure, con))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            if (parameters != null) cmd.Parameters.AddRange(parameters);
            await con.OpenAsync();
            return await cmd.ExecuteNonQueryAsync();
        }
    }

    private static object DbValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? DBNull.Value : value;
    }

    // Chalan quantities are stored as whole numbers (the stored procedures CAST
    // them to INT), so round rather than carry decimal places through to SQL.
    private static string FormatQuantity(decimal value)
    {
        return Math.Round(value, MidpointRounding.AwayFromZero).ToString("F0", CultureInfo.InvariantCulture);
    }

    // Stored procedures store/compare chalan dates as plain strings (including a
    // string < string "older pending orders" check in sp_InsertIntoChalanProcessDtls),
    // so the yyyy-MM-dd format must stay exact and zero-padded.
    private static string FormatDate(DateTime value)
    {
        return value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    private static DateTime ParseDate(object value)
    {
        var text = value?.ToString();
        return string.IsNullOrWhiteSpace(text) ? DateTime.MinValue : DateTime.Parse(text, CultureInfo.InvariantCulture);
    }

    private static decimal ParseDecimal(object value)
    {
        var text = value?.ToString();
        return string.IsNullOrWhiteSpace(text) ? 0m : decimal.Parse(text, CultureInfo.InvariantCulture);
    }

    // SqlDataAdapter.Fill has no async overload in ADO.NET (true of both
    // System.Data.SqlClient and Microsoft.Data.SqlClient), so this stays
    // synchronous — called directly (not awaited) from async callers.
    private DataTable ExecuteDataTable(string storedProcedure, params SqlParameter[] parameters)
    {
        using (SqlConnection con = new SqlConnection(_connectionString))
        using (SqlCommand cmd = new SqlCommand(storedProcedure, con))
        using (SqlDataAdapter adapter = new SqlDataAdapter(cmd))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            if (parameters != null) cmd.Parameters.AddRange(parameters);
            DataTable dt = new DataTable();
            adapter.Fill(dt);
            return dt;
        }
    }

    private async Task<List<T>> ExecuteReaderAsync<T>(string storedProcedure, Func<SqlDataReader, T> readRow, params SqlParameter[] parameters)
    {
        var results = new List<T>();

        using (SqlConnection con = new SqlConnection(_connectionString))
        using (SqlCommand cmd = new SqlCommand(storedProcedure, con))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            if (parameters != null) cmd.Parameters.AddRange(parameters);
            await con.OpenAsync();

            using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    results.Add(readRow(reader));
                }
            }
        }

        return results;
    }

    public Task InsertChalanProcessAsync(CreateChalanRequest request, string createdBy, string updatedBy, long sessionId)
    {
        return ExecuteNonQueryAsync("sp_InsertIntoChallanProcess",
            new SqlParameter("@ChalanDate", FormatDate(request.Date)),
            new SqlParameter("@Component_Desc", DbValue(request.ComponentDescription)),
            new SqlParameter("@Company_Cd", DbValue(request.CompanyCode)),
            new SqlParameter("@InChalanNo", DbValue(request.ChalanNo)),
            new SqlParameter("@OutChalanNo", "NA"),
            new SqlParameter("@Company_Name", DbValue(request.CompanyName)),
            new SqlParameter("@VehicleNo", DbValue(request.VehicleNumber)),
            new SqlParameter("@Vendor_Vehicle_ChallanNo", DbValue(request.VehicleChalanNumber)),
            new SqlParameter("@Actual_InMaterial_Quantity", FormatQuantity(request.Quantity)),
            new SqlParameter("@Pending_Quantity", FormatQuantity(request.Quantity)),
            new SqlParameter("@OutMaterial_Quantity", "0"),
            new SqlParameter("@RejectMaterial_Quantity", "0"),
            new SqlParameter("@Remarks", "Done"),
            new SqlParameter("@Remark_StatusID", (object)0),
            new SqlParameter("@CreatedBy", DbValue(createdBy)),
            new SqlParameter("@UpdatedBy", DbValue(updatedBy)),
            new SqlParameter("@SessionID", sessionId)
        );
    }

    private static ChalanListItem ReadChalanListItem(SqlDataReader reader) => new()
    {
        ChalanProcessId = reader.GetInt64(reader.GetOrdinal("f_PK_Chalan_ProcessID")),
        ChalanProcessHdrSeq = reader["f_Chalan_Proccess_HdrSeq"].ToString() ?? string.Empty,
        Date = ParseDate(reader["f_ChalanDate"]),
        ComponentDescription = reader["f_Component_Desc"].ToString() ?? string.Empty,
        ChalanNo = reader["f_InChalanNo"].ToString() ?? string.Empty,
        CompanyName = reader["f_Company_Name"].ToString(),
        CompanyCode = reader["f_Company_Cd"].ToString(),
        VehicleNumber = reader["f_VehicleNo"].ToString(),
        VehicleChalanNumber = reader["f_Vendor_Vehicle_ChallanNo"].ToString(),
        ActualInMaterialQuantity = ParseDecimal(reader["f_Actual_InMaterial_Quantity"]),
        PendingQuantity = ParseDecimal(reader["f_Pending_Quantity"]),
        OutMaterialQuantity = ParseDecimal(reader["f_OutMaterial_Quantity"]),
        RejectMaterialQuantity = ParseDecimal(reader["f_RejectMaterial_Quantity"]),
        Remarks = reader["f_Remarks"].ToString(),
        RemarkStatusId = reader.GetInt32(reader.GetOrdinal("f_Remark_StatusID"))
    };

    public async Task<ChalanPeriodSummary> GetPeriodSummaryAsync(DateTime startDate, DateTime endDate)
    {
        using (SqlConnection con = new SqlConnection(_connectionString))
        using (SqlCommand cmd = new SqlCommand("sp_Get_CurrentMonth_ChalanSummary", con))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@StartDate", FormatDate(startDate));
            cmd.Parameters.AddWithValue("@EndDate", FormatDate(endDate));

            await con.OpenAsync();
            using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
            {
                if (await reader.ReadAsync())
                {
                    return new ChalanPeriodSummary
                    {
                        IncomingChalanCount = reader.GetInt32(reader.GetOrdinal("IncomingChalanCount")),
                        TotalInMaterial = ParseDecimal(reader["TotalInMaterial"]),
                        TotalOutMaterial = ParseDecimal(reader["TotalOutMaterial"]),
                        TotalPendingMaterial = ParseDecimal(reader["TotalPendingMaterial"]),
                        TotalRejectedMaterial = ParseDecimal(reader["TotalRejectedMaterial"])
                    };
                }
            }
        }

        return new ChalanPeriodSummary();
    }

    public Task<List<ChalanListItem>> GetAllChalanProcessDataAsync(string? chalanProcessHdrseq = null)
    {
        return ExecuteReaderAsync("sp_GetAllChallanProcessData", ReadChalanListItem,
            new SqlParameter("@ChalanProcessHdrseq", chalanProcessHdrseq ?? (object)DBNull.Value)
        );
    }

    public Task<List<ChalanListItem>> GetChalanProcessDataBasedOnCompAsync(string? compDesc = null)
    {
        return ExecuteReaderAsync("sp_GetChalanEntriesByComp", ReadChalanListItem,
            new SqlParameter("@ComponentDesc", compDesc ?? (object)DBNull.Value)
        );
    }

    public DataTable GetTotalComponentDetails(string? startDate = null, string? endDate = null)
    {
        return ExecuteDataTable("sp_Get_Total_Components_Dtls",
            new SqlParameter("@StartDate", DbValue(startDate)),
            new SqlParameter("@EndDate", DbValue(endDate))
        );
    }

    public DataTable GetTotalInComponentDetails(string? startDate = null, string? endDate = null)
    {
        return ExecuteDataTable("sp_Get_Total_InComponents_Dtls",
            new SqlParameter("@StartDate", DbValue(startDate)),
            new SqlParameter("@EndDate", DbValue(endDate))
        );
    }

    public Task<List<ChalanDetailItem>> GetAllChalanProcessDetailsAsync(string? chalanProcessHdrseq)
    {
        return ExecuteReaderAsync("sp_GetChalanProcessDtls", reader => new ChalanDetailItem
        {
            ChalanDetailSeq = reader["f_Chalan_Proccess_DtlsSeq"].ToString() ?? string.Empty,
            DetailDate = ParseDate(reader["f_ChalanDtls_Date"]),
            OutChalanNo = reader["f_OutChalanNo"].ToString(),
            CompanyName = reader["f_Company_Name"].ToString(),
            InChalanNo = reader["f_InChalanNo"].ToString(),
            ActualInMaterialQuantity = ParseDecimal(reader["f_Actual_InMaterial_Quantity"]),
            PendingQuantity = ParseDecimal(reader["f_Pending_Quantity"]),
            OutMaterialQuantity = ParseDecimal(reader["f_OutMaterial_Quantity"]),
            RejectMaterialQuantity = ParseDecimal(reader["f_RejectMaterial_Quantity"]),
            ComponentDescription = reader["f_Component_Desc"].ToString() ?? string.Empty
        },
        new SqlParameter("@ChalanProcessHdrseq", chalanProcessHdrseq ?? (object)DBNull.Value)
        );
    }

    public async Task<bool> InsertIntoChalanProcessDtlsAsync(RecordChalanOutRequest request)
    {
        var rows = await ExecuteNonQueryAsync("sp_InsertIntoChalanProcessDtls",
            new SqlParameter("@chalanProcessHdrseq", DbValue(request.ChalanProcessHdrSeq)),
            new SqlParameter("@f_ChalanDtls_Date", FormatDate(request.DetailDate)),
            new SqlParameter("@f_OutChalanNo", DbValue(request.OutChalanNo)),
            new SqlParameter("@f_Pending_Quantity", FormatQuantity(request.PendingQuantity)),
            new SqlParameter("@f_OutMaterial_Quantity", FormatQuantity(request.OutMaterialQuantity)),
            new SqlParameter("@f_RejectMaterial_Quantity", FormatQuantity(request.RejectMaterialQuantity))
        );
        return rows > 0;
    }

    public async Task<bool> DeactivateRecordAsync(string? dtlseq)
    {
        var rows = await ExecuteNonQueryAsync("sp_Deactivate_Records",
            new SqlParameter("@dtlseq", DbValue(dtlseq))
        );
        return rows > 0;
    }

}
