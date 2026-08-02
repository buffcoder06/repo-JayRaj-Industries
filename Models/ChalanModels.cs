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

    // Write shape for creating a new incoming chalan (ChalanProcessController.InsertChalanProcess).
    public class CreateChalanRequest
    {
        [Required]
        public DateTime Date { get; set; }

        [Required]
        public string ComponentDescription { get; set; } = string.Empty;

        [Required]
        public string ChalanNo { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
        public decimal Quantity { get; set; }

        public string? CompanyName { get; set; }
        public string? CompanyCode { get; set; }
        public string? VehicleNumber { get; set; }
        public string? VehicleChalanNumber { get; set; }
    }

    // Write shape for recording out/rejected material against an existing chalan.
    // Shared by ChalanProcessController.InsertChalanProcessDtls and
    // BulkOutMaterialEntryController.InsertChalanProcessDtls (consolidates what
    // used to be two separate, differently-named shapes for the same write).
    public class RecordChalanOutRequest
    {
        [Required]
        public string ChalanProcessHdrSeq { get; set; } = string.Empty;

        [Required]
        public DateTime DetailDate { get; set; }

        [Required]
        public string OutChalanNo { get; set; } = string.Empty;

        [Range(0, double.MaxValue)]
        public decimal PendingQuantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal OutMaterialQuantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal RejectMaterialQuantity { get; set; }
    }
}
