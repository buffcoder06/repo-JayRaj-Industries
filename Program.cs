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

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Account/Login";
        options.AccessDeniedPath = "/Account/Login";
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
    });

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
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=ChalanProcess}/{action=Index}/{id?}");

app.Run();
