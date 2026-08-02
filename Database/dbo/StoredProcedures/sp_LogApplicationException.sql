CREATE   PROCEDURE dbo.sp_LogApplicationException
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
