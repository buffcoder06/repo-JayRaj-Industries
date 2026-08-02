using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JayRaj_Industries.Controllers
{
    [AllowAnonymous]
    public class ChalanProcessController : Controller
    {
        private readonly ChalanProcessDAL _chalanProcessDAL;

        public ChalanProcessController(IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("Jayraj_Industries")
                ?? throw new InvalidOperationException("Connection string 'Jayraj_Industries' was not found.");
            _chalanProcessDAL = new ChalanProcessDAL(connectionString);
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public ActionResult InsertChalanProcess([FromBody] ChalanProcessBO obj)
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

        [HttpGet]
        public ActionResult GetAllChalanProcessData(string? chalanProcessHdrseq)
        {
            var data = _chalanProcessDAL.GetAllChalanProcessData(chalanProcessHdrseq);
            return Json(data);
        }

        [HttpGet]
        public ActionResult GetAllChalanProcessDetails(string? chalanProcessHdrseq)
        {
            var data = _chalanProcessDAL.GetAllChalanProcessDetails(chalanProcessHdrseq);
            return Json(data);
        }

        [HttpPost]
        public ActionResult InsertChalanProcessDtls(string? chalanProcessHdrseq, string? f_ChalanDtls_Date, string? f_OutChalanNo, string? f_Pending_Quantity, string? f_OutMaterial_Quantity, string? f_RejectMaterial_Quantity)
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

        [HttpGet]
        public ActionResult GetCurrentMonthSummary()
        {
            var now = DateTime.Now;
            var monthStart = new DateTime(now.Year, now.Month, 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);

            DataTable overallTotals = _chalanProcessDAL.GetTotalComponentDetails();

            decimal totalOutMaterial = 0m;
            decimal totalRejectedMaterial = 0m;
            decimal totalInMaterial = 0m;
            decimal totalPendingMaterial = 0m;

            foreach (DataRow row in overallTotals.Rows)
            {
                totalInMaterial += GetFirstDecimal(row, "MaterialInQuantity", "materialInQuantity", "f_Actual_InMaterial_Quantity");
                totalOutMaterial += GetFirstDecimal(row, "MaterialOutQuantity", "materialOutQuantity", "f_OutMaterial_Quantity");
                totalRejectedMaterial += GetFirstDecimal(row, "MaterialRejQuantity", "materialRejQuantity", "f_RejectMaterial_Quantity");
                totalPendingMaterial += GetFirstDecimal(row, "PendingQuantity", "pendingQuantity", "f_Pending_Quantity");
            }

            var allChalans = _chalanProcessDAL.GetAllChalanProcessData(null);
            int incomingChalanCount = allChalans.Count(c =>
                TryParseDate(c.Date, out var parsedDate) &&
                parsedDate.Date >= monthStart.Date &&
                parsedDate.Date <= monthEnd.Date);

            return Json(new
            {
                success = true,
                incomingChalanCount,
                totalInMaterial,
                totalOutMaterial,
                totalPendingMaterial,
                totalRejectedMaterial,
                monthLabel = monthStart.ToString("MMMM yyyy")
            });
        }

        [HttpGet]
        public ActionResult GetTotalComponentDetails()
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

        [HttpPost]
        public ActionResult DeleteDetals(string? chalanProcessdtlseq)
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
