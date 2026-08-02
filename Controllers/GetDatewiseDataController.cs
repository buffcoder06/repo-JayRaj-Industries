using System.Collections.Generic;
using System.Data;
using Microsoft.AspNetCore.Mvc;

namespace JayRaj_Industries.Controllers
{
    public class GetDatewiseDataController : Controller
    {
        private readonly ChalanProcessDAL _chalanProcessDAL;

        public GetDatewiseDataController(ChalanProcessDAL chalanProcessDAL)
        {
            _chalanProcessDAL = chalanProcessDAL;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public ActionResult GetTotalComponentDetails(string? startDate = null, string? endDate = null)
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

        public ActionResult GetTotalInComponentDetails(string? startDate = null, string? endDate = null)
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
    }
}
