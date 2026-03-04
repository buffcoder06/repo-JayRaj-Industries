using System.Data;
using JayRaj_Industries.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace JayRaj_Industries.Controllers
{
    public class InvoiceController : Controller
    {
        private readonly ChalanProcessDAL _chalanProcessDAL;
        private readonly ApplicationAuditDAL _applicationAuditDAL;
        private readonly ILogger<InvoiceController> _logger;
        private static readonly HashSet<string> KundalikAutomationAllowedComponents = new(StringComparer.OrdinalIgnoreCase)
        {
            "JCASEDIFFERENTIAL40112573DOSTDIFFCASE",
            "JPDIFFCASE11204001619PDNS3404145012",
            "JDIFFCASEELDSFM180FLANGEHALF10019886",
            "JDIFFCASES20DC103",
            "JDIFFCASES20DC104",
            "JDIFFCASE32931",
            "JP375REARDIFFCASE10043997",
            "JP375REARDIFFCASE10043998"
        };

        public InvoiceController(IConfiguration configuration, ILogger<InvoiceController> logger)
        {
            _logger = logger;
            var connectionString = configuration.GetConnectionString("Jayraj_Industries")
                ?? throw new InvalidOperationException("Connection string 'Jayraj_Industries' was not found.");
            _chalanProcessDAL = new ChalanProcessDAL(connectionString);
            _applicationAuditDAL = new ApplicationAuditDAL(connectionString);
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public IActionResult GetInvoiceLineItems(string startDate, string endDate, string? invoiceProfile = null)
        {
            if (string.IsNullOrWhiteSpace(startDate) || string.IsNullOrWhiteSpace(endDate))
            {
                return Json(new { success = false, message = "Start date and end date are required." });
            }

            try
            {
                var dt = _chalanProcessDAL.GetTotalComponentDetails(startDate, endDate);
                var rows = new List<InvoiceLineItem>();
                var srNo = 1;

                foreach (DataRow row in dt.Rows)
                {
                    var description = row["f_Component_Desc"]?.ToString() ?? string.Empty;
                    description = NormalizeDisplayComponent(description);
                    if (string.Equals(invoiceProfile, "kundalik_automation", StringComparison.OrdinalIgnoreCase) &&
                        !IsKundalikAutomationComponent(description))
                    {
                        continue;
                    }

                    if (string.Equals(invoiceProfile, "kundalik_engineers", StringComparison.OrdinalIgnoreCase) &&
                        !IsKundalikEngineersComponent(description))
                    {
                        continue;
                    }

                    var qty = TryToDecimal(row, "MaterialOutQuantity");

                    rows.Add(new InvoiceLineItem
                    {
                        SrNo = srNo++,
                        ItemDescription = description,
                        Qty = qty,
                        Unit = "-",
                        Rate = GetDefaultRate(description)
                    });
                }

                return Json(new { success = true, items = rows });
            }
            catch (Exception ex)
            {
                LogExceptionToDatabase(nameof(GetInvoiceLineItems), ex, $"startDate={startDate};endDate={endDate};invoiceProfile={invoiceProfile}");
                _logger.LogError(ex, "Failed to load invoice line items. startDate={StartDate}, endDate={EndDate}, profile={InvoiceProfile}", startDate, endDate, invoiceProfile);
                return Json(new { success = false, message = "Unable to load invoice data right now." });
            }
        }

        [HttpPost]
        public IActionResult LogInvoiceDownload([FromBody] InvoiceDownloadLogRequest request)
        {
            try
            {
                if (request == null)
                {
                    return Json(new { success = false, message = "Invalid payload." });
                }

                _applicationAuditDAL.LogInvoiceData(
                    request.StartDate,
                    request.EndDate,
                    request.InvoiceProfile,
                    request.InvoiceNo,
                    request.InvoiceDate,
                    User?.Identity?.Name ?? "system",
                    nameof(InvoiceController),
                    nameof(LogInvoiceDownload),
                    request.AssessableValue,
                    request.CgstAmount,
                    request.SgstAmount,
                    request.GstAmount,
                    request.GrandTotal,
                    request.Items ?? new List<InvoiceLineItem>());

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                LogExceptionToDatabase(nameof(LogInvoiceDownload), ex);
                _logger.LogError(ex, "Failed to log invoice download.");
                return Json(new { success = false, message = "Unable to log invoice download right now." });
            }
        }

        private void LogExceptionToDatabase(string actionName, Exception ex, string? payload = null)
        {
            _applicationAuditDAL.LogException(
                nameof(InvoiceController),
                actionName,
                ex,
                HttpContext?.Request?.Path.Value,
                HttpContext?.Request?.Method,
                payload,
                User?.Identity?.Name);
        }

        private static bool IsKundalikEngineersComponent(string description)
        {
            if (string.IsNullOrWhiteSpace(description))
            {
                return false;
            }

            var normalized = NormalizeComponent(description);
            return normalized.Contains("JLWDREF") || normalized.Contains("JLWD");
        }

        private static bool IsKundalikAutomationComponent(string description)
        {
            if (string.IsNullOrWhiteSpace(description))
            {
                return false;
            }

            var normalized = NormalizeComponent(description);
            return KundalikAutomationAllowedComponents.Any(allowed => normalized.Contains(allowed));
        }

        private static string NormalizeComponent(string value)
        {
            return new string(value
                .ToUpperInvariant()
                .Where(char.IsLetterOrDigit)
                .ToArray());
        }

        private static decimal TryToDecimal(DataRow row, string colName)
        {
            if (!row.Table.Columns.Contains(colName))
            {
                return 0m;
            }

            var raw = row[colName]?.ToString();
            return decimal.TryParse(raw, out var result) ? result : 0m;
        }

        private static decimal GetDefaultRate(string itemDescription)
        {
            var rates = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase)
            {
                ["JLWDREARDIFFCASE10013474030"] = 8.00m,
                ["JCASEDIFFERENTIAL40112573"] = 7.00m,
                ["JPDIFFCASE11204001619PDNS3404145012"] = 1.00m,
                ["JDIFFCASEELDSFM180FLANGEHALF10019886"] = 5.00m,
                ["JDIFFCASES20DC103"] = 6.00m,
                ["JDIFFCASES20DC104"] = 6.00m,
                ["JDIFFCASE32931"] = 6.00m,
                ["JP375REARDIFFCASE10043997"] = 9.00m,
                ["JP375REARDIFFCASE10043998"] = 9.00m
            };

            var normalized = NormalizeComponent(itemDescription);
            foreach (var kv in rates)
            {
                if (normalized.Contains(kv.Key))
                {
                    return kv.Value;
                }
            }

            return 0m;
        }

        private static string NormalizeDisplayComponent(string itemDescription)
        {
            if (string.IsNullOrWhiteSpace(itemDescription))
            {
                return itemDescription;
            }

            return itemDescription.Replace("10043998", "10043997", StringComparison.OrdinalIgnoreCase);
        }
    }
}
