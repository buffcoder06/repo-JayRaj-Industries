using System.Threading.Tasks;
using JayRaj_Industries.Models;
using Microsoft.AspNetCore.Mvc;

namespace JayRaj_Industries.Controllers
{
    public class BulkOutMaterialEntryController : Controller
    {
        private readonly ChalanProcessDAL _chalanProcessDAL;

        public BulkOutMaterialEntryController(ChalanProcessDAL chalanProcessDAL)
        {
            _chalanProcessDAL = chalanProcessDAL;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<ActionResult> GetChalanProcessDataBasedOnComp(string? CompDesc)
        {
            var data = await _chalanProcessDAL.GetChalanProcessDataBasedOnCompAsync(CompDesc);
            return Json(data);
        }

        [HttpPost]
        public async Task<IActionResult> InsertChalanProcessDtls([FromBody] List<RecordChalanOutRequest> chalanData)
        {
            foreach (var chalan in chalanData)
            {
                bool result = await _chalanProcessDAL.InsertIntoChalanProcessDtlsAsync(chalan);

                if (!result)
                {
                    return Json(new { success = false, message = "Failed to insert some records." });
                }
            }
            return Json(new { success = true });
        }
    }
}
