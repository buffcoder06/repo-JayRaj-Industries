CREATE PROCEDURE sp_GetChalanProcessDtls    
    @chalanProcessHdrseq NVARCHAR(200)    
AS    
BEGIN    
    -- Selecting data from the table based on the header sequence    
    SELECT   
	f_Chalan_Proccess_DtlsSeq,
        f_ChalanDtls_Date,    
        f_OutChalanNo,    
        f_Company_Name,    
        f_InChalanNo,    
        f_Actual_InMaterial_Quantity,    
        f_Pending_Quantity,    
  f_OutMaterial_Quantity,  
  f_RejectMaterial_Quantity,  
  f_Component_Desc  
    FROM     
        t_JR_Chalan_Process_Dtls    
    WHERE     
        f_Chalan_Proccess_HdrSeq = @chalanProcessHdrseq and f_active = 1 
END
