using JayRaj_Industries.Models;
using Microsoft.AspNetCore.Mvc;

namespace JayRaj_Industries.Controllers
{
    public class BulkOutMaterialEntryController : Controller
    {
        private readonly ChalanProcessDAL _chalanProcessDAL;

        public BulkOutMaterialEntryController(IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("Jayraj_Industries")
                ?? throw new InvalidOperationException("Connection string 'Jayraj_Industries' was not found.");
            _chalanProcessDAL = new ChalanProcessDAL(connectionString);
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public ActionResult GetChalanProcessDataBasedOnComp(string? CompDesc)
        {
            var data = _chalanProcessDAL.GetChalanProcessDataBasedOnComp(CompDesc);
            return Json(data);
        }

        [HttpPost]
        public IActionResult InsertChalanProcessDtls([FromBody] List<RecordChalanOutRequest> chalanData)
        {
            foreach (var chalan in chalanData)
            {
                bool result = _chalanProcessDAL.InsertIntoChalanProcessDtls(chalan);

                if (!result)
                {
                    return Json(new { success = false, message = "Failed to insert some records." });
                }
            }
            return Json(new { success = true });
        }
    }
}
