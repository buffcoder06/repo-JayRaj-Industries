using JayRaj_Industries.Filters;
using JayRaj_Industries.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews(options =>
{
    options.Filters.Add<ExceptionFilter>();
});

builder.Services.Configure<InvoicePricingOptions>(builder.Configuration.GetSection("InvoicePricing"));

builder.Services.AddScoped<ChalanProcessDAL>();
builder.Services.AddScoped<ApplicationAuditDAL>();
builder.Services.AddScoped<UsersDAL>();

// 15-minute idle timeout, 12-hour absolute limit, hardened cookie — see SessionPolicy.
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options => SessionPolicy.Configure(options, builder.Environment.IsDevelopment(), builder.Configuration));

// Require auth everywhere by default; only [AllowAnonymous] actions
// (the login page and the global error page) opt out.
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build());

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
});

builder.Services.AddLoginRateLimit();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}


// Left commented out: this deployment currently serves plain HTTP (no TLS
// cert / reverse proxy in front of it yet). Enabling this without one would
// redirect every request to an HTTPS endpoint that doesn't exist and break
// access. Turn this on once a certificate/reverse proxy is in place.
//app.UseHttpsRedirection();

// Baseline security headers on every response.
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers.XContentTypeOptions = "nosniff";
    headers.XFrameOptions = "DENY";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    await next();
});

app.UseStaticFiles();

// Pages and data (everything that isn't a static file) must never be cached,
// so the back button can't show business data after sign-out or time-out.
app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        context.Response.Headers.CacheControl = "no-store, no-cache";
        context.Response.Headers.Pragma = "no-cache";
        return Task.CompletedTask;
    });
    await next();
});

app.UseRouting();
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=ChalanProcess}/{action=Index}/{id?}");

app.Run();
