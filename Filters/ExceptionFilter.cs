using System.Data.SqlClient;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace JayRaj_Industries.Filters
{
    public class ExceptionFilter : IExceptionFilter
    {
        private readonly ApplicationAuditDAL _applicationAuditDAL;
        private readonly ILogger<ExceptionFilter> _logger;

        public ExceptionFilter(IConfiguration configuration, ILogger<ExceptionFilter> logger)
        {
            _logger = logger;
            var connectionString = configuration.GetConnectionString("Jayraj_Industries")
                ?? throw new InvalidOperationException("Connection string 'Jayraj_Industries' was not found.");
            _applicationAuditDAL = new ApplicationAuditDAL(connectionString);
        }

        public void OnException(ExceptionContext context)
        {
            var ex = context.Exception;
            var controllerName = context.RouteData.Values["controller"]?.ToString() ?? "Unknown";
            var actionName = context.RouteData.Values["action"]?.ToString() ?? "Unknown";

            _applicationAuditDAL.LogException(
                controllerName,
                actionName,
                ex,
                context.HttpContext.Request.Path.Value,
                context.HttpContext.Request.Method,
                null,
                context.HttpContext.User?.Identity?.Name);

            if (ex is SqlException sqlEx && sqlEx.Number == 50000)
            {
                // Custom validation raised by a stored procedure (e.g. duplicate chalan
                // number, older pending orders) — the message is meant for the user.
                _logger.LogWarning(sqlEx, "{Controller}.{Action} rejected by stored-procedure validation.", controllerName, actionName);
                context.Result = new JsonResult(new { success = false, message = sqlEx.Message });
            }
            else
            {
                _logger.LogError(ex, "Unhandled exception in {Controller}.{Action}.", controllerName, actionName);
                context.Result = new JsonResult(new { success = false, message = "Unable to complete the request right now. Please try again." });
            }

            context.ExceptionHandled = true;
        }
    }
}
