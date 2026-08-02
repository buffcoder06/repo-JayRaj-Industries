using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Linq;
using JayRaj_Industries.Models;
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
        public ActionResult InsertChalanProcess([FromBody] CreateChalanRequest request)
        {
            if (!ModelState.IsValid)
            {
                var error = ModelState.Values.SelectMany(v => v.Errors).FirstOrDefault()?.ErrorMessage;
                return Json(new { success = false, message = error ?? "Invalid payload" });
            }

            _chalanProcessDAL.InsertChalanProcess(request, "system", "system", 0);

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
        public ActionResult InsertChalanProcessDtls(RecordChalanOutRequest request)
        {
            if (!ModelState.IsValid)
            {
                var error = ModelState.Values.SelectMany(v => v.Errors).FirstOrDefault()?.ErrorMessage;
                return Json(new { success = false, message = error ?? "Chalan process reference is required." });
            }

            var result = _chalanProcessDAL.InsertIntoChalanProcessDtls(request);

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
                totalInMaterial += GetDecimal(row, "MaterialInQuantity");
                totalOutMaterial += GetDecimal(row, "MaterialOutQuantity");
                totalRejectedMaterial += GetDecimal(row, "MaterialRejQuantity");
                totalPendingMaterial += GetDecimal(row, "PendingQuantity");
            }

            var allChalans = _chalanProcessDAL.GetAllChalanProcessData(null);
            int incomingChalanCount = allChalans.Count(c =>
                c.Date.Date >= monthStart.Date &&
                c.Date.Date <= monthEnd.Date);

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

        private static decimal GetDecimal(DataRow row, string columnName)
        {
            var value = row[columnName]?.ToString();
            return string.IsNullOrWhiteSpace(value) ? 0m : decimal.Parse(value, CultureInfo.InvariantCulture);
        }
    }
}
