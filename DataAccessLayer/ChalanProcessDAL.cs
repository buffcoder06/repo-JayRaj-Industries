using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;

public class ChalanProcessDAL
{
    private readonly string _connectionString;

    public ChalanProcessDAL(string connectionString)
    {
        _connectionString = connectionString;
    }

    private int ExecuteNonQuery(string storedProcedure, params SqlParameter[] parameters)
    {
        using (SqlConnection con = new SqlConnection(_connectionString))
        using (SqlCommand cmd = new SqlCommand(storedProcedure, con))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            if (parameters != null) cmd.Parameters.AddRange(parameters);
            con.Open();
            return cmd.ExecuteNonQuery();
        }
    }

    private static object DbValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? DBNull.Value : value;
    }

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

    private List<ChalanProcessBO> ExecuteReader(string storedProcedure, Func<SqlDataReader, ChalanProcessBO> readRow, params SqlParameter[] parameters)
    {
        var results = new List<ChalanProcessBO>();

        using (SqlConnection con = new SqlConnection(_connectionString))
        using (SqlCommand cmd = new SqlCommand(storedProcedure, con))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            if (parameters != null) cmd.Parameters.AddRange(parameters);
            con.Open();

            using (SqlDataReader reader = cmd.ExecuteReader())
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
        ExecuteNonQuery("sp_InsertIntoChallanProcess",
            new SqlParameter("@ChalanDate", DbValue(chalanDate)),
            new SqlParameter("@Component_Desc", DbValue(componentDesc)),
            new SqlParameter("@Company_Cd", DbValue(companyCd)),
            new SqlParameter("@InChalanNo", DbValue(inChalanNo)),
            new SqlParameter("@OutChalanNo", DbValue(outChalanNo)),
            new SqlParameter("@Company_Name", DbValue(companyName)),
            new SqlParameter("@VehicleNo", DbValue(vehicleNo)),
            new SqlParameter("@Vendor_Vehicle_ChallanNo", DbValue(vendorVehicleChalanNo)),
            new SqlParameter("@Actual_InMaterial_Quantity", DbValue(actualInMaterialQuantity)),
            new SqlParameter("@Pending_Quantity", DbValue(pendingQuantity)),
            new SqlParameter("@OutMaterial_Quantity", DbValue(outMaterialQuantity)),
            new SqlParameter("@RejectMaterial_Quantity", DbValue(rejectMaterialQuantity)),
            new SqlParameter("@Remarks", DbValue(remarks)),
            new SqlParameter("@Remark_StatusID", remarkStatusId),
            new SqlParameter("@CreatedBy", DbValue(createdBy)),
            new SqlParameter("@UpdatedBy", DbValue(updatedBy)),
            new SqlParameter("@SessionID", sessionId)
        );
    }

    public List<ChalanProcessBO> GetAllChalanProcessData(string? chalanProcessHdrseq = null)
    {
        return ExecuteReader("sp_GetAllChallanProcessData", reader => new ChalanProcessBO
        {
            Date = reader["f_ChalanDate"].ToString(),
            ComponentDescription = reader["f_Component_Desc"].ToString(),
            ChalanNo = reader["f_InChalanNo"].ToString(),
            Quantity = reader["f_Actual_InMaterial_Quantity"].ToString(),
            CompanyName = reader["f_Company_Name"].ToString(),
            VehicleNumber = reader["f_VehicleNo"].ToString(),
            VehicleChalanNumber = reader["f_Vendor_Vehicle_ChallanNo"].ToString(),
            CompanyCode = reader["f_Company_Cd"].ToString(),
            ChalanProcessID = reader.GetInt64(reader.GetOrdinal("f_PK_Chalan_ProcessID")),
            ChalanProcessHdr = reader["f_PK_Chalan_ProcessHdr"].ToString(),
            ChalanProccessHdrSeq = reader["f_Chalan_Proccess_HdrSeq"].ToString(),
            ActualInMaterialQuantity = reader["f_Actual_InMaterial_Quantity"].ToString(),
            PendingQuantity = reader["f_Pending_Quantity"].ToString(),
            OutMaterialQuantity = reader["f_OutMaterial_Quantity"].ToString(),
            RejectMaterialQuantity = reader["f_RejectMaterial_Quantity"].ToString(),
            Remarks = reader["f_Remarks"].ToString(),
            RemarkStatusID = reader.GetInt32(reader.GetOrdinal("f_Remark_StatusID"))
        },
        new SqlParameter("@ChalanProcessHdrseq", chalanProcessHdrseq ?? (object)DBNull.Value)
        );
    }

    public List<ChalanProcessBO> GetChalanProcessDataBasedOnComp(string? CompDesc = null)
    {
        return ExecuteReader("sp_GetChalanEntriesByComp", reader => new ChalanProcessBO
        {
            Date = reader["f_ChalanDate"].ToString(),
            ComponentDescription = reader["f_Component_Desc"].ToString(),
            ChalanNo = reader["f_InChalanNo"].ToString(),
            Quantity = reader["f_Actual_InMaterial_Quantity"].ToString(),
            CompanyName = reader["f_Company_Name"].ToString(),
            VehicleNumber = reader["f_VehicleNo"].ToString(),
            VehicleChalanNumber = reader["f_Vendor_Vehicle_ChallanNo"].ToString(),
            CompanyCode = reader["f_Company_Cd"].ToString(),
            ChalanProcessID = reader.GetInt64(reader.GetOrdinal("f_PK_Chalan_ProcessID")),
            ChalanProcessHdr = reader["f_PK_Chalan_ProcessHdr"].ToString(),
            ChalanProccessHdrSeq = reader["f_Chalan_Proccess_HdrSeq"].ToString(),
            ActualInMaterialQuantity = reader["f_Actual_InMaterial_Quantity"].ToString(),
            PendingQuantity = reader["f_Pending_Quantity"].ToString(),
            OutMaterialQuantity = reader["f_OutMaterial_Quantity"].ToString(),
            RejectMaterialQuantity = reader["f_RejectMaterial_Quantity"].ToString(),
            Remarks = reader["f_Remarks"].ToString(),
            RemarkStatusID = reader.GetInt32(reader.GetOrdinal("f_Remark_StatusID"))
        },
        new SqlParameter("@ComponentDesc", CompDesc ?? (object)DBNull.Value)
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

    public List<ChalanProcessBO> GetAllChalanProcessDetails(string? chalanProcessHdrseq)
    {
        return ExecuteReader("sp_GetChalanProcessDtls", reader => new ChalanProcessBO
        {
            f_ChalanProcessDtlSeq = reader["f_Chalan_Proccess_DtlsSeq"].ToString(),
            f_ChalanDtls_Date = reader["f_ChalanDtls_Date"].ToString(),
            f_OutChalanNo = reader["f_OutChalanNo"].ToString(),
            f_Company_Name = reader["f_Company_Name"].ToString(),
            f_InChalanNo = reader["f_InChalanNo"].ToString(),
            f_Actual_InMaterial_Quantity = reader["f_Actual_InMaterial_Quantity"].ToString(),
            f_Pending_Quantity = reader["f_Pending_Quantity"].ToString(),
            f_OutMaterial_Quantity = reader["f_OutMaterial_Quantity"].ToString(),
            f_RejectMaterial_Quantity = reader["f_RejectMaterial_Quantity"].ToString(),
            f_Component_Desc = reader["f_Component_Desc"].ToString()
        },
        new SqlParameter("@ChalanProcessHdrseq", chalanProcessHdrseq ?? (object)DBNull.Value)
        );
    }

    public bool InsertIntoChalanProcessDtls(string? chalanProcessHdrseq, string? f_ChalanDtls_Date, string? f_OutChalanNo, string? f_Pending_Quantity, string? f_OutMaterial_Quantity, string? f_RejectMaterial_Quantity)
    {
        return ExecuteNonQuery("sp_InsertIntoChalanProcessDtls",
            new SqlParameter("@chalanProcessHdrseq", DbValue(chalanProcessHdrseq)),
            new SqlParameter("@f_ChalanDtls_Date", DbValue(f_ChalanDtls_Date)),
            new SqlParameter("@f_OutChalanNo", DbValue(f_OutChalanNo)),
            new SqlParameter("@f_Pending_Quantity", DbValue(f_Pending_Quantity)),
            new SqlParameter("@f_OutMaterial_Quantity", DbValue(f_OutMaterial_Quantity)),
            new SqlParameter("@f_RejectMaterial_Quantity", DbValue(f_RejectMaterial_Quantity))
        ) > 0;
    }

    public bool DeactivateRecord(string? dtlseq)
    {
        return ExecuteNonQuery("sp_Deactivate_Records",
            new SqlParameter("@dtlseq", DbValue(dtlseq))
        ) > 0;
    }

}
