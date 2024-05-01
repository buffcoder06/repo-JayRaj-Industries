using System;
using System.Data;
using System.Data.SqlClient;
using System.Linq.Expressions;

public class ChalanProcessDAL
{
    private readonly string _connectionString;

    public ChalanProcessDAL(string connectionString)
    {
        _connectionString = connectionString;
    }

    public void InsertChalanProcess(
        string chalanDate, string componentDesc, string companyCd,
        string inChalanNo, string outChalanNo, string companyName,
        string vehicleNo, string vendorVehicleChalanNo,
        string actualInMaterialQuantity, string pendingQuantity,
        string outMaterialQuantity, string rejectMaterialQuantity,
        string remarks, int remarkStatusId, string createdBy, string updatedBy,
        long sessionId)
    {
        using (SqlConnection con = new SqlConnection(_connectionString))
        {
            using (SqlCommand cmd = new SqlCommand("sp_InsertIntoChallanProcess", con))
            {
                cmd.CommandType = CommandType.StoredProcedure;

                // Add parameters
                cmd.Parameters.AddWithValue("@ChalanDate", chalanDate);
                cmd.Parameters.AddWithValue("@Component_Desc", componentDesc);
                cmd.Parameters.AddWithValue("@Company_Cd", companyCd);
                cmd.Parameters.AddWithValue("@InChalanNo", inChalanNo);
                cmd.Parameters.AddWithValue("@OutChalanNo", outChalanNo);
                cmd.Parameters.AddWithValue("@Company_Name", companyName);
                cmd.Parameters.AddWithValue("@VehicleNo", vehicleNo);
                cmd.Parameters.AddWithValue("@Vendor_Vehicle_ChallanNo", vendorVehicleChalanNo);
                cmd.Parameters.AddWithValue("@Actual_InMaterial_Quantity", actualInMaterialQuantity);
                cmd.Parameters.AddWithValue("@Pending_Quantity", pendingQuantity);
                cmd.Parameters.AddWithValue("@OutMaterial_Quantity", outMaterialQuantity);
                cmd.Parameters.AddWithValue("@RejectMaterial_Quantity", rejectMaterialQuantity);
                cmd.Parameters.AddWithValue("@Remarks", remarks);
                cmd.Parameters.AddWithValue("@Remark_StatusID", remarkStatusId);
                cmd.Parameters.AddWithValue("@CreatedBy", createdBy);
                cmd.Parameters.AddWithValue("@UpdatedBy", updatedBy);
                cmd.Parameters.AddWithValue("@SessionID", sessionId);

                con.Open();
                cmd.ExecuteNonQuery();
            }
        }
    }

