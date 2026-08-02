CREATE procedure [dbo].[sp_Get_Total_Components_Dtls]      
@StartDate NVARCHAR(10) = NULL,  -- Example Start Date    
@EndDate NVARCHAR(10) = NULL    
as       
begin      
    
IF (@StartDate != '' AND @EndDate != '')    
begin    
SELECT      
    f_Component_Desc,    
       
    SUM(CAST(f_OutMaterial_Quantity AS INT)) AS MaterialOutQuantity,    
    SUM(CAST(f_RejectMaterial_Quantity AS INT)) AS MaterialRejQuantity,
	SUM(CAST(f_Pending_Quantity AS INT)) AS PendingMaterialQuantity
	
FROM     
    t_JR_Chalan_Process_Dtls    
WHERE      
    (@StartDate IS NULL AND @EndDate IS NULL) OR     
    (CONVERT(DATE, f_ChalanDtls_Date, 23) BETWEEN CONVERT(DATE, @StartDate, 23) AND CONVERT(DATE, @EndDate, 23))  and f_active  = 1  
GROUP BY     
    f_Component_Desc;    
    
 END    
ELSE     
       
begin      
select  f_Component_Desc , sum(CAST(f_Actual_InMaterial_Quantity AS int))as MaterialInQuantity ,sum(CAST(f_Pending_Quantity AS int))as PendingQuantity,sum(CAST(f_OutMaterial_Quantity AS int))as MaterialOutQuantity,sum(CAST(f_RejectMaterial_Quantity AS int
  
    
))as MaterialRejQuantity      
from t_JR_Chalan_Process   
where f_active = 1  
group by f_Component_Desc      
      
    
end    
    
    
end
