CREATE TABLE [dbo].[t_JR_Chalan_Process_Dtls] (
    [f_PK_Chalan_Process_Dtls_ID]  BIGINT         IDENTITY (1, 1) NOT NULL,
    [f_PK_Chalan_ProcessDtls]      NVARCHAR (50)  NOT NULL,
    [f_Chalan_Proccess_HdrSeq]     NVARCHAR (50)  NOT NULL,
    [f_Chalan_Proccess_DtlsSeq]    NVARCHAR (50)  NOT NULL,
    [f_ChalanDate]                 NVARCHAR (200) NOT NULL,
    [f_ChalanDtls_Date]            NVARCHAR (200) NOT NULL,
    [f_Component_Desc]             NVARCHAR (200) NOT NULL,
    [f_Company_Cd]                 NVARCHAR (50)  NOT NULL,
    [f_InChalanNo]                 NVARCHAR (200) NOT NULL,
    [f_OutChalanNo]                NVARCHAR (200) NOT NULL,
    [f_Company_Name]               NVARCHAR (200) NOT NULL,
    [f_Actual_InMaterial_Quantity] NVARCHAR (200) NOT NULL,
    [f_Pending_Quantity]           NVARCHAR (200) NOT NULL,
    [f_OutMaterial_Quantity]       NVARCHAR (200) NOT NULL,
    [f_RejectMaterial_Quantity]    NVARCHAR (200) NOT NULL,
    [f_CreatedBy]                  NVARCHAR (50)  NULL,
    [f_CreatedAt]                  DATETIME       NULL,
    [f_UpdatedBy]                  NVARCHAR (50)  NULL,
    [f_UpdatedAt]                  DATETIME       NULL,
    [f_SessionID]                  BIGINT         NULL,
    [f_active]                     BIT            NULL,
    CONSTRAINT [PK_t_JR_Chalan_Process_Dtls] PRIMARY KEY CLUSTERED ([f_PK_Chalan_Process_Dtls_ID] ASC)
);
GO

CREATE NONCLUSTERED INDEX [IX_t_JR_Chalan_Process_Dtls_hdrseq_active]
    ON [dbo].[t_JR_Chalan_Process_Dtls]([f_Chalan_Proccess_HdrSeq] ASC, [f_active] ASC)
    INCLUDE([f_PK_Chalan_Process_Dtls_ID], [f_ChalanDtls_Date], [f_Component_Desc], [f_InChalanNo], [f_OutChalanNo], [f_Actual_InMaterial_Quantity], [f_Pending_Quantity], [f_OutMaterial_Quantity], [f_RejectMaterial_Quantity]);
