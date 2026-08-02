CREATE PROCEDURE [dbo].[sp_Get_CurrentMonth_ChalanSummary]
    @StartDate NVARCHAR(10),
    @EndDate NVARCHAR(10)
AS
BEGIN
    SELECT
        COUNT(*) AS IncomingChalanCount,
        ISNULL(SUM(CAST(f_Actual_InMaterial_Quantity AS INT)), 0) AS TotalInMaterial,
        ISNULL(SUM(CAST(f_OutMaterial_Quantity AS INT)), 0) AS TotalOutMaterial,
        ISNULL(SUM(CAST(f_Pending_Quantity AS INT)), 0) AS TotalPendingMaterial,
        ISNULL(SUM(CAST(f_RejectMaterial_Quantity AS INT)), 0) AS TotalRejectedMaterial
    FROM dbo.t_JR_Chalan_Process
    WHERE f_active = 1
      AND CONVERT(DATE, f_ChalanDate, 23) BETWEEN CONVERT(DATE, @StartDate, 23) AND CONVERT(DATE, @EndDate, 23);
END
