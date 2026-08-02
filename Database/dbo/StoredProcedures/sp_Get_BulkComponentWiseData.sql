create procedure sp_Get_BulkComponentWiseData(
@ComponentName varchar(50)
)
as
begin
select f_ChalanDate,f_Component_Desc, f_InChalanNo   from t_JR_Chalan_Process where f_Component_Desc = @ComponentName order by f_ChalanDate 

end
