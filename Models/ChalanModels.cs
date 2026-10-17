using System.ComponentModel.DataAnnotations;

namespace JayRaj_Industries.Models
{
    // Read shape for GetAllChalanProcessData / GetChalanProcessDataBasedOnComp
    // (the chalan header/grid row). Replaces the header-read half of the old
    // ChalanProcessBO.
    public class ChalanListItem
    {
        public long ChalanProcessId { get; set; }
        public string ChalanProcessHdrSeq { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string ComponentDescription { get; set; } = string.Empty;
        public string ChalanNo { get; set; } = string.Empty;
        public string? CompanyName { get; set; }
        public string? CompanyCode { get; set; }
        public string? VehicleNumber { get; set; }
        public string? VehicleChalanNumber { get; set; }
        public decimal ActualInMaterialQuantity { get; set; }
        public decimal PendingQuantity { get; set; }
        public decimal OutMaterialQuantity { get; set; }
        public decimal RejectMaterialQuantity { get; set; }
        public string? Remarks { get; set; }
        public int RemarkStatusId { get; set; }
    }

    // Read shape for GetAllChalanProcessDetails (the out-material history rows
    // shown in the chalan details modal). Replaces the f_-prefixed detail-read
    // half of the old ChalanProcessBO.
    public class ChalanDetailItem
    {
        public string ChalanDetailSeq { get; set; } = string.Empty;
        public DateTime DetailDate { get; set; }
        public string? InChalanNo { get; set; }
        public string? OutChalanNo { get; set; }
        public string? CompanyName { get; set; }
        public string ComponentDescription { get; set; } = string.Empty;
        public decimal ActualInMaterialQuantity { get; set; }
        public decimal PendingQuantity { get; set; }
        public decimal OutMaterialQuantity { get; set; }
        public decimal RejectMaterialQuantity { get; set; }
    }

    // Read shape for GetCurrentMonthSummary — a single aggregated row scoped to
    // a date range, computed in SQL rather than pulling every chalan into memory.
    public class ChalanPeriodSummary
    {
        public int IncomingChalanCount { get; set; }
        public decimal TotalInMaterial { get; set; }
        public decimal TotalOutMaterial { get; set; }
        public decimal TotalPendingMaterial { get; set; }
        public decimal TotalRejectedMaterial { get; set; }
    }

    // Write shape for creating a new incoming chalan (ChalanProcessController.InsertChalanProcess).
    // Input rules shared by the write shapes below. Server-side on purpose: the
    // browser's digits-only fields can be bypassed by posting directly.
    internal static class InputRules
    {
        public const string NoMarkup = @"^[^<>]*$";
        public const string NoMarkupMessage = "{0} contains characters that aren't allowed (< or >).";
    }

    public class CreateChalanRequest
    {
        [Required]
        public DateTime Date { get; set; }

        [Required]
        [StringLength(150)]
        [RegularExpression(InputRules.NoMarkup, ErrorMessage = InputRules.NoMarkupMessage)]
        public string ComponentDescription { get; set; } = string.Empty;

        [Required]
        [RegularExpression(@"^\d{7,30}$", ErrorMessage = "Chalan number must be at least 7 digits (numbers only).")]
        public string ChalanNo { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
        public decimal Quantity { get; set; }

        [StringLength(100)]
        [RegularExpression(InputRules.NoMarkup, ErrorMessage = InputRules.NoMarkupMessage)]
        public string? CompanyName { get; set; }

        [StringLength(50)]
        [RegularExpression(InputRules.NoMarkup, ErrorMessage = InputRules.NoMarkupMessage)]
        public string? CompanyCode { get; set; }

        [StringLength(50)]
        [RegularExpression(InputRules.NoMarkup, ErrorMessage = InputRules.NoMarkupMessage)]
        public string? VehicleNumber { get; set; }

        [StringLength(50)]
        [RegularExpression(InputRules.NoMarkup, ErrorMessage = InputRules.NoMarkupMessage)]
        public string? VehicleChalanNumber { get; set; }
    }

    // Write shape for recording out/rejected material against an existing chalan.
    // Shared by ChalanProcessController.InsertChalanProcessDtls and
    // BulkOutMaterialEntryController.InsertChalanProcessDtls (consolidates what
    // used to be two separate, differently-named shapes for the same write).
    public class RecordChalanOutRequest
    {
        [Required]
        [RegularExpression(@"^JRCP\d+$", ErrorMessage = "Invalid chalan reference.")]
        public string ChalanProcessHdrSeq { get; set; } = string.Empty;

        [Required]
        public DateTime DetailDate { get; set; }

        [Required]
        [RegularExpression(@"^\d{1,30}$", ErrorMessage = "Out chalan number must contain numbers only.")]
        public string OutChalanNo { get; set; } = string.Empty;

        [Range(0, double.MaxValue)]
        public decimal PendingQuantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal OutMaterialQuantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal RejectMaterialQuantity { get; set; }
    }
}
