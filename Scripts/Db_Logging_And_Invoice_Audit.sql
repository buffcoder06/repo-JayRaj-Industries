/* ============================================================
   1) Exception Logging
   ============================================================ */
IF OBJECT_ID('dbo.t_jr_ApplicationExceptionLog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.t_jr_ApplicationExceptionLog
    (
        ExceptionLogId       BIGINT IDENTITY(1,1) PRIMARY KEY,
        LoggedAt             DATETIME2(0) NOT NULL CONSTRAINT DF_t_jr_ApplicationExceptionLog_LoggedAt DEFAULT (SYSDATETIME()),
        ControllerName       NVARCHAR(128) NOT NULL,
        ActionName           NVARCHAR(128) NULL,
        ErrorMessage         NVARCHAR(MAX) NOT NULL,
        StackTrace           NVARCHAR(MAX) NULL,
        InnerException       NVARCHAR(MAX) NULL,
        RequestPath          NVARCHAR(512) NULL,
        RequestMethod        NVARCHAR(20) NULL,
        Payload              NVARCHAR(MAX) NULL,
        UserName             NVARCHAR(256) NULL
    );
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_LogApplicationException
    @ControllerName NVARCHAR(128),
    @ActionName NVARCHAR(128) = NULL,
    @ErrorMessage NVARCHAR(MAX),
    @StackTrace NVARCHAR(MAX) = NULL,
    @InnerException NVARCHAR(MAX) = NULL,
    @RequestPath NVARCHAR(512) = NULL,
    @RequestMethod NVARCHAR(20) = NULL,
    @Payload NVARCHAR(MAX) = NULL,
    @UserName NVARCHAR(256) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.t_jr_ApplicationExceptionLog
    (
        ControllerName, ActionName, ErrorMessage, StackTrace, InnerException,
        RequestPath, RequestMethod, Payload, UserName
    )
    VALUES
    (
        @ControllerName, @ActionName, @ErrorMessage, @StackTrace, @InnerException,
        @RequestPath, @RequestMethod, @Payload, @UserName
    );
END
GO

/* ============================================================
   2) Invoice Audit Logging (Header + Details)
   ============================================================ */
IF OBJECT_ID('dbo.t_jr_InvoiceAuditHeader', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.t_jr_InvoiceAuditHeader
    (
        InvoiceAuditHeaderId BIGINT IDENTITY(1,1) PRIMARY KEY,
        LoggedAt             DATETIME2(0) NOT NULL CONSTRAINT DF_t_jr_InvoiceAuditHeader_LoggedAt DEFAULT (SYSDATETIME()),
        StartDate            DATE NULL,
        EndDate              DATE NULL,
        InvoiceProfile       NVARCHAR(100) NULL,
        InvoiceNo            NVARCHAR(100) NULL,
        InvoiceDate          DATE NULL,
        GeneratedBy          NVARCHAR(256) NULL,
        ItemCount            INT NOT NULL CONSTRAINT DF_t_jr_InvoiceAuditHeader_ItemCount DEFAULT (0),
        TotalQty             DECIMAL(18,3) NOT NULL CONSTRAINT DF_t_jr_InvoiceAuditHeader_TotalQty DEFAULT (0),
        TotalAmount          DECIMAL(18,2) NOT NULL CONSTRAINT DF_t_jr_InvoiceAuditHeader_TotalAmount DEFAULT (0),
        AssessableValue      DECIMAL(18,2) NOT NULL CONSTRAINT DF_t_jr_InvoiceAuditHeader_AssessableValue DEFAULT (0),
        CgstAmount           DECIMAL(18,2) NOT NULL CONSTRAINT DF_t_jr_InvoiceAuditHeader_CgstAmount DEFAULT (0),
        SgstAmount           DECIMAL(18,2) NOT NULL CONSTRAINT DF_t_jr_InvoiceAuditHeader_SgstAmount DEFAULT (0),
        GstAmount            DECIMAL(18,2) NOT NULL CONSTRAINT DF_t_jr_InvoiceAuditHeader_GstAmount DEFAULT (0),
        GrandTotal           DECIMAL(18,2) NOT NULL CONSTRAINT DF_t_jr_InvoiceAuditHeader_GrandTotal DEFAULT (0),
        ControllerName       NVARCHAR(128) NULL,
        SourceAction         NVARCHAR(128) NULL
    );
END
GO

IF OBJECT_ID('dbo.t_jr_InvoiceAuditDetail', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.t_jr_InvoiceAuditDetail
    (
        InvoiceAuditDetailId BIGINT IDENTITY(1,1) PRIMARY KEY,
        InvoiceAuditHeaderId BIGINT NOT NULL,
        LoggedAt             DATETIME2(0) NOT NULL CONSTRAINT DF_t_jr_InvoiceAuditDetail_LoggedAt DEFAULT (SYSDATETIME()),
        SrNo                 INT NOT NULL,
        ItemDescription      NVARCHAR(500) NOT NULL,
        Qty                  DECIMAL(18,3) NOT NULL,
        Unit                 NVARCHAR(50) NULL,
        Rate                 DECIMAL(18,2) NOT NULL,
        Amount               DECIMAL(18,2) NOT NULL,
        CONSTRAINT FK_t_jr_InvoiceAuditDetail_Header
            FOREIGN KEY (InvoiceAuditHeaderId) REFERENCES dbo.t_jr_InvoiceAuditHeader(InvoiceAuditHeaderId)
    );
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_InsertInvoiceAuditHeader
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
GO

CREATE OR ALTER PROCEDURE dbo.sp_InsertInvoiceAuditDetail
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
GO

/* ============================================================
   Optional performance indexes
   ============================================================ */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_t_jr_ApplicationExceptionLog_LoggedAt' AND object_id = OBJECT_ID('dbo.t_jr_ApplicationExceptionLog'))
BEGIN
    CREATE INDEX IX_t_jr_ApplicationExceptionLog_LoggedAt
        ON dbo.t_jr_ApplicationExceptionLog(LoggedAt DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_t_jr_InvoiceAuditHeader_LoggedAt' AND object_id = OBJECT_ID('dbo.t_jr_InvoiceAuditHeader'))
BEGIN
    CREATE INDEX IX_t_jr_InvoiceAuditHeader_LoggedAt
        ON dbo.t_jr_InvoiceAuditHeader(LoggedAt DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_t_jr_InvoiceAuditDetail_HeaderId' AND object_id = OBJECT_ID('dbo.t_jr_InvoiceAuditDetail'))
BEGIN
    CREATE INDEX IX_t_jr_InvoiceAuditDetail_HeaderId
        ON dbo.t_jr_InvoiceAuditDetail(InvoiceAuditHeaderId);
END
GO
