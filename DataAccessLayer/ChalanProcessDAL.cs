using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using Npgsql;

public class ChalanProcessDAL
{
    private readonly string _connectionString;

    public ChalanProcessDAL(string connectionString)
    {
        _connectionString = connectionString;
    }

    private static string BuildParameterList(NpgsqlParameter[] parameters)
    {
        if (parameters == null || parameters.Length == 0)
        {
            return string.Empty;
        }

        return string.Join(", ", parameters.Select(p => p.ParameterName));
    }

    private int ExecuteNonQuery(string functionName, params NpgsqlParameter[] parameters)
    {
        string sql = $"select {functionName}({BuildParameterList(parameters)});";

        using (NpgsqlConnection con = new NpgsqlConnection(_connectionString))
        using (NpgsqlCommand cmd = new NpgsqlCommand(sql, con))
        {
            if (parameters != null) cmd.Parameters.AddRange(parameters);
            con.Open();
            cmd.ExecuteScalar();
            return 1;
        }
    }

    private static object DbValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? DBNull.Value : value;
    }

    private DataTable ExecuteDataTable(string functionName, params NpgsqlParameter[] parameters)
    {
        string sql = $"select * from {functionName}({BuildParameterList(parameters)});";

        using (NpgsqlConnection con = new NpgsqlConnection(_connectionString))
        using (NpgsqlCommand cmd = new NpgsqlCommand(sql, con))
        using (NpgsqlDataAdapter adapter = new NpgsqlDataAdapter(cmd))
        {
            if (parameters != null) cmd.Parameters.AddRange(parameters);
            DataTable dt = new DataTable();
            adapter.Fill(dt);
            return dt;
        }
    }

    private List<ChalanProcessBO> ExecuteReader(string functionName, Func<NpgsqlDataReader, ChalanProcessBO> readRow, params NpgsqlParameter[] parameters)
    {
        var results = new List<ChalanProcessBO>();
        string sql = $"select * from {functionName}({BuildParameterList(parameters)});";

        using (NpgsqlConnection con = new NpgsqlConnection(_connectionString))
        using (NpgsqlCommand cmd = new NpgsqlCommand(sql, con))
        {
            if (parameters != null) cmd.Parameters.AddRange(parameters);
            con.Open();

            using (NpgsqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    results.Add(readRow(reader));
                }
            }
        }

        return results;
    }

    public void InsertChalanProcess(
        string? chalanDate, string? componentDesc, string? companyCd,
        string? inChalanNo, string? outChalanNo, string? companyName,
        string? vehicleNo, string? vendorVehicleChalanNo,
        string? actualInMaterialQuantity, string? pendingQuantity,
        string? outMaterialQuantity, string? rejectMaterialQuantity,
        string? remarks, int remarkStatusId, string? createdBy, string? updatedBy,
        long sessionId)
    {
        ExecuteNonQuery("sp_insertintochallanprocess",
            new NpgsqlParameter("@ChalanDate", DbValue(chalanDate)),
            new NpgsqlParameter("@Component_Desc", DbValue(componentDesc)),
            new NpgsqlParameter("@Company_Cd", DbValue(companyCd)),
            new NpgsqlParameter("@InChalanNo", DbValue(inChalanNo)),
            new NpgsqlParameter("@OutChalanNo", DbValue(outChalanNo)),
            new NpgsqlParameter("@Company_Name", DbValue(companyName)),
            new NpgsqlParameter("@VehicleNo", DbValue(vehicleNo)),
            new NpgsqlParameter("@Vendor_Vehicle_ChallanNo", DbValue(vendorVehicleChalanNo)),
            new NpgsqlParameter("@Actual_InMaterial_Quantity", DbValue(actualInMaterialQuantity)),
            new NpgsqlParameter("@Pending_Quantity", DbValue(pendingQuantity)),
            new NpgsqlParameter("@OutMaterial_Quantity", DbValue(outMaterialQuantity)),
            new NpgsqlParameter("@RejectMaterial_Quantity", DbValue(rejectMaterialQuantity)),
            new NpgsqlParameter("@Remarks", DbValue(remarks)),
            new NpgsqlParameter("@Remark_StatusID", remarkStatusId),
            new NpgsqlParameter("@CreatedBy", DbValue(createdBy)),
            new NpgsqlParameter("@UpdatedBy", DbValue(updatedBy)),
            new NpgsqlParameter("@SessionID", sessionId)
        );
    }

    public List<ChalanProcessBO> GetAllChalanProcessData(string? chalanProcessHdrseq = null)
    {
        return ExecuteReader("sp_getallchallanprocessdata", reader => new ChalanProcessBO
        {
            Date = reader["f_chalandate"].ToString(),
            ComponentDescription = reader["f_component_desc"].ToString(),
            ChalanNo = reader["f_inchalanno"].ToString(),
            Quantity = reader["f_actual_inmaterial_quantity"].ToString(),
            CompanyName = reader["f_company_name"].ToString(),
            VehicleNumber = reader["f_vehicleno"].ToString(),
            VehicleChalanNumber = reader["f_vendor_vehicle_challanno"].ToString(),
            CompanyCode = reader["f_company_cd"].ToString(),
            ChalanProcessID = reader.GetInt64(reader.GetOrdinal("f_pk_chalan_processid")),
            ChalanProcessHdr = reader["f_pk_chalan_processhdr"].ToString(),
            ChalanProccessHdrSeq = reader["f_chalan_proccess_hdrseq"].ToString(),
            ActualInMaterialQuantity = reader["f_actual_inmaterial_quantity"].ToString(),
            PendingQuantity = reader["f_pending_quantity"].ToString(),
            OutMaterialQuantity = reader["f_outmaterial_quantity"].ToString(),
            RejectMaterialQuantity = reader["f_rejectmaterial_quantity"].ToString(),
            Remarks = reader["f_remarks"].ToString(),
            RemarkStatusID = reader.GetInt32(reader.GetOrdinal("f_remark_statusid"))
        },
        new NpgsqlParameter("@ChalanProcessHdrseq", chalanProcessHdrseq ?? (object)DBNull.Value)
        );
    }

    public List<ChalanProcessBO> GetChalanProcessDataBasedOnComp(string? CompDesc = null)
    {
        return ExecuteReader("sp_getchalanentriesbycomp", reader => new ChalanProcessBO
        {
            Date = reader["f_chalandate"].ToString(),
            ComponentDescription = reader["f_component_desc"].ToString(),
            ChalanNo = reader["f_inchalanno"].ToString(),
            Quantity = reader["f_actual_inmaterial_quantity"].ToString(),
            CompanyName = reader["f_company_name"].ToString(),
            VehicleNumber = reader["f_vehicleno"].ToString(),
            VehicleChalanNumber = reader["f_vendor_vehicle_challanno"].ToString(),
            CompanyCode = reader["f_company_cd"].ToString(),
            ChalanProcessID = reader.GetInt64(reader.GetOrdinal("f_pk_chalan_processid")),
            ChalanProcessHdr = reader["f_pk_chalan_processhdr"].ToString(),
            ChalanProccessHdrSeq = reader["f_chalan_proccess_hdrseq"].ToString(),
            ActualInMaterialQuantity = reader["f_actual_inmaterial_quantity"].ToString(),
            PendingQuantity = reader["f_pending_quantity"].ToString(),
            OutMaterialQuantity = reader["f_outmaterial_quantity"].ToString(),
            RejectMaterialQuantity = reader["f_rejectmaterial_quantity"].ToString(),
            Remarks = reader["f_remarks"].ToString(),
            RemarkStatusID = reader.GetInt32(reader.GetOrdinal("f_remark_statusid"))
        },
        new NpgsqlParameter("@ComponentDesc", CompDesc ?? (object)DBNull.Value)
        );
    }

    public DataTable GetTotalComponentDetails(string? startDate = null, string? endDate = null)
    {
        return ExecuteDataTable("sp_get_total_components_dtls",
            new NpgsqlParameter("@StartDate", DbValue(startDate)),
            new NpgsqlParameter("@EndDate", DbValue(endDate))
        );
    }

    public DataTable GetTotalInComponentDetails(string? startDate = null, string? endDate = null)
    {
        return ExecuteDataTable("sp_get_total_incomponents_dtls",
            new NpgsqlParameter("@StartDate", DbValue(startDate)),
            new NpgsqlParameter("@EndDate", DbValue(endDate))
        );
    }

    public List<ChalanProcessBO> GetAllChalanProcessDetails(string? chalanProcessHdrseq)
    {
        return ExecuteReader("sp_getchalanprocessdtls", reader => new ChalanProcessBO
        {
            f_ChalanProcessDtlSeq = reader["f_chalan_proccess_dtlsseq"].ToString(),
            f_ChalanDtls_Date = reader["f_chalandtls_date"].ToString(),
            f_OutChalanNo = reader["f_outchalanno"].ToString(),
            f_Company_Name = reader["f_company_name"].ToString(),
            f_InChalanNo = reader["f_inchalanno"].ToString(),
            f_Actual_InMaterial_Quantity = reader["f_actual_inmaterial_quantity"].ToString(),
            f_Pending_Quantity = reader["f_pending_quantity"].ToString(),
            f_OutMaterial_Quantity = reader["f_outmaterial_quantity"].ToString(),
            f_RejectMaterial_Quantity = reader["f_rejectmaterial_quantity"].ToString(),
            f_Component_Desc = reader["f_component_desc"].ToString()
        },
        new NpgsqlParameter("@ChalanProcessHdrseq", chalanProcessHdrseq ?? (object)DBNull.Value)
        );
    }

    public bool InsertIntoChalanProcessDtls(string? chalanProcessHdrseq, string? f_ChalanDtls_Date, string? f_OutChalanNo, string? f_Pending_Quantity, string? f_OutMaterial_Quantity, string? f_RejectMaterial_Quantity)
    {
        return ExecuteNonQuery("sp_insertintochalanprocessdtls",
            new NpgsqlParameter("@chalanProcessHdrseq", DbValue(chalanProcessHdrseq)),
            new NpgsqlParameter("@f_ChalanDtls_Date", DbValue(f_ChalanDtls_Date)),
            new NpgsqlParameter("@f_OutChalanNo", DbValue(f_OutChalanNo)),
            new NpgsqlParameter("@f_Pending_Quantity", DbValue(f_Pending_Quantity)),
            new NpgsqlParameter("@f_OutMaterial_Quantity", DbValue(f_OutMaterial_Quantity)),
            new NpgsqlParameter("@f_RejectMaterial_Quantity", DbValue(f_RejectMaterial_Quantity))
        ) > 0;
    }

    public bool DeactivateRecord(string? dtlseq)
    {
        return ExecuteNonQuery("sp_deactivate_records",
            new NpgsqlParameter("@dtlseq", DbValue(dtlseq))
        ) > 0;
    }
}
