using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;


namespace JayRaj_Industries.Controllers
{
    [AllowAnonymous]


    public class ChalanProcessController : Controller
    {

        private readonly ChalanProcessDAL _chalanProcessDAL;
        private readonly ApplicationAuditDAL _applicationAuditDAL;
        private readonly ILogger<ChalanProcessController> _logger;
        private readonly string connectionString;


        public ChalanProcessController(IConfiguration configuration, ILogger<ChalanProcessController> logger)
        {
            _logger = logger;
            connectionString = configuration.GetConnectionString("Jayraj_Industries")
                ?? throw new InvalidOperationException("Connection string 'Jayraj_Industries' was not found.");
            _chalanProcessDAL = new ChalanProcessDAL(connectionString);
            _applicationAuditDAL = new ApplicationAuditDAL(connectionString);

        }
        public IActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public ActionResult InsertChalanProcess([FromBody] ChalanProcessBO obj)
        {
            try
            {
                if (obj == null)
                {
                    return Json(new { success = false, message = "Invalid payload" });
                }

                _chalanProcessDAL.InsertChalanProcess(
                    obj.Date,
                    obj.ComponentDescription,
                    obj.CompanyCode,
                    obj.ChalanNo,
                    "NA",
                    obj.CompanyName,
                    obj.VehicleNumber,
                    obj.VehicleChalanNumber,
                    obj.Quantity,
                    obj.Quantity,
                    "0",
                    "0",
                    "Done",
                    0,
                    "system",
                    "system",
                    0

                );

                return Json(new { success = true, message = "Data inserted successfully" });
            }
            catch (Exception ex)
            {
                LogExceptionToDatabase(nameof(InsertChalanProcess), ex);
                _logger.LogError(ex, "Failed to insert chalan process.");
                return Json(new { success = false, message = "Unable to save chalan process right now." });
            }
        }

        [HttpGet]
        public ActionResult GetAllChalanProcessData(string? chalanProcessHdrseq)
        {
            try
            {
                var data = _chalanProcessDAL.GetAllChalanProcessData(chalanProcessHdrseq);
                return Json(data); // Temporarily remove JsonRequestBehavior.AllowGet
            }
            catch (Exception ex)
            {
                LogExceptionToDatabase(nameof(GetAllChalanProcessData), ex, $"chalanProcessHdrseq={chalanProcessHdrseq}");
                _logger.LogError(ex, "Failed to load chalan process data. chalanProcessHdrseq={ChalanProcessHdrseq}", chalanProcessHdrseq);
                return Json(new { success = false, message = "Unable to load chalan process data right now." });
            }
        }


        [HttpGet]
        public ActionResult GetAllChalanProcessDetails(string? chalanProcessHdrseq)
        {
            try
            {
                var data = _chalanProcessDAL.GetAllChalanProcessDetails(chalanProcessHdrseq);
                return Json(data); // Temporarily remove JsonRequestBehavior.AllowGet
            }
            catch (Exception ex)
            {
                LogExceptionToDatabase(nameof(GetAllChalanProcessDetails), ex, $"chalanProcessHdrseq={chalanProcessHdrseq}");
                _logger.LogError(ex, "Failed to load chalan process details. chalanProcessHdrseq={ChalanProcessHdrseq}", chalanProcessHdrseq);
                return Json(new { success = false, message = "Unable to load chalan details right now." });
            }
        }
        [HttpPost]
        public ActionResult InsertChalanProcessDtls(string? chalanProcessHdrseq, string? f_ChalanDtls_Date, string? f_OutChalanNo, string? f_Pending_Quantity, string? f_OutMaterial_Quantity, string? f_RejectMaterial_Quantity)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(chalanProcessHdrseq))
                {
                    return Json(new { success = false, message = "Chalan process reference is required." });
                }

                var result = _chalanProcessDAL.InsertIntoChalanProcessDtls(chalanProcessHdrseq, f_ChalanDtls_Date, f_OutChalanNo, f_Pending_Quantity, f_OutMaterial_Quantity, f_RejectMaterial_Quantity);

