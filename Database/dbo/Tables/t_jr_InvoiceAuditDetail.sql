CREATE TABLE [dbo].[t_jr_InvoiceAuditDetail] (
    [InvoiceAuditDetailId] BIGINT          IDENTITY (1, 1) NOT NULL,
    [InvoiceAuditHeaderId] BIGINT          NOT NULL,
    [LoggedAt]             DATETIME2 (0)   NOT NULL,
    [SrNo]                 INT             NOT NULL,
    [ItemDescription]      NVARCHAR (500)  NOT NULL,
    [Qty]                  DECIMAL (18, 3) NOT NULL,
    [Unit]                 NVARCHAR (50)   NULL,
    [Rate]                 DECIMAL (18, 2) NOT NULL,
    [Amount]               DECIMAL (18, 2) NOT NULL,
    PRIMARY KEY CLUSTERED ([InvoiceAuditDetailId] ASC)
);
GO

CREATE NONCLUSTERED INDEX [IX_t_jr_InvoiceAuditDetail_HeaderId]
    ON [dbo].[t_jr_InvoiceAuditDetail]([InvoiceAuditHeaderId] ASC);
