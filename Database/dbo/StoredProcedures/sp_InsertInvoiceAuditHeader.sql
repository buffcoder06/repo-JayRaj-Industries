CREATE   PROCEDURE dbo.sp_InsertInvoiceAuditHeader
    @StartDate DATE = NULL,
    @EndDate DATE = NULL,
    @InvoiceProfile NVARCHAR(100) = NULL,
    @InvoiceNo NVARCHAR(100) = NULL,
    @InvoiceDate DATE = NULL,
    @GeneratedBy NVARCHAR(256) = NULL,
    @ItemCount INT,
    @TotalQty DECIMAL(18,3),
    @TotalAmount DECIMAL(18,2),
    @AssessableValue DECIMAL(18,2),
    @CgstAmount DECIMAL(18,2),
    @SgstAmount DECIMAL(18,2),
    @GstAmount DECIMAL(18,2),
    @GrandTotal DECIMAL(18,2),
    @ControllerName NVARCHAR(128) = NULL,
    @SourceAction NVARCHAR(128) = NULL,
    @InvoiceAuditHeaderId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.t_jr_InvoiceAuditHeader
    (
        StartDate, EndDate, InvoiceProfile, InvoiceNo, InvoiceDate, GeneratedBy,
        ItemCount, TotalQty, TotalAmount, AssessableValue, CgstAmount, SgstAmount, GstAmount, GrandTotal,
        ControllerName, SourceAction
    )
    VALUES
    (
        @StartDate, @EndDate, @InvoiceProfile, @InvoiceNo, @InvoiceDate, @GeneratedBy,
        @ItemCount, @TotalQty, @TotalAmount, @AssessableValue, @CgstAmount, @SgstAmount, @GstAmount, @GrandTotal,
        @ControllerName, @SourceAction
    );

    SET @InvoiceAuditHeaderId = SCOPE_IDENTITY();
END
