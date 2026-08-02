CREATE TABLE [dbo].[t_JR_Users] (
    [f_PK_UserID]    INT            IDENTITY (1, 1) NOT NULL,
    [f_Username]     NVARCHAR (100) NOT NULL,
    [f_PasswordHash] NVARCHAR (200) NOT NULL,
    [f_DisplayName]  NVARCHAR (200) NULL,
    [f_Active]       BIT            NOT NULL,
    [f_CreatedAt]    DATETIME       NOT NULL,
    PRIMARY KEY CLUSTERED ([f_PK_UserID] ASC),
    CONSTRAINT [UQ_t_JR_Users_Username] UNIQUE NONCLUSTERED ([f_Username] ASC)
);
