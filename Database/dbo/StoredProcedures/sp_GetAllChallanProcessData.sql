CREATE PROCEDURE [dbo].[sp_GetAllChallanProcessData]    
    @ChalanProcessHdrseq NVARCHAR(200) = NULL  -- Optional parameter    
AS    
BEGIN    
    -- Selecting all columns from the table    
    IF @ChalanProcessHdrseq IS NULL    
    BEGIN    
        -- Return all records if @ChalanProcessHdr is not provided    
        SELECT     
            [f_PK_Chalan_ProcessID],    
            [f_PK_Chalan_ProcessHdr],    
            [f_Chalan_Proccess_HdrSeq],    
            [f_ChalanDate],    
            [f_Component_Desc],    
            [f_Company_Cd],    
            [f_InChalanNo],    
            f_Actual_InMaterial_Quantity,    
            [f_OutChalanNo],    
            [f_Company_Name],    
            [f_VehicleNo],    
            [f_Vendor_Vehicle_ChallanNo],    
            [f_Actual_InMaterial_Quantity],    
            [f_Pending_Quantity],    
            [f_OutMaterial_Quantity],    
            [f_RejectMaterial_Quantity],    
            [f_Remarks],    
            [f_Remark_StatusID]    
        FROM [dbo].[t_JR_Chalan_Process]  
  ORDER BY [f_ChalanDate] desc;  
    END    
    ELSE    
    BEGIN    
        -- Return similar records if @ChalanProcessHdr is provided    
        SELECT     
            [f_PK_Chalan_ProcessID],    
            [f_PK_Chalan_ProcessHdr],    
            [f_Chalan_Proccess_HdrSeq],    
            [f_ChalanDate],    
            [f_Component_Desc],    
            [f_Company_Cd],    
            [f_InChalanNo],    
            f_Actual_InMaterial_Quantity,    
            [f_OutChalanNo],    
            [f_Company_Name],    
            [f_VehicleNo],    
            [f_Vendor_Vehicle_ChallanNo],    
            [f_Actual_InMaterial_Quantity],    
            [f_Pending_Quantity],    
            [f_OutMaterial_Quantity],    
            [f_RejectMaterial_Quantity],    
            [f_Remarks],    
            [f_Remark_StatusID]    
        FROM [dbo].[t_JR_Chalan_Process]    
        WHERE [f_Chalan_Proccess_HdrSeq] = @ChalanProcessHdrseq    
    
    END    
END    
  
  
--select * from t_JR_Chalan_Process
