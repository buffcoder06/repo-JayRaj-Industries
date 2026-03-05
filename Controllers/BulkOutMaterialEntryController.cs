using Microsoft.AspNetCore.Mvc;


namespace JayRaj_Industries.Controllers
{
    public class BulkOutMaterialEntryController : Controller
    {

        private readonly ChalanProcessDAL _chalanProcessDAL;
        private readonly ApplicationAuditDAL _applicationAuditDAL;
        private readonly string connectionString;


        public BulkOutMaterialEntryController(IConfiguration configuration)
        {
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
        public ActionResult GetChalanProcessDataBasedOnComp(string? CompDesc)
        {
            try
            {
                var data = _chalanProcessDAL.GetChalanProcessDataBasedOnComp(CompDesc);
                return Json(data); // Temporarily remove JsonRequestBehavior.AllowGet
            }
            catch (Exception ex)
            {
                LogExceptionToDatabase(nameof(GetChalanProcessDataBasedOnComp), ex, $"CompDesc={CompDesc}");
                return Json(new { success = false, message = ex.Message }); // Temporarily remove JsonRequestBehavior.AllowGet
            }
        }

        [HttpPost]
        public IActionResult InsertChalanProcessDtls([FromBody] List<ChalanProcessDetail> chalanData)
        {
            try
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
            catch (Exception ex)
            {
                LogExceptionToDatabase(nameof(InsertChalanProcessDtls), ex, $"Records={chalanData?.Count ?? 0}");
                return Json(new { success = false, message = ex.Message });
            }
        }

        private void LogExceptionToDatabase(string actionName, Exception ex, string? payload = null)
        {
            _applicationAuditDAL.LogException(
                nameof(BulkOutMaterialEntryController),
                actionName,
                ex,
                HttpContext?.Request?.Path.Value,
                HttpContext?.Request?.Method,
                payload,
                User?.Identity?.Name);
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
