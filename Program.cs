using JayRaj_Industries.Filters;
using JayRaj_Industries.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews(options =>
{
    options.Filters.Add<ExceptionFilter>();
});

builder.Services.Configure<InvoicePricingOptions>(builder.Configuration.GetSection("InvoicePricing"));

builder.Services.AddScoped<ChalanProcessDAL>();
builder.Services.AddScoped<ApplicationAuditDAL>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}


//app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=ChalanProcess}/{action=Index}/{id?}");

app.Run();
