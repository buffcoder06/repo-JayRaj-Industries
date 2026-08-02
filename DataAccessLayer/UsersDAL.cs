using System;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;
using JayRaj_Industries.Models;

public class UsersDAL
{
    private readonly string _connectionString;

    public UsersDAL(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("Jayraj_Industries")
            ?? throw new InvalidOperationException("Connection string 'Jayraj_Industries' was not found.");
    }

    public async Task<UserRecord?> FindByUsernameAsync(string username)
    {
        using var con = new SqlConnection(_connectionString);
        using var cmd = new SqlCommand(
            "SELECT f_PK_UserID, f_Username, f_PasswordHash, f_DisplayName " +
            "FROM dbo.t_JR_Users WHERE f_Username = @Username AND f_Active = 1",
            con);
        cmd.Parameters.AddWithValue("@Username", username);

        await con.OpenAsync();
        using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return new UserRecord
        {
            UserId = reader.GetInt32(reader.GetOrdinal("f_PK_UserID")),
            Username = reader["f_Username"].ToString() ?? string.Empty,
            PasswordHash = reader["f_PasswordHash"].ToString() ?? string.Empty,
            DisplayName = reader["f_DisplayName"] as string
        };
    }
}
