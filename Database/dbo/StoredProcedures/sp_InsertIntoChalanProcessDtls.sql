CREATE PROCEDURE sp_InsertIntoChalanProcessDtls              
    @chalanProcessHdrseq NVARCHAR(200),              
    @f_ChalanDtls_Date NVARCHAR(200),              
    @f_OutChalanNo NVARCHAR(200),              
    @f_Pending_Quantity NVARCHAR(200),              
    @f_OutMaterial_Quantity NVARCHAR(200),              
    @f_RejectMaterial_Quantity NVARCHAR(200),              
    @f_CreatedBy NVARCHAR(50) = NULL,              
    @f_UpdatedBy NVARCHAR(50) = NULL,              
    @f_SessionID BIGINT = NULL              
AS              
BEGIN     
    
    
    
    -- Check if the Out Chalan Number already exists    
    --IF EXISTS (SELECT 1 FROM [dbo].[t_JR_Chalan_Process_Dtls] WHERE f_OutChalanNo = @f_OutChalanNo)    
    --BEGIN    
    --    RAISERROR ('Duplicate Chalan Number Not Allowed.', 16, 1);            
    --    RETURN;            
    --END    
    
    
    DECLARE @IdentityValue BIGINT;              
    DECLARE @ChalanDate NVARCHAR(200), @ComponentDesc NVARCHAR(200), @CompanyCd NVARCHAR(50), @InChalanNo NVARCHAR(200), @CompanyName NVARCHAR(200), @ActualInMaterialQuantity NVARCHAR(200), @PendingQuantityOnDate INT;              
              
    -- Retrieve necessary data              
    SELECT               
        @ChalanDate = f_ChalanDate,              
        @ComponentDesc = f_Component_Desc,              
        @CompanyCd = f_Company_Cd,              
        @InChalanNo = f_InChalanNo,              
        @CompanyName = f_Company_Name,              
        @ActualInMaterialQuantity = f_Actual_InMaterial_Quantity              
    FROM t_JR_Chalan_Process              
    WHERE f_Chalan_Proccess_HdrSeq = @chalanProcessHdrseq  AND f_active = 1;              
                
    -- Check for pending orders on the existing component with older dates            
    SELECT @PendingQuantityOnDate = SUM(CAST(f_Pending_Quantity AS INT))            
    FROM t_JR_Chalan_Process            
    WHERE f_Component_Desc = @ComponentDesc            
    AND f_ChalanDate < @ChalanDate AND f_active = 1;            
                
    IF @PendingQuantityOnDate > 0            
    BEGIN            
        RAISERROR ('Please complete older pending orders for the same component before proceeding.', 16, 1);            
        RETURN;            
    END;            
              
    -- Insert data into the table              
    INSERT INTO [dbo].[t_JR_Chalan_Process_Dtls]              
    (              
        [f_PK_Chalan_ProcessDtls],              
        [f_Chalan_Proccess_DtlsSeq],              
        [f_ChalanDtls_Date],              
        [f_OutChalanNo],              
        [f_Pending_Quantity],              
        [f_OutMaterial_Quantity],              
        [f_RejectMaterial_Quantity],              
        [f_CreatedBy],              
        [f_CreatedAt],              
        [f_UpdatedBy],              
        [f_UpdatedAt],              
        [f_SessionID],              
        [f_Chalan_Proccess_HdrSeq],              
        [f_ChalanDate],              
        [f_Component_Desc],              
        [f_Company_Cd],              
        [f_InChalanNo],              
        [f_Company_Name],              
        [f_Actual_InMaterial_Quantity]   ,
		[f_active]
    )              
    VALUES              
    (              
        'JRCPD',              
        'JRCPD1',              
        @f_ChalanDtls_Date,              
        @f_OutChalanNo,              
        CAST(CAST(@f_Pending_Quantity AS INT )- CAST(@f_RejectMaterial_Quantity AS INT) - CAST(@f_OutMaterial_Quantity AS INT) AS NVARCHAR(200)),              
        @f_OutMaterial_Quantity,              
        @f_RejectMaterial_Quantity,              
        @f_CreatedBy,              
        GETDATE(),              
        @f_UpdatedBy,              
        GETDATE(),              
        @f_SessionID,              
        @chalanProcessHdrseq,              
        @ChalanDate,              
        @ComponentDesc,              
        @CompanyCd,              
        @InChalanNo,              
        @CompanyName,              
        @ActualInMaterialQuantity   ,
		1
    );              
              
    -- Update the parent table              
    UPDATE t_JR_Chalan_Process              
    SET f_Pending_Quantity = CAST(CAST(@f_Pending_Quantity AS INT )- CAST(@f_RejectMaterial_Quantity AS INT) - CAST(@f_OutMaterial_Quantity AS INT) AS NVARCHAR(200))   ,          
        f_OutMaterial_Quantity = CAST(CAST(f_OutMaterial_Quantity AS INT) + CAST(@f_OutMaterial_Quantity AS INT) AS NVARCHAR(200)),              
        f_RejectMaterial_Quantity = CAST(CAST(f_RejectMaterial_Quantity AS INT) + CAST(@f_RejectMaterial_Quantity AS INT) AS NVARCHAR(200))            
    WHERE f_Chalan_Proccess_HdrSeq = @chalanProcessHdrseq and f_active = 1;               
              
    -- Get the identity value of the inserted record              
    SET @IdentityValue = SCOPE_IDENTITY();                
              
    -- Update the detail sequence with the identity value              
    UPDATE [dbo].[t_JR_Chalan_Process_Dtls]              
    SET f_Chalan_Proccess_DtlsSeq = 'JRCPD' + CAST(@IdentityValue AS NVARCHAR(200))              
    WHERE [f_PK_Chalan_Process_Dtls_ID] = @IdentityValue;               
END
