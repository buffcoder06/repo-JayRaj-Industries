using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace JayRaj_Industries.Filters
{
    // Throttles sign-in attempts per client IP so the public login page
    // can't be used to guess passwords at speed.
    public static class LoginRateLimit
    {
        public const string PolicyName = "login";

        private const int AttemptsPerWindow = 8;
        private static readonly TimeSpan Window = TimeSpan.FromMinutes(5);

        public static IServiceCollection AddLoginRateLimit(this IServiceCollection services)
        {
            return services.AddRateLimiter(options =>
            {
                options.AddPolicy(PolicyName, httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = AttemptsPerWindow,
                            Window = Window,
                            QueueLimit = 0
                        }));

                // Send the user back to the login page with a friendly message
                // instead of a bare 503.
                options.OnRejected = (context, _) =>
                {
                    context.HttpContext.Response.Redirect("/Account/Login?throttled=true");
                    return ValueTask.CompletedTask;
                };
            });
        }
    }
}
