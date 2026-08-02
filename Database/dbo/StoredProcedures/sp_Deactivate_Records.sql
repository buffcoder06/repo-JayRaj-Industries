CREATE PROCEDURE sp_Deactivate_Records
(
    @dtlseq NVARCHAR(100)
)
AS
BEGIN
    DECLARE @f_outMaterial INT;
    DECLARE @f_rejMaterial INT;
    DECLARE @hdrseq NVARCHAR(50);

    -- Retrieve the header sequence, rejected material, and out material based on the detail sequence
    SELECT 
        @hdrseq = f_Chalan_Proccess_HdrSeq,
        @f_outMaterial = CAST(f_OutMaterial_Quantity AS INT),
        @f_rejMaterial = CAST(f_RejectMaterial_Quantity AS INT)
    FROM 
        [t_JR_Chalan_Process_dtls]
    WHERE 
        f_Chalan_Proccess_DtlsSeq = @dtlseq;

    -- Deactivate the detail record
    UPDATE [t_JR_Chalan_Process_dtls]
    SET f_active = 0
    WHERE f_Chalan_Proccess_DtlsSeq = @dtlseq;

    -- Update the pending quantity in the header based on the rejection or out material quantity
    IF (ISNULL(@f_rejMaterial, 0) > 0)
    BEGIN
        UPDATE [t_JR_Chalan_Process]
        SET f_Pending_Quantity = CAST(CAST(f_Pending_Quantity AS INT) + @f_rejMaterial AS NVARCHAR(50)), 
            f_RejectMaterial_Quantity = CAST(CAST(f_RejectMaterial_Quantity AS INT) - @f_rejMaterial AS NVARCHAR(50))
        WHERE f_Chalan_Proccess_HdrSeq = @hdrseq;
    END
    ELSE
    BEGIN
        UPDATE [t_JR_Chalan_Process]
        SET f_Pending_Quantity = CAST(CAST(f_Pending_Quantity AS INT) + @f_outMaterial AS NVARCHAR(50)), 
            f_OutMaterial_Quantity = CAST(CAST(f_OutMaterial_Quantity AS INT) - @f_outMaterial AS NVARCHAR(50))
        WHERE f_Chalan_Proccess_HdrSeq = @hdrseq;
    END
END;
