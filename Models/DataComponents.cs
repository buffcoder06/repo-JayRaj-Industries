using System.Data.SqlClient;
using System.Data;

namespace JayRaj_Industries.Models
{
    public class DataComponents
    {
        private readonly string _connectionString;


        public DataComponents(IConfiguration configuration)
        {

            // Initialize the DAL with the connection string
            _connectionString = configuration["ConnectionStrings:Jayraj_Industries"]
                ?? throw new InvalidOperationException("Connection string 'Jayraj_Industries' not found in configuration.");

        }
            private void ExecuteNonQuery(string storedProcedure, params SqlParameter[] parameters)
        {
            using (SqlConnection con = new SqlConnection(_connectionString))
            using (SqlCommand cmd = new SqlCommand(storedProcedure, con))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                if (parameters != null) cmd.Parameters.AddRange(parameters);
                con.Open();
                cmd.ExecuteNonQuery();
            }
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
    }
}
