using System.Data.SqlClient;
using System.Threading.Tasks;
using JayRaj_Industries.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace JayRaj_Industries.Filters
{
    public class ExceptionFilter : IAsyncExceptionFilter
    {
        private const string GenericMessage = "Unable to complete the request right now. Please try again.";
        private const string WakingUpMessage = "The system is starting up after being idle. Please wait a few seconds and try again.";

        private readonly ApplicationAuditDAL _applicationAuditDAL;
        private readonly ILogger<ExceptionFilter> _logger;
        private readonly IModelMetadataProvider _metadataProvider;

        public ExceptionFilter(ApplicationAuditDAL applicationAuditDAL, ILogger<ExceptionFilter> logger, IModelMetadataProvider metadataProvider)
        {
            _applicationAuditDAL = applicationAuditDAL;
            _logger = logger;
            _metadataProvider = metadataProvider;
        }

        public async Task OnExceptionAsync(ExceptionContext context)
        {
            var ex = context.Exception;
            var request = context.HttpContext.Request;
            var controllerName = context.RouteData.Values["controller"]?.ToString() ?? "Unknown";
            var actionName = context.RouteData.Values["action"]?.ToString() ?? "Unknown";

            await _applicationAuditDAL.LogExceptionAsync(
                controllerName,
                actionName,
                ex,
                request.Path.Value,
                request.Method,
                null,
                context.HttpContext.User?.Identity?.Name);

            string message;
            if (ex is SqlException sqlEx && sqlEx.Number == 50000)
            {
                // Custom validation raised by a stored procedure (e.g. duplicate chalan
                // number, older pending orders) — the message is meant for the user.
                _logger.LogWarning(sqlEx, "{Controller}.{Action} rejected by stored-procedure validation.", controllerName, actionName);
                message = sqlEx.Message;
            }
            else
            {
                _logger.LogError(ex, "Unhandled exception in {Controller}.{Action}.", controllerName, actionName);
                // Still unavailable after the connection retries (e.g. an unusually slow resume).
                message = ex is SqlException transient && SqlConnectionRetry.IsTransient(transient) ? WakingUpMessage : GenericMessage;
            }

            if (IsAjax(request))
            {
                context.Result = new JsonResult(new { success = false, message });
            }
            else if (controllerName == "Account" && actionName == "Login")
            {
                // A normal form post: show the sign-in page again with the message,
                // not raw JSON in the browser.
                var model = new LoginRequest { Username = request.HasFormContentType ? request.Form["Username"].ToString() : string.Empty };
                var modelState = new ModelStateDictionary();
                modelState.AddModelError(string.Empty, message);
                context.Result = new ViewResult
                {
                    ViewName = "~/Views/Account/Login.cshtml",
                    ViewData = new ViewDataDictionary<LoginRequest>(_metadataProvider, modelState)
                    {
                        Model = model,
                        ["ReturnUrl"] = request.Query["returnUrl"].ToString()
                    }
                };
            }
            else
            {
                context.Result = new RedirectToActionResult("Error", "Home", null);
            }

            context.ExceptionHandled = true;
        }

        private static bool IsAjax(HttpRequest request) =>
            string.Equals(request.Headers.XRequestedWith, "XMLHttpRequest", StringComparison.OrdinalIgnoreCase)
            || request.Headers.Accept.ToString().Contains("application/json", StringComparison.OrdinalIgnoreCase)
            || (request.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) ?? false);
    }
}
