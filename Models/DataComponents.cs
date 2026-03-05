using System.Data;
using System.Linq;
using Npgsql;

namespace JayRaj_Industries.Models
{
    public class DataComponents
    {
        private readonly string _connectionString;

        public DataComponents(IConfiguration configuration)
        {
            _connectionString = configuration["ConnectionStrings:Jayraj_Industries"].ToString();
        }

        private static string BuildParameterList(NpgsqlParameter[] parameters)
        {
            if (parameters == null || parameters.Length == 0)
            {
                return string.Empty;
            }

            return string.Join(", ", parameters.Select(p => p.ParameterName));
        }

        private void ExecuteNonQuery(string functionName, params NpgsqlParameter[] parameters)
        {
            using (NpgsqlConnection con = new NpgsqlConnection(_connectionString))
            using (NpgsqlCommand cmd = new NpgsqlCommand($"select {functionName}({BuildParameterList(parameters)});", con))
            {
                if (parameters != null) cmd.Parameters.AddRange(parameters);
                con.Open();
                cmd.ExecuteScalar();
            }
        }

        private DataTable ExecuteDataTable(string functionName, params NpgsqlParameter[] parameters)
        {
            using (NpgsqlConnection con = new NpgsqlConnection(_connectionString))
            using (NpgsqlCommand cmd = new NpgsqlCommand($"select * from {functionName}({BuildParameterList(parameters)});", con))
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

            using (NpgsqlConnection con = new NpgsqlConnection(_connectionString))
            using (NpgsqlCommand cmd = new NpgsqlCommand($"select * from {functionName}({BuildParameterList(parameters)});", con))
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
    }
}
