public class ChalanProcessBO
{
    // Existing properties
    public string Date { get; set; }
    public string ComponentDescription { get; set; }
    public string ChalanNo { get; set; }
    public string Quantity { get; set; }
    public string CompanyName { get; set; }
    public string f_RejectMaterial_Quantity { get; set; }
    public string VehicleNumber { get; set; }
    public string VehicleChalanNumber { get; set; }
    public string CompanyCode { get; set; }
    public string f_Component_Desc { get; set; }

    // New properties to match the additional columns in the stored procedure
    public long ChalanProcessID { get; set; }
    public string ChalanProcessHdr { get; set; }
    public string ChalanProccessHdrSeq { get; set; }
    // ... Add other properties as needed
    public string ActualInMaterialQuantity { get; set; }
    public string PendingQuantity { get; set; }
    public string OutMaterialQuantity { get; set; }
    public string RejectMaterialQuantity { get; set; }
    public string Remarks { get; set; }
    public string f_ChalanDtls_Date { get; set; }
    public string f_OutChalanNo { get; set; }
    public string f_Company_Name { get; set; }
    public string f_InChalanNo { get; set; }
    public string f_Actual_InMaterial_Quantity { get; set; }
    public string f_Pending_Quantity { get; set; }
    public string f_OutMaterial_Quantity { get; set; }

    public int RemarkStatusID { get; set; }
    // ... Continue adding any other fields you need from the stored procedure
}
