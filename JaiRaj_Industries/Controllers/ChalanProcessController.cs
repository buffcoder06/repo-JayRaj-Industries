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


    public class ChalanProcessController : Controller
    {

        private readonly ChalanProcessDAL _chalanProcessDAL;
        string connectionString = @"Server=localhost\SQLEXPRESS01;Database=JAYRAJ_INDUSTRIES;Trusted_Connection=True;";


        public ChalanProcessController()
        {
            // Initialize the DAL with the connection string
            _chalanProcessDAL = new ChalanProcessDAL(connectionString);
        }
        public IActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public ActionResult InsertChalanProcess([FromBody] ChalanProcessBO model)
        {
            try
            {
                // Call the DAL method
                // Make sure to convert or parse model properties to the correct types if necessary
                _chalanProcessDAL.InsertChalanProcess(
                    model.Date,
                    model.ComponentDescription,
                    model.CompanyCode,
                    model.ChalanNo,
                    "null",
                    model.CompanyName,
                    model.VehicleNumber,
                    model.VehicleChalanNumber,
                    model.Quantity,
                     model.Quantity,
                    "0",
                    "0",
                    "Done",
                    0,
                    "null",
                    "null",
                    0

                // ... other properties
                );

                return Json(new { success = true, message = "Data inserted successfully" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public ActionResult GetAllChalanProcessData(string chalanProcessHdrseq)
        {
            try
            {
                var data = _chalanProcessDAL.GetAllChalanProcessData(chalanProcessHdrseq);
                return Json(data); // Temporarily remove JsonRequestBehavior.AllowGet
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }); // Temporarily remove JsonRequestBehavior.AllowGet
            }
        }


        [HttpGet]
        public ActionResult GetAllChalanProcessDetails(string chalanProcessHdrseq)
        {
            try
            {
                var data = _chalanProcessDAL.GetAllChalanProcessDetails(chalanProcessHdrseq);
                return Json(data); // Temporarily remove JsonRequestBehavior.AllowGet
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }); // Temporarily remove JsonRequestBehavior.AllowGet
            }
        }
        [HttpPost]
        public ActionResult InsertChalanProcessDtls(string chalanProcessHdrseq, string f_ChalanDtls_Date, string f_OutChalanNo, string f_Pending_Quantity, string f_OutMaterial_Quantity, string f_RejectMaterial_Quantity)
        {
            try
            {

                var result = _chalanProcessDAL.InsertIntoChalanProcessDtls(chalanProcessHdrseq, f_ChalanDtls_Date, f_OutChalanNo, f_Pending_Quantity, f_OutMaterial_Quantity, f_RejectMaterial_Quantity);

                return Json(new { success = true, message = "Insert successful" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }); // Temporarily remove JsonRequestBehavior.AllowGet
            }
        }

        [HttpGet]
        public ActionResult GetTotalComponentDetails()
        {
            // Instantiate your DAL with the connection string


            // Call the method to get the total component details
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

            // Return the data as JSON
            return Json(dataList);
        }
    }

}