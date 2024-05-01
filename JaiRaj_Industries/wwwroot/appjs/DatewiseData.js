
$(document).ready(function () {

});
$('#idShowData').on('click', function () {

var startDate = $('#txtFromDate').val();
var endDate = $('#txtToDate').val();
    
    GetTotalComponentDetails(startDate,endDate);
})

function GetTotalComponentDetails(startDate, endDate) {
    $('#idTotalDtlsGrid').show();
    $.ajax({
        url: '/GetDatewiseData/GetTotalComponentDetails',
        type: 'GET',
        dataType: 'json',
        data: {
            startDate: startDate,  // Pass startDate as a query parameter
            endDate: endDate       // Pass endDate as a query parameter
        },
        success: function (data) {
            $('#OutMaterialModal').modal('show');
            var tbody = $('#tblTotalDtls tbody');
            tbody.empty(); // Clear existing rows
            var html = "";
            $.each(data, function (index, item) {
                html += '<tr>';
                html += '<td>' + (index + 1) + '</td>';
                html += '<td>' + item.f_Component_Desc + '</td>';
                html += '<td>' + item.MaterialInQuantity.toLocaleString() + '</td>';
                html += '<td>' + item.MaterialOutQuantity.toLocaleString() + '</td>';
                html += '<td>' + item.MaterialRejQuantity.toLocaleString() + '</td>';
                html += '<td>' + item.PendingQuantity.toLocaleString() + '</td>';
                html += '</tr>';
            });
            tbody.html(html); // Insert the new rows
        },
        error: function (xhr, status, error) {
            console.error('Error:', status, error);
            alert("Failed to fetch data: " + error);
        }
    });
}
