using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace JayRaj_Industries.Filters
{
    // Session rules for the auth cookie:
    //  - signed out after IdleTimeout with no activity (exact, see OnValidatePrincipal);
    //  - signed out after AbsoluteTimeout regardless of activity;
    //  - background (AJAX) requests get 401 instead of a redirect to the login
    //    page, so the browser can send the user to sign in instead of failing silently.
    public static class SessionPolicy
    {
        // 15 minutes unless config "Session:IdleTimeoutSeconds" says otherwise
        // (only used to shorten it for testing; production doesn't set it).
        public static TimeSpan IdleTimeout { get; private set; } = TimeSpan.FromMinutes(15);
        public static readonly TimeSpan AbsoluteTimeout = TimeSpan.FromHours(12);

        public const string CookieName = "jr.auth";
        private const string SessionStartedKey = "jr.sessionStarted";

        public static AuthenticationProperties NewSessionProperties() => new()
        {
            IsPersistent = false,
            Items = { [SessionStartedKey] = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString() }
        };

        public static void Configure(CookieAuthenticationOptions options, bool isDevelopment, IConfiguration configuration)
        {
            if (int.TryParse(configuration["Session:IdleTimeoutSeconds"], out var idleSeconds) && idleSeconds >= 60)
            {
                IdleTimeout = TimeSpan.FromSeconds(idleSeconds);
            }

            options.LoginPath = "/Account/Login";
            options.AccessDeniedPath = "/Account/Login";
            options.ExpireTimeSpan = IdleTimeout;
            options.SlidingExpiration = true;

            options.Cookie.Name = CookieName;
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            // Local dev runs over plain http; everywhere else the cookie is HTTPS-only.
            options.Cookie.SecurePolicy = isDevelopment ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;

            options.Events = new CookieAuthenticationEvents
            {
                OnValidatePrincipal = async context =>
                {
                    var props = context.Properties;
                    if (!props.Items.TryGetValue(SessionStartedKey, out var started)
                        || !long.TryParse(started, out var startedUnix)
                        || DateTimeOffset.UtcNow - DateTimeOffset.FromUnixTimeSeconds(startedUnix) > AbsoluteTimeout)
                    {
                        context.RejectPrincipal();
                        await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                        return;
                    }

                    // Built-in sliding expiration only renews once half the window
                    // has passed, which would make the real idle limit anywhere from
                    // 7.5 to 15 minutes. Renewing on every request makes it exactly 15.
                    context.ShouldRenew = true;
                },
                OnRedirectToLogin = context =>
                {
                    if (IsAjax(context.Request))
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        return Task.CompletedTask;
                    }
                    context.Response.Redirect(context.RedirectUri);
                    return Task.CompletedTask;
                }
            };
        }

        private static bool IsAjax(HttpRequest request) =>
            string.Equals(request.Headers.XRequestedWith, "XMLHttpRequest", StringComparison.OrdinalIgnoreCase)
            || request.Headers.Accept.ToString().Contains("application/json", StringComparison.OrdinalIgnoreCase);
    }
}