                return Json(new
                {
                    success = result,
                    message = result ? "Insert successful" : "Insert failed"
                });
            }
            catch (Exception ex)
            {
                LogExceptionToDatabase(nameof(InsertChalanProcessDtls), ex, $"chalanProcessHdrseq={chalanProcessHdrseq}");
                _logger.LogError(ex, "Failed to insert chalan process details. chalanProcessHdrseq={ChalanProcessHdrseq}", chalanProcessHdrseq);
                return Json(new { success = false, message = "Unable to save chalan details right now." });
            }
        }

        [HttpGet]
        public ActionResult GetCurrentMonthSummary()
        {
            try
            {
                var now = DateTime.Now;
                var monthStart = new DateTime(now.Year, now.Month, 1);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);

                DataTable totals = _chalanProcessDAL.GetTotalComponentDetails(
                    monthStart.ToString("yyyy-MM-dd"),
                    monthEnd.ToString("yyyy-MM-dd"));
                DataTable inTotals = _chalanProcessDAL.GetTotalInComponentDetails(
                    monthStart.ToString("yyyy-MM-dd"),
                    monthEnd.ToString("yyyy-MM-dd"));
                DataTable overallTotals = _chalanProcessDAL.GetTotalComponentDetails();

                decimal totalOutMaterial = 0m;
                decimal totalPendingMaterialFromColumn = 0m;
                decimal totalRejectedMaterial = 0m;
                decimal totalInMaterial = 0m;

                foreach (DataRow row in totals.Rows)
                {
                    totalOutMaterial += GetFirstDecimal(row, "MaterialOutQuantity", "materialOutQuantity", "f_OutMaterial_Quantity");
                    totalPendingMaterialFromColumn += GetFirstDecimal(row, "PendingQuantity", "pendingQuantity", "f_Pending_Quantity");
                    totalRejectedMaterial += GetFirstDecimal(row, "MaterialRejQuantity", "materialRejQuantity", "f_RejectMaterial_Quantity");
                }

                foreach (DataRow row in inTotals.Rows)
                {
                    totalInMaterial += GetFirstDecimal(row, "MaterialInQuantity", "materialInQuantity", "f_Actual_InMaterial_Quantity");
                }

                decimal livePendingAcrossAllComponents = 0m;
                foreach (DataRow row in overallTotals.Rows)
                {
                    livePendingAcrossAllComponents += GetFirstDecimal(row, "PendingQuantity", "pendingQuantity", "f_Pending_Quantity");
                }

                var computedPending = Math.Max(0m, totalInMaterial - totalOutMaterial - totalRejectedMaterial);
                var totalPendingMaterial = livePendingAcrossAllComponents > 0m
                    ? livePendingAcrossAllComponents
                    : (totalPendingMaterialFromColumn > 0m ? totalPendingMaterialFromColumn : computedPending);

                var allChalans = _chalanProcessDAL.GetAllChalanProcessData(null);
                int incomingChalanCount = allChalans.Count(c =>
                    TryParseDate(c.Date, out var parsedDate) &&
                    parsedDate.Date >= monthStart.Date &&
                    parsedDate.Date <= monthEnd.Date);

                return Json(new
                {
                    success = true,
                    incomingChalanCount,
                    totalOutMaterial,
                    totalPendingMaterial,
                    totalRejectedMaterial,
                    monthLabel = monthStart.ToString("MMMM yyyy")
                });
            }
            catch (Exception ex)
            {
                LogExceptionToDatabase(nameof(GetCurrentMonthSummary), ex);
                _logger.LogError(ex, "Failed to load current month summary.");
                return Json(new { success = false, message = "Unable to load monthly summary right now." });
            }
        }

        [HttpGet]
        public ActionResult GetTotalComponentDetails()
        {
            try
            {
                DataTable data = _chalanProcessDAL.GetTotalComponentDetails();

                var dataList = new List<Dictionary<string, object>>();
                foreach (DataRow row in data.Rows)
                {
                    var dict = new Dictionary<string, object>();
                    foreach (DataColumn col in data.Columns)
                    {
                        dict[col.ColumnName] = row[col];
                    }
                    dataList.Add(dict);
                }

                return Json(dataList);
            }
            catch (Exception ex)
            {
                LogExceptionToDatabase(nameof(GetTotalComponentDetails), ex);
                _logger.LogError(ex, "Failed to load total component details.");
                return Json(new { success = false, message = "Unable to load component totals right now." });
            }
        }

        [HttpPost]
        public ActionResult DeleteDetals(string? chalanProcessdtlseq)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(chalanProcessdtlseq))
                {
                    return Json(new { success = false, message = "Detail reference is required." });
                }

                var result = _chalanProcessDAL.DeactivateRecord(chalanProcessdtlseq);

                if (result)
                {
                    return Json(new { success = true, message = "Delete successful" });
                }
                else
                {
                    return Json(new { success = false, message = "Delete failed" });
                }
            }
            catch (Exception ex)
            {
                LogExceptionToDatabase(nameof(DeleteDetals), ex, $"chalanProcessdtlseq={chalanProcessdtlseq}");
                _logger.LogError(ex, "Failed to delete chalan detail. chalanProcessdtlseq={ChalanProcessDtlSeq}", chalanProcessdtlseq);
                return Json(new { success = false, message = "Unable to delete record right now." });
            }
        }

        private void LogExceptionToDatabase(string actionName, Exception ex, string? payload = null)
        {
            _applicationAuditDAL.LogException(
                nameof(ChalanProcessController),
                actionName,
                ex,
                HttpContext?.Request?.Path.Value,
                HttpContext?.Request?.Method,
                payload,
                User?.Identity?.Name);
        }

        private static decimal GetFirstDecimal(DataRow row, params string[] possibleColumns)
        {
            foreach (var column in possibleColumns)
            {
                if (!row.Table.Columns.Contains(column))
                {
                    continue;
                }

                var value = row[column]?.ToString();
                if (decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var dec))
                {
                    return dec;
                }

                if (decimal.TryParse(value, NumberStyles.Any, CultureInfo.GetCultureInfo("en-IN"), out dec))
                {
                    return dec;
                }
            }

            return 0m;
        }

        private static bool TryParseDate(string? value, out DateTime parsedDate)
        {
            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out parsedDate))
            {
                return true;
            }

            if (DateTime.TryParse(value, CultureInfo.GetCultureInfo("en-IN"), DateTimeStyles.None, out parsedDate))
            {
                return true;
            }

            string[] formats =
            {
                "yyyy-MM-dd",
                "dd-MM-yyyy",
                "MM-dd-yyyy",
                "dd/MM/yyyy",
                "MM/dd/yyyy",
                "yyyy/MM/dd"
            };

            return DateTime.TryParseExact(value ?? string.Empty, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out parsedDate);
        }
    }


}