    public List<ChalanProcessBO> GetAllChalanProcessData(string chalanProcessHdrseq)
    {
        List<ChalanProcessBO> resultList = new List<ChalanProcessBO>();

        using (SqlConnection con = new SqlConnection(_connectionString))
        {
            using (SqlCommand cmd = new SqlCommand("sp_GetAllChallanProcessData", con))
            {
                cmd.CommandType = CommandType.StoredProcedure;

                // Add the parameter to the command if provided
                if (chalanProcessHdrseq != null)
                {
                    cmd.Parameters.Add(new SqlParameter("@ChalanProcessHdrseq", chalanProcessHdrseq));
                }

                con.Open();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        ChalanProcessBO item = new ChalanProcessBO
                        {
                            Date = reader["f_ChalanDate"].ToString(), // Replace with actual column name
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
                        };

                        resultList.Add(item);
                    }
                }
            }
        }
        return resultList;
    }

    public DataTable GetTotalComponentDetails()
    {
        DataTable dataTable = new DataTable();

        using (SqlConnection connection = new SqlConnection(_connectionString))
        {
            using (SqlCommand command = new SqlCommand("sp_Get_Total_Components_Dtls", connection))
            {
                command.CommandType = CommandType.StoredProcedure;

                try
                {
                    connection.Open();
                    using (SqlDataAdapter adapter = new SqlDataAdapter(command))
                    {
                        adapter.Fill(dataTable);
                    }
                }
                catch (SqlException ex)
                {
                    // Handle SQL exceptions
                    Console.WriteLine("SQL Error: " + ex.Message);
                }
                catch (Exception ex)
                {
                    // Handle other exceptions
                    Console.WriteLine("Error: " + ex.Message);
                }
            }
        }

        return dataTable;
    }

    public DataTable GetTotalComponentDetails(string startDate = null, string endDate = null)
    {
        DataTable dataTable = new DataTable();

        using (SqlConnection connection = new SqlConnection(_connectionString))
        {
            using (SqlCommand command = new SqlCommand("sp_Get_Total_Components_Dtls", connection))
            {
                command.CommandType = CommandType.StoredProcedure;
                // Add parameters with checks for null or empty strings
                command.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(startDate) ? DBNull.Value : (object)startDate);
                command.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(endDate) ? DBNull.Value : (object)endDate);

                try
                {
                    connection.Open();
                    using (SqlDataAdapter adapter = new SqlDataAdapter(command))
                    {
                        adapter.Fill(dataTable);
                    }
                }
                catch (SqlException ex)
                {
                    // Handle SQL exceptions
                    Console.WriteLine("SQL Error: " + ex.Message);
                }
                catch (Exception ex)
                {
                    // Handle other exceptions
                    Console.WriteLine("Error: " + ex.Message);
                }
            }
        }

        return dataTable;
    }



    public List<ChalanProcessBO> GetAllChalanProcessDetails(string chalanProcessHdrseq)
    {
        List<ChalanProcessBO> resultList = new List<ChalanProcessBO>();

        using (SqlConnection con = new SqlConnection(_connectionString))
        {
            using (SqlCommand cmd = new SqlCommand("sp_GetChalanProcessDtls", con))
            {
                cmd.CommandType = CommandType.StoredProcedure;

                // Add the parameter to the command if provided
                if (chalanProcessHdrseq != null)
                {
                    cmd.Parameters.Add(new SqlParameter("@ChalanProcessHdrseq", chalanProcessHdrseq));
                }

                con.Open();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        ChalanProcessBO item = new ChalanProcessBO
                        {
                            f_ChalanDtls_Date = reader["f_ChalanDtls_Date"].ToString(), // Replace with actual column name
                            f_OutChalanNo = reader["f_OutChalanNo"].ToString(),
                            f_Company_Name = reader["f_Company_Name"].ToString(),
                            f_InChalanNo = reader["f_InChalanNo"].ToString(),
                            f_Actual_InMaterial_Quantity = reader["f_Actual_InMaterial_Quantity"].ToString(),
                            f_Pending_Quantity = reader["f_Pending_Quantity"].ToString(),
                            f_OutMaterial_Quantity = reader["f_OutMaterial_Quantity"].ToString(),
                            f_RejectMaterial_Quantity = reader["f_RejectMaterial_Quantity"].ToString(),
                            f_Component_Desc = reader["f_Component_Desc"].ToString()
                        };

                        resultList.Add(item);
                    }
                }
            }
        }
        return resultList;
    }
    public bool InsertIntoChalanProcessDtls(string chalanProcessHdrseq, string f_ChalanDtls_Date, string f_OutChalanNo, string f_Pending_Quantity, string f_OutMaterial_Quantity, string f_RejectMaterial_Quantity)
    {
        try
        {

            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                SqlCommand command = new SqlCommand("sp_InsertIntoChalanProcessDtls", connection);
                command.CommandType = CommandType.StoredProcedure;

                command.Parameters.AddWithValue("@chalanProcessHdrseq", chalanProcessHdrseq);
                command.Parameters.AddWithValue("@f_ChalanDtls_Date", f_ChalanDtls_Date);
                command.Parameters.AddWithValue("@f_OutChalanNo", f_OutChalanNo);
                command.Parameters.AddWithValue("@f_Pending_Quantity", f_Pending_Quantity);
                command.Parameters.AddWithValue("@f_OutMaterial_Quantity", f_OutMaterial_Quantity);
                command.Parameters.AddWithValue("@f_RejectMaterial_Quantity", f_RejectMaterial_Quantity);

                connection.Open();
                command.ExecuteNonQuery();
            }

            return true;
        }
        catch (Exception ex)
        {
            throw ex;
        }

    }



}


