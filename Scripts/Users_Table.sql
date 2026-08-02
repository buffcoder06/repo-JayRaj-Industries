/* Login accounts for JayRaj Industries.
   No self-service registration or password reset — accounts are inserted
   directly via SQL. Passwords are stored as PBKDF2-HMACSHA256 hashes
   ("{iterations}.{saltBase64}.{hashBase64}"), never plaintext. */

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 't_JR_Users')
BEGIN
    CREATE TABLE dbo.t_JR_Users
    (
        f_PK_UserID     INT IDENTITY(1,1) PRIMARY KEY,
        f_Username      NVARCHAR(100)   NOT NULL,
        f_PasswordHash  NVARCHAR(200)   NOT NULL,
        f_DisplayName   NVARCHAR(200)   NULL,
        f_Active        BIT             NOT NULL DEFAULT 1,
        f_CreatedAt     DATETIME        NOT NULL DEFAULT GETDATE(),

        CONSTRAINT UQ_t_JR_Users_Username UNIQUE (f_Username)
    );
END
GO
