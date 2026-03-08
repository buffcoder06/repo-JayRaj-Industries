/* Performance indexes for Chalan Process screens */

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_t_JR_Chalan_Process_f_active_hdrseq'
      AND object_id = OBJECT_ID('dbo.t_JR_Chalan_Process')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_t_JR_Chalan_Process_f_active_hdrseq
    ON dbo.t_JR_Chalan_Process (f_active, f_Chalan_Proccess_HdrSeq)
    INCLUDE (f_ChalanDate, f_Component_Desc, f_InChalanNo, f_Actual_InMaterial_Quantity, f_Pending_Quantity, f_OutMaterial_Quantity, f_RejectMaterial_Quantity);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_t_JR_Chalan_Process_Dtls_hdrseq_active'
      AND object_id = OBJECT_ID('dbo.t_JR_Chalan_Process_Dtls')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_t_JR_Chalan_Process_Dtls_hdrseq_active
    ON dbo.t_JR_Chalan_Process_Dtls (f_Chalan_Proccess_HdrSeq, f_active)
    INCLUDE (f_PK_Chalan_Process_Dtls_ID, f_ChalanDtls_Date, f_Component_Desc, f_InChalanNo, f_OutChalanNo, f_Actual_InMaterial_Quantity, f_Pending_Quantity, f_OutMaterial_Quantity, f_RejectMaterial_Quantity);
END
GO
