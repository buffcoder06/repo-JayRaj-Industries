CREATE TABLE [dbo].[t_jr_ApplicationExceptionLog] (
    [ExceptionLogId] BIGINT         IDENTITY (1, 1) NOT NULL,
    [LoggedAt]       DATETIME2 (0)  NOT NULL,
    [ControllerName] NVARCHAR (128) NOT NULL,
    [ActionName]     NVARCHAR (128) NULL,
    [ErrorMessage]   NVARCHAR (MAX) NOT NULL,
    [StackTrace]     NVARCHAR (MAX) NULL,
    [InnerException] NVARCHAR (MAX) NULL,
    [RequestPath]    NVARCHAR (512) NULL,
    [RequestMethod]  NVARCHAR (20)  NULL,
    [Payload]        NVARCHAR (MAX) NULL,
    [UserName]       NVARCHAR (256) NULL,
    PRIMARY KEY CLUSTERED ([ExceptionLogId] ASC)
);
GO

CREATE NONCLUSTERED INDEX [IX_t_jr_ApplicationExceptionLog_LoggedAt]
    ON [dbo].[t_jr_ApplicationExceptionLog]([LoggedAt] DESC);
