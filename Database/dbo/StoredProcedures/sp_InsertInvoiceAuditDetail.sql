CREATE   PROCEDURE dbo.sp_InsertInvoiceAuditDetail
    @InvoiceAuditHeaderId BIGINT,
    @SrNo INT,
    @ItemDescription NVARCHAR(500),
    @Qty DECIMAL(18,3),
    @Unit NVARCHAR(50) = NULL,
    @Rate DECIMAL(18,2),
    @Amount DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.t_jr_InvoiceAuditDetail
    (
        InvoiceAuditHeaderId, SrNo, ItemDescription, Qty, Unit, Rate, Amount
    )
    VALUES
    (
        @InvoiceAuditHeaderId, @SrNo, @ItemDescription, @Qty, @Unit, @Rate, @Amount
    );
END
