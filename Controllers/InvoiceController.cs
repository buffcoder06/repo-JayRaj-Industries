using System.Data;
using JayRaj_Industries.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JayRaj_Industries.Controllers
{
    public class InvoiceController : Controller
    {
        private readonly ChalanProcessDAL _chalanProcessDAL;
        private readonly ApplicationAuditDAL _applicationAuditDAL;
        private readonly InvoicePricingOptions _pricing;
        private readonly HashSet<string> _kundalikAutomationAllowedComponents;
        private readonly HashSet<string> _kundalikEngineersAllowedComponents;

        public InvoiceController(IConfiguration configuration, IOptions<InvoicePricingOptions> pricingOptions)
        {
            var connectionString = configuration.GetConnectionString("Jayraj_Industries")
                ?? throw new InvalidOperationException("Connection string 'Jayraj_Industries' was not found.");
            _chalanProcessDAL = new ChalanProcessDAL(connectionString);
            _applicationAuditDAL = new ApplicationAuditDAL(connectionString);

            _pricing = pricingOptions.Value;
            _kundalikAutomationAllowedComponents = new HashSet<string>(_pricing.KundalikAutomationAllowedComponents, StringComparer.OrdinalIgnoreCase);
            _kundalikEngineersAllowedComponents = new HashSet<string>(_pricing.KundalikEngineersAllowedComponents, StringComparer.OrdinalIgnoreCase);
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
                    Unit = "Nos",
                    Rate = GetDefaultRate(description)
                });
            }

            return Json(new { success = true, items = rows });
        }

        [HttpPost]
        public IActionResult LogInvoiceDownload([FromBody] InvoiceDownloadLogRequest request)
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

        private bool IsKundalikEngineersComponent(string description)
        {
            if (string.IsNullOrWhiteSpace(description))
            {
                return false;
            }

            var normalized = NormalizeComponent(description);
            if (normalized.Contains("JLWDREF") || normalized.Contains("JLWD"))
            {
                return true;
            }

            return _kundalikEngineersAllowedComponents.Any(allowed => normalized.Contains(allowed));
        }

        private bool IsKundalikAutomationComponent(string description)
        {
            if (string.IsNullOrWhiteSpace(description))
            {
                return false;
            }

            var normalized = NormalizeComponent(description);
            return _kundalikAutomationAllowedComponents.Any(allowed => normalized.Contains(allowed));
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

        private decimal GetDefaultRate(string itemDescription)
        {
            var normalized = NormalizeComponent(itemDescription);
            foreach (var kv in _pricing.ComponentRates)
            {
                if (normalized.Contains(kv.Key, StringComparison.OrdinalIgnoreCase))
                {
                    return kv.Value;
                }
            }

            return 0m;
        }

        private string NormalizeDisplayComponent(string itemDescription)
        {
            if (string.IsNullOrWhiteSpace(itemDescription))
            {
                return itemDescription;
            }

            foreach (var kv in _pricing.ComponentDisplaySubstitutions)
            {
                itemDescription = itemDescription.Replace(kv.Key, kv.Value, StringComparison.OrdinalIgnoreCase);
            }

            return itemDescription;
        }
    }
}
