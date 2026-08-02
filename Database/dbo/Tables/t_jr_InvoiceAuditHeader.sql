CREATE TABLE [dbo].[t_jr_InvoiceAuditHeader] (
    [InvoiceAuditHeaderId] BIGINT          IDENTITY (1, 1) NOT NULL,
    [LoggedAt]             DATETIME2 (0)   NOT NULL,
    [StartDate]            DATE            NULL,
    [EndDate]              DATE            NULL,
    [InvoiceProfile]       NVARCHAR (100)  NULL,
    [InvoiceNo]            NVARCHAR (100)  NULL,
    [InvoiceDate]          DATE            NULL,
    [GeneratedBy]          NVARCHAR (256)  NULL,
    [ItemCount]            INT             NOT NULL,
    [TotalQty]             DECIMAL (18, 3) NOT NULL,
    [TotalAmount]          DECIMAL (18, 2) NOT NULL,
    [AssessableValue]      DECIMAL (18, 2) NOT NULL,
    [CgstAmount]           DECIMAL (18, 2) NOT NULL,
    [SgstAmount]           DECIMAL (18, 2) NOT NULL,
    [GstAmount]            DECIMAL (18, 2) NOT NULL,
    [GrandTotal]           DECIMAL (18, 2) NOT NULL,
    [ControllerName]       NVARCHAR (128)  NULL,
    [SourceAction]         NVARCHAR (128)  NULL,
    PRIMARY KEY CLUSTERED ([InvoiceAuditHeaderId] ASC)
);
GO

CREATE NONCLUSTERED INDEX [IX_t_jr_InvoiceAuditHeader_LoggedAt]
    ON [dbo].[t_jr_InvoiceAuditHeader]([LoggedAt] DESC);
