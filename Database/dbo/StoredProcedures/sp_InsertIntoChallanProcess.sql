CREATE PROCEDURE [dbo].[sp_InsertIntoChallanProcess]      
    -- Add parameters for the data you want to insert      
    @ChalanDate NVARCHAR(200),      
    @Component_Desc NVARCHAR(200)=null,      
    @Company_Cd NVARCHAR(50)=null,      
    @InChalanNo NVARCHAR(200),      
    @OutChalanNo NVARCHAR(200)null,      
    @Company_Name NVARCHAR(200)=null,      
    @VehicleNo NVARCHAR(50)=null,      
    @Vendor_Vehicle_ChallanNo NVARCHAR(150)=null,      
    @Actual_InMaterial_Quantity NVARCHAR(200),      
    @Pending_Quantity NVARCHAR(200)=null,      
    @OutMaterial_Quantity NVARCHAR(200)=null,      
    @RejectMaterial_Quantity NVARCHAR(200)=null,      
    @Remarks NVARCHAR(50),      
    @Remark_StatusID INT,      
    @CreatedBy NVARCHAR(50),      
    @UpdatedBy NVARCHAR(50),      
    @SessionID BIGINT      
AS      
BEGIN      
        -- Check if the Out Chalan Number already exists  
    IF EXISTS (SELECT 1 FROM [dbo].[t_JR_Chalan_Process] WHERE f_InChalanNo = @InChalanNo)  
    BEGIN  
        RAISERROR ('Duplicate Chalan Number Not Allowed.', 16, 1);          
        RETURN;          
    END  
  
  DECLARE @IdentityValue bigint;      
    -- Insert statement      
    INSERT INTO [dbo].[t_JR_Chalan_Process] (      
        [f_PK_Chalan_ProcessHdr],      
  [f_Chalan_Proccess_HdrSeq],      
        [f_ChalanDate],      
        [f_Component_Desc],      
        [f_Company_Cd],      
        [f_InChalanNo],      
        [f_OutChalanNo],      
        [f_Company_Name],      
        [f_VehicleNo],      
        [f_Vendor_Vehicle_ChallanNo],      
        [f_Actual_InMaterial_Quantity],      
        [f_Pending_Quantity],      
        [f_OutMaterial_Quantity],      
        [f_RejectMaterial_Quantity],      
        [f_Remarks],      
        [f_Remark_StatusID],      
        [f_CreatedBy],      
        [f_CreatedAt],      
        [f_UpdatedBy],      
        [f_UpdatedAt],      
        [f_SessionID]  ,
		[f_active]
    )      
    VALUES (      
        'JRCP',      
  'JRCP1',      
        @ChalanDate,      
        @Component_Desc,      
        @Company_Cd,      
        @InChalanNo,      
        @OutChalanNo,      
        @Company_Name,      
        @VehicleNo,      
        @Vendor_Vehicle_ChallanNo,      
        @Actual_InMaterial_Quantity,      
        @Pending_Quantity,      
        @OutMaterial_Quantity,      
        @RejectMaterial_Quantity,      
        @Remarks,      
        @Remark_StatusID,      
        @CreatedBy,      
        getdate(),      
        @UpdatedBy,      
        getdate(),      
        @SessionID   ,
		1
    )      
      
 SET @IdentityValue = SCOPE_IDENTITY();      
      
    -- Now, update the f_Chalan_Proccess_HdrSeq column      
    UPDATE [dbo].[t_JR_Chalan_Process]      
    SET f_Chalan_Proccess_HdrSeq = 'JRCP' + CAST(@IdentityValue AS NVARCHAR(200))      
    WHERE [f_PK_Chalan_ProcessID] = @IdentityValue;      
    -- Update statement (if required)      
    -- You can add an UPDATE statement here if needed, depending on your specific requirements.      
END
