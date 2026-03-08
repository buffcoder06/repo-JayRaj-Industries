ALTER PROCEDURE [dbo].[sp_Get_Total_Components_Dtls]
    @StartDate NVARCHAR(10) = NULL,
    @EndDate NVARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF (ISNULL(LTRIM(RTRIM(@StartDate)), '') <> '' AND ISNULL(LTRIM(RTRIM(@EndDate)), '') <> '')
    BEGIN
        WITH ParsedParams AS
        (
            SELECT
                COALESCE(TRY_CONVERT(DATE, @StartDate, 23), TRY_CONVERT(DATE, @StartDate)) AS StartDate,
                COALESCE(TRY_CONVERT(DATE, @EndDate, 23), TRY_CONVERT(DATE, @EndDate)) AS EndDate
        ),
        FilteredDtls AS
        (
            SELECT
                d.f_PK_Chalan_Process_Dtls_ID,
                d.f_Chalan_Proccess_HdrSeq,
                COALESCE(TRY_CONVERT(DATE, d.f_ChalanDtls_Date, 23), TRY_CONVERT(DATE, d.f_ChalanDtls_Date)) AS ChalanDtlsDateParsed,
                d.f_Component_Desc,
                CAST(d.f_OutMaterial_Quantity AS INT) AS OutQty,
                CAST(d.f_RejectMaterial_Quantity AS INT) AS RejQty,
                CAST(d.f_Pending_Quantity AS INT) AS PendingQty
            FROM t_JR_Chalan_Process_Dtls d
            CROSS JOIN ParsedParams p
            WHERE
                d.f_active = 1
                AND p.StartDate IS NOT NULL
                AND p.EndDate IS NOT NULL
                AND COALESCE(TRY_CONVERT(DATE, d.f_ChalanDtls_Date, 23), TRY_CONVERT(DATE, d.f_ChalanDtls_Date))
                    BETWEEN p.StartDate AND p.EndDate
        ),
        OutRejByComponent AS
        (
            SELECT
                f_Component_Desc,
                SUM(OutQty) AS MaterialOutQuantity,
                SUM(RejQty) AS MaterialRejQuantity
            FROM FilteredDtls
            GROUP BY f_Component_Desc
        ),
        LatestPendingPerHdr AS
        (
            SELECT
                f_Component_Desc,
                f_Chalan_Proccess_HdrSeq,
                PendingQty,
                ROW_NUMBER() OVER
                (
                    PARTITION BY f_Chalan_Proccess_HdrSeq
                    ORDER BY ChalanDtlsDateParsed DESC, f_PK_Chalan_Process_Dtls_ID DESC
                ) AS rn
            FROM FilteredDtls
        ),
        PendingByComponent AS
        (
            SELECT
                f_Component_Desc,
                SUM(PendingQty) AS PendingMaterialQuantity
            FROM LatestPendingPerHdr
            WHERE rn = 1
            GROUP BY f_Component_Desc
        )
        SELECT
            COALESCE(o.f_Component_Desc, p.f_Component_Desc) AS f_Component_Desc,
            ISNULL(o.MaterialOutQuantity, 0) AS MaterialOutQuantity,
            ISNULL(o.MaterialRejQuantity, 0) AS MaterialRejQuantity,
            ISNULL(p.PendingMaterialQuantity, 0) AS PendingMaterialQuantity
        FROM OutRejByComponent o
        FULL OUTER JOIN PendingByComponent p
            ON o.f_Component_Desc = p.f_Component_Desc
        ORDER BY COALESCE(o.f_Component_Desc, p.f_Component_Desc);
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
