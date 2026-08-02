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
        public IActionResult InsertChalanProcessDtls([FromBody] List<ChalanProcessDetail> chalanData)
        {
            foreach (var chalan in chalanData)
            {
                bool result = _chalanProcessDAL.InsertIntoChalanProcessDtls(
                    chalan.chalanProcessHdrseq,
                    chalan.f_ChalanDtls_Date,
                    chalan.f_OutChalanNo,
                    chalan.f_Pending_Quantity,
                    chalan.f_OutMaterial_Quantity,
                    chalan.f_RejectMaterial_Quantity
                );

                if (!result)
                {
                    return Json(new { success = false, message = "Failed to insert some records." });
                }
            }
            return Json(new { success = true });
        }

        public class ChalanProcessDetail
        {
            public string? chalanProcessHdrseq { get; set; }
            public string? f_ChalanDtls_Date { get; set; }
            public string? f_OutChalanNo { get; set; }
            public string? f_Pending_Quantity { get; set; }
            public string? f_OutMaterial_Quantity { get; set; }
            public string? f_RejectMaterial_Quantity { get; set; }
        }
    }
}
