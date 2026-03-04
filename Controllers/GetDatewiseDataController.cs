using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;


namespace JayRaj_Industries.Controllers
{
    [AllowAnonymous]


    public class GetDatewiseDataController : Controller
    {
    
     
     

        private readonly ChalanProcessDAL _chalanProcessDAL;
        private readonly ApplicationAuditDAL _applicationAuditDAL;
        private readonly ILogger<GetDatewiseDataController> _logger;
        private readonly string connectionString;


        public GetDatewiseDataController(IConfiguration configuration, ILogger<GetDatewiseDataController> logger)
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


        [HttpGet]
        public ActionResult GetTotalComponentDetails(string? startDate = null, string? endDate = null)
        {
            try
            {
                DataTable data = _chalanProcessDAL.GetTotalComponentDetails(startDate, endDate);

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
                LogExceptionToDatabase(nameof(GetTotalComponentDetails), ex, $"startDate={startDate};endDate={endDate}");
                _logger.LogError(ex, "Failed to load total component details. startDate={StartDate}, endDate={EndDate}", startDate, endDate);
                return Json(new { success = false, message = "Unable to load total component details right now." });
            }
        }


        public ActionResult GetTotalInComponentDetails(string? startDate = null, string? endDate = null)
        {
            try
            {
                DataTable data = _chalanProcessDAL.GetTotalInComponentDetails(startDate, endDate);

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
                LogExceptionToDatabase(nameof(GetTotalInComponentDetails), ex, $"startDate={startDate};endDate={endDate}");
                _logger.LogError(ex, "Failed to load total in-component details. startDate={StartDate}, endDate={EndDate}", startDate, endDate);
                return Json(new { success = false, message = "Unable to load total in-component details right now." });
            }
        }

        private void LogExceptionToDatabase(string actionName, Exception ex, string? payload = null)
        {
            _applicationAuditDAL.LogException(
                nameof(GetDatewiseDataController),
                actionName,
                ex,
                HttpContext?.Request?.Path.Value,
                HttpContext?.Request?.Method,
                payload,
                User?.Identity?.Name);
        }

    }
}
