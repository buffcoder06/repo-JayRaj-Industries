CREATE TABLE [dbo].[t_JR_Chalan_Process] (
    [f_PK_Chalan_ProcessID]        BIGINT         IDENTITY (1, 1) NOT NULL,
    [f_PK_Chalan_ProcessHdr]       NVARCHAR (50)  NOT NULL,
    [f_Chalan_Proccess_HdrSeq]     NVARCHAR (50)  NOT NULL,
    [f_ChalanDate]                 NVARCHAR (200) NOT NULL,
    [f_Component_Desc]             NVARCHAR (200) NOT NULL,
    [f_Company_Cd]                 NVARCHAR (50)  NOT NULL,
    [f_InChalanNo]                 NVARCHAR (200) NOT NULL,
    [f_OutChalanNo]                NVARCHAR (200) NOT NULL,
    [f_Company_Name]               NVARCHAR (200) NOT NULL,
    [f_VehicleNo]                  VARCHAR (50)   NULL,
    [f_Vendor_Vehicle_ChallanNo]   VARCHAR (100)  NULL,
    [f_Actual_InMaterial_Quantity] NVARCHAR (200) NOT NULL,
    [f_Pending_Quantity]           NVARCHAR (200) NOT NULL,
    [f_OutMaterial_Quantity]       NVARCHAR (200) NOT NULL,
    [f_RejectMaterial_Quantity]    NVARCHAR (200) NOT NULL,
    [f_Remarks]                    NVARCHAR (50)  NOT NULL,
    [f_Remark_StatusID]            INT            NOT NULL,
    [f_CreatedBy]                  NVARCHAR (50)  NULL,
    [f_CreatedAt]                  DATETIME       NULL,
    [f_UpdatedBy]                  NVARCHAR (50)  NULL,
    [f_UpdatedAt]                  DATETIME       NULL,
    [f_SessionID]                  BIGINT         NULL,
    [f_active]                     BIT            NULL,
    CONSTRAINT [PK_t_JR_Chalan_Process] PRIMARY KEY CLUSTERED ([f_PK_Chalan_ProcessID] ASC)
);
GO

CREATE NONCLUSTERED INDEX [IX_t_JR_Chalan_Process_f_active_hdrseq]
    ON [dbo].[t_JR_Chalan_Process]([f_active] ASC, [f_Chalan_Proccess_HdrSeq] ASC)
    INCLUDE([f_ChalanDate], [f_Component_Desc], [f_InChalanNo], [f_Actual_InMaterial_Quantity], [f_Pending_Quantity], [f_OutMaterial_Quantity], [f_RejectMaterial_Quantity]);
