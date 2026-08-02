CREATE PROCEDURE sp_GetChalanEntriesByComp
(
   @ComponentDesc NVARCHAR(200)
)
AS
BEGIN 

SELECT [f_PK_Chalan_ProcessID],    
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
			FROM t_JR_Chalan_Process 
			WHERE f_Component_Desc = @ComponentDesc and f_Pending_Quantity <> '0'
			ORDER BY f_ChalanDate;

END
