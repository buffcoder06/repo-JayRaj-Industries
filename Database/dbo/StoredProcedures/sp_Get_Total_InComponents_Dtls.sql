CREATE procedure [dbo].[sp_Get_Total_InComponents_Dtls]      
@StartDate NVARCHAR(10) = NULL,  -- Example Start Date    
@EndDate NVARCHAR(10) = NULL    
as       
begin      
    
IF (@StartDate != '' AND @EndDate != '')    
begin    
SELECT      
    f_Component_Desc,    
       
    SUM(CAST(f_Actual_InMaterial_Quantity AS INT)) AS MaterialInQuantity,    
    SUM(CAST(f_Pending_Quantity AS INT)) AS MaterialPenQuantity    
FROM     
    t_JR_Chalan_Process   
WHERE      
    (@StartDate IS NULL AND @EndDate IS NULL) OR     
    (CONVERT(DATE, f_ChalanDate, 23) BETWEEN CONVERT(DATE, @StartDate, 23) AND CONVERT(DATE, @EndDate, 23))  and f_active = 1  
GROUP BY     
    f_Component_Desc;    
    
 END       
end
