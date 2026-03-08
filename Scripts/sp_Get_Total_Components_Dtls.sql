ALTER PROCEDURE [dbo].[sp_Get_Total_Components_Dtls]
    @StartDate NVARCHAR(10) = NULL,
    @EndDate NVARCHAR(10) = NULL
AS
BEGIN
    IF (@StartDate != '' AND @EndDate != '')
    BEGIN
        SELECT
            f_Component_Desc,
            SUM(CAST(f_OutMaterial_Quantity AS INT)) AS MaterialOutQuantity,
            SUM(CAST(f_RejectMaterial_Quantity AS INT)) AS MaterialRejQuantity,
            SUM(CAST(f_Pending_Quantity AS INT)) AS PendingMaterialQuantity
        FROM t_JR_Chalan_Process_Dtls
        WHERE
            ((@StartDate IS NULL AND @EndDate IS NULL) OR
             (CONVERT(DATE, f_ChalanDtls_Date, 23) BETWEEN CONVERT(DATE, @StartDate, 23) AND CONVERT(DATE, @EndDate, 23)))
            AND f_active = 1
        GROUP BY f_Component_Desc;
    END
    ELSE
    BEGIN
        SELECT
            f_Component_Desc,
            SUM(CAST(f_Actual_InMaterial_Quantity AS INT)) AS MaterialInQuantity,
            SUM(CAST(f_Pending_Quantity AS INT)) AS PendingQuantity,
            SUM(CAST(f_OutMaterial_Quantity AS INT)) AS MaterialOutQuantity,
            SUM(CAST(f_RejectMaterial_Quantity AS INT)) AS MaterialRejQuantity
        FROM t_JR_Chalan_Process
        WHERE f_active = 1
        GROUP BY f_Component_Desc;
    END
END
