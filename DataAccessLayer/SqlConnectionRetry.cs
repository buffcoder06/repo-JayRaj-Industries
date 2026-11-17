using System;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

// Opening a connection to Azure SQL can fail for a while for reasons that fix
// themselves — most often the free serverless database waking up after its
// 60-minute auto-pause, which takes ~30-60s and answers "database is not
// currently available" (40613) meanwhile. Retry those instead of failing the
// request; anything else (bad password, missing proc, ...) still fails at once.
public static class SqlConnectionRetry
{
    // Azure SQL transient error numbers (Microsoft's documented retry list).
    private static readonly int[] TransientErrors =
    {
        40613, // database not currently available (resuming from auto-pause)
        40197, // service error processing the request
        40501, // service is busy
        49918, 49919, 49920, // not enough resources / too many operations
        4221,  // login to read-secondary failed during resume
        10928, 10929, // resource limits
        10053, 10054, 10060, // network: connection aborted / reset / timed out
        233, 64, // connection closed / network name no longer available
        -2     // timeout
    };

    // Waits between attempts (2, 4, 6, 8, then every 10s) within an overall
    // budget. A resume of the free database was measured at ~2m15s, so allow
    // 150s — still well inside App Service's ~230s request limit. Some failures
    // (a network black hole) take ~20s per attempt on their own.
    private static readonly TimeSpan[] FirstDelays =
    {
        TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(4), TimeSpan.FromSeconds(6), TimeSpan.FromSeconds(8)
    };
    private static readonly TimeSpan SteadyDelay = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan MaxTotalWait = TimeSpan.FromSeconds(150);

    private static TimeSpan DelayFor(int attempt) =>
        attempt < FirstDelays.Length ? FirstDelays[attempt] : SteadyDelay;

    public static bool IsTransient(SqlException ex)
    {
        foreach (SqlError error in ex.Errors)
        {
            if (Array.IndexOf(TransientErrors, error.Number) >= 0) return true;
        }
        return false;
    }

    private static bool ShouldRetry(SqlException ex, int attempt, Stopwatch elapsed) =>
        IsTransient(ex) && elapsed.Elapsed + DelayFor(attempt) < MaxTotalWait;

    public static async Task OpenWithRetryAsync(this SqlConnection connection, CancellationToken cancellationToken = default)
    {
        var elapsed = Stopwatch.StartNew();
        for (int attempt = 0; ; attempt++)
        {
            try
            {
                await connection.OpenAsync(cancellationToken);
                return;
            }
            catch (SqlException ex) when (ShouldRetry(ex, attempt, elapsed))
            {
                // Don't let a broken pooled connection be handed out again.
                SqlConnection.ClearPool(connection);
                await Task.Delay(DelayFor(attempt), cancellationToken);
            }
        }
    }

    public static void OpenWithRetry(this SqlConnection connection)
    {
        var elapsed = Stopwatch.StartNew();
        for (int attempt = 0; ; attempt++)
        {
            try
            {
                connection.Open();
                return;
            }
            catch (SqlException ex) when (ShouldRetry(ex, attempt, elapsed))
            {
                SqlConnection.ClearPool(connection);
                Thread.Sleep(DelayFor(attempt));
            }
        }
    }
}
