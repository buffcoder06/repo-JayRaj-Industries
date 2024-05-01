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
        string connectionString = @"Server=localhost\SQLEXPRESS01;Database=JAYRAJ_INDUSTRIES;Trusted_Connection=True;";


        public GetDatewiseDataController()
        {
            // Initialize the DAL with the connection string
            _chalanProcessDAL = new ChalanProcessDAL(connectionString);
        }
        public IActionResult Index()
        {
            return View();
        }


        [HttpGet]
        public ActionResult GetTotalComponentDetails(string startDate = null, string endDate = null)
        {
            // Instantiate your DAL with the connection string
            // Assuming _chalanProcessDAL is already instantiated and available

            // Call the method to get the total component details with date filtering
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

            // Return the data as JSON
            return Json(dataList);
        }

    }
}