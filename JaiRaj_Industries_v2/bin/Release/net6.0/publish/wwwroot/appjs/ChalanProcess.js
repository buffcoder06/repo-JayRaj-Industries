var originalPendingQuantity = "";
var lastDoneQuantity = "";

$(document).ready(function () {
    function filterTable() {
        var searchTexts = $('.srchTextInputCls').map(function () {
            return $(this).val().trim().toLowerCase();
        }).get();

        $('#tblchalanProcess tbody tr').each(function () {
            var rowText = $(this).text().toLowerCase();
            var isRowVisible = true;
            searchTexts.forEach(function (searchText) {
                if (rowText.indexOf(searchText) === -1) {
                    isRowVisible = false;
                }
            });
            $(this).toggle(isRowVisible);
        });
    }

    // Event listener for search input fields
    $('.srchTextInputCls').on('input', function () {
        filterTable();
    });


    $.ajax({
        url: '/ChalanProcess/GetAllChalanProcessData?chalanProcessHdrseq=' + "",  // Adjust the URL as needed
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            var tbody = $('#tblchalanProcess tbody');
            tbody.empty(); // Clear existing rows
            var row = "";
            $.each(data, function (index, item) {
                row += '<tr>';
                if (item.pendingQuantity != 0) {
                    row += "<td><input type='button' name='action' Action='" + 'Update' + "' id='" + item.chalanProccessHdrSeq + "' class='btn btn-danger' onclick='ShowForm(this);' value='Open Chalan'></input></td>";
                } else {
                    row += "<td><input type='button' name='action' Action='" + 'View' + "'  id='" + item.chalanProccessHdrSeq + "' class='btn btn-success' value='Closed Chalan'></input></td>";
                } // Replace with actual action buttons or content
                var formattedDate = formatDate(item.date);
                row += '<td>' + formattedDate + '</td>';
                row += '<td>' + item.componentDescription + '</td>';
                row += '<td><a href="javascript:void(0);" class="chalan-number-link" chalanProccessHdrSeq="' + item.chalanProccessHdrSeq + '">' + item.chalanNo + '</a></td>';
                row += '<td>' + item.actualInMaterialQuantity + '</td>';
                // row += '<td>' + item.companyName + '</td>';
                // row += '<td>' + item.vehicleNumber + '</td>';
                // row += '<td>' + item.vehicleChalanNumber + '</td>';
                // row += '<td>' + item.quantity + '</td>'; // Add corresponding BO property
                // row += '<td>' + item.outMaterialQuantity + '</td>'; // Add corresponding BO property
                row += '<td>' + item.pendingQuantity + '</td>'; // Add corresponding BO property
                row += '</tr>';
                tbody.html(row);
            });
            filterTable();
        },
        error: function (error) {
            console.error('Error fetching data: ', error);
        }
    });


});


function formatDate(dateString) {
    var date = new Date(dateString);
    var day = date.getDate().toString().padStart(2, '0');
    var month = (date.getMonth() + 1).toString().padStart(2, '0');
    var year = date.getFullYear().toString();
    return day + "-" + month + "-" + year;
}

function GetChalanDetails(btn) {

    $.ajax({
        url: '/ChalanProcess/GetAllChalanProcessDetails?chalanProcessHdrseq=' + btn,  // Adjust the URL as needed
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            var tbody = $('#tblOutdetails tbody');
            tbody.empty(); // Clear existing rows
            var row = "";
            console.log(data);
            var componentDesc = ''; // Initialize variable to store component description
            $.each(data, function (index, item) {
                row += '<tr>';
                var formattedDate = formatDate(item.f_ChalanDtls_Date);
                row += "<td><input type='button' name='action' Action='" + 'Update' + "' id='" + item.f_ChalanProcessDtlSeq + "' class='btn btn-danger' onclick='Delete(this);' value='Delete'></input></td>";
                row += '<td>' + formattedDate + '</td>';
                row += '<td>' + item.f_InChalanNo + '</td>';
                row += '<td>' + item.f_OutChalanNo + '</td>';
                row += '<td>' + item.f_Actual_InMaterial_Quantity + '</td>';
                row += '<td>' + item.f_OutMaterial_Quantity + '</td>'; // Add corresponding BO property // Add corresponding BO property                
                row += '<td>' + item.f_RejectMaterial_Quantity + '</td>';
                //row += '<td>' + item.f_Pending_Quantity + '</td>';
                // Add corresponding BO property
                row += '</tr>';
                componentDesc = item.f_Component_Desc; // Update component description
            });
            $('#idComponentName').text(componentDesc); // Set component description value
            tbody.html(row);
        },
        error: function (error) {
            console.error('Error fetching data: ', error);
        }
    });
}

$(document).on('click', '.chalan-number-link', function (e) {
    e.preventDefault(); // Prevent the default action of the link

    // Perform the same actions as in your $("#btnIn").on('click', ...) function
    $('#EmpModal').modal('show');
    var chalanProccessHdrSeq = $(this).attr('chalanProccessHdrSeq');
    GetChalanDetails(chalanProccessHdrSeq)
    // Additional actions can be performed here, like using the chalan number for something
    // Example: console.log("Chalan number clicked:", chalanNo);
});


$("#btnIn").on('click', function (e) {

    $('#idChalanNew').show();
    $('#idChalanProcessGrid').hide();
    $('#idChalanEntry').hide();
    $('#idChalanTotalView').hide();
    $('#idTotalDtlsGrid').hide();
})


// Trigger the AJAX call, for example, on a button click or on document ready
function ShowForm(btn) {
    // Retrieve the chalanProcessHdrseq value
    var chalanProcessHdrseq = $(btn).attr('id');

    $('#HdnProcessHdeSeq').val(chalanProcessHdrseq);// Adjust the selector as needed
    $('#idChalanOut').show();
    $('#idChalanProcessGrid').hide();
    $('#idChalanEntry').hide();
    $('#idChalanTotalView').hide();
    $.ajax({
        url: '/ChalanProcess/GetAllChalanProcessData', // The URL to your action
        type: 'GET',
        data: { chalanProcessHdrseq: chalanProcessHdrseq }, // Send chalanProcessHdrseq as a parameter
        dataType: 'json',
        success: function (data) {
            if (data && data.length > 0) {
                // Assuming you want to use the first item to populate the text boxes
                var item = data[0];

                $('#txtExistChalan').val(item.chalanNo);
                $('#txtComponentDesc').val(item.componentDescription);
                $('#txtPenQuantity').val(item.pendingQuantity);
                // ... similarly set values for other textboxes
                originalPendingQuantity = parseInt($('#txtPenQuantity').val(), 10);
                lastDoneQuantity = 0;
            }
        },
        error: function (xhr, status, error) {
            console.error("Error: " + error);
        }
    });
}




$('btnEdit').on('click', function () {


    $('#idChalanProcess').show();
})




function loadImageAndOpenInNewTab(imagePath) {
    $.ajax({
        url: imagePath,
        type: 'GET',
        xhrFields: {
            responseType: 'blob'
        },
        success: function (blob) {
            var reader = new FileReader();
            reader.onload = function () {
                var dataUrl = reader.result;
                var base64EncodedImage = dataUrl;

                // Open the image in a new tab
                var imageWindow = window.open();
                imageWindow.document.write('<img src="' + base64EncodedImage + '"/>');
            };
            reader.readAsDataURL(blob);
        },
        error: function () {
            console.error('Error loading image.');
        }
    });
}




$('#btnTotalView').on('click', function () {


    //loadImageAndOpenInNewTab('D:\image_JR.PNG');
    GetTotalComponentDetails();
})
// Example usage

$("#btnCloseModal").click(function () {
    $("#EmpModal").modal('hide');

    $("#OutMaterialModal").modal('hide');
})

$("#SaveChalanStatus").click(function () {
    if (fnValidations1())

        InsertChalanDetails();
    else
        return false;
})

function InsertChalanDetails() {


    $.ajax({
        url: '/ChalanProcess/InsertChalanProcess',  // URL to the controller method
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            date: $('#idDatenew').val(),// For input type='date', use .val()
            componentDescription: $('#ddlComponentnew option:selected').text(), // For select, use .val() to get the selected option's value
            chalanNo: $('#idchalanNonew').val(),// For input type='text', use .val()
            quantity: $('#idQuantitynew').val(),// For input type='text', use .val()
            companyName: "NA",
            companyCode: "NA" // For select, use .val() to get the selected option's value
            // vehicleNumber: $('#ddlVehiclenew option:selected').text(),// For select, use .val() to get the selected option's value
            // vehicleChalanNumber: $('#idVehicleChalannew').val() // Use actual values from your form or application
            // ... other data matching the ChalanProcessBO structure
        }),
        success: function (response) {
            if (response.success) {
                // Handle success
                //alert(response.message);
              
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: response.message,
                    confirmButtonColor: '#28a745' // Green color
                }).then(() => {
                    window.location.reload(); // Reload page only after confirmation
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Save Error!',
                    text: response.message,
                    confirmButtonColor: 'red'
                });
                //alert(response.message);
            }
        },
        error: function (xhr, status, error) {
            // Handle AJAX error
        }
    });

}


// jQuery AJAX request
$("#SaveChalanOut").click(function () {
    if (fnValidations2()) {
        var requestData = {};
        var doneQuantity = Number($('#txtDoneQuantity').val());
        var penQuantity = Number($('#txtPenQuantity').val());

        if (doneQuantity > 0 && !isNaN(penQuantity) && doneQuantity >= 0 && doneQuantity <= penQuantity) {
            if ($('#ddlSelection option:selected').val() === "REJ") {
                requestData.f_OutMaterial_Quantity = "0",
                    requestData.f_RejectMaterial_Quantity = $("#txtDoneQuantity").val()
            } else {
                requestData.f_OutMaterial_Quantity = $("#txtDoneQuantity").val(),
                    requestData.f_RejectMaterial_Quantity = "0"
            }
            requestData.chalanProcessHdrseq = $('#HdnProcessHdeSeq').val(),
                requestData.f_ChalanDtls_Date = $("#txtDate").val(),
                requestData.f_OutChalanNo = $("#txtOutChalan").val(),
                requestData.f_Pending_Quantity = $("#txtPenQuantity").val(),




                $.ajax({
                    url: '/ChalanProcess/InsertChalanProcessDtls',
                    type: 'POST',
                    data: requestData,
                    success: function (response) {

                        //alert(response.message);
                        Swal.fire({
                            icon: 'success',
                            title: 'Saved!',
                            text: response.message,
                            confirmButtonColor: '#28a745' // Green color
                        }).then(() => {
                            window.location.reload(); // Reload page only after confirmation
                        });

                        // Handle success (e.g., show a message, redirect, etc.)
                    },
                    error: function (error) {
                        //alert(response.message);
                        Swal.fire({
                            icon: 'error',
                            title: 'Save Error!',
                            text: response.message,
                            confirmButtonColor: 'red'
                        });
                        // Handle error
                    }
                });
        } else {
            //alert("");
            Swal.fire({
                icon: 'error',
                title: 'Save Error!',
                text: 'Done Quantity should be less than equal to Total Quantity,',
                confirmButtonColor: 'red'
            });
        }
    } else {
        return false;
    }
});

function GetTotalComponentDetails() {
    $('#idTotalDtlsGrid').show();
    $.ajax({
        url: '/ChalanProcess/GetTotalComponentDetails',
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            $('#OutMaterialModal').modal('show');
            var tbody = $('#tblTotalDtls tbody');
            tbody.empty(); // Clear existing rows
            var html = "";
            $.each(data, function (index, item) {
                html += '<tr>';
                html += '<td>' + (index + 1) + '</td>';
                html += '<td>' + item.f_Component_Desc + '</td>';
                // html += '<td>' + item.MaterialInQuantity + '</td>';
                // html += '<td>' + item.MaterialOutQuantity + '</td>';
                // html += '<td>' + item.MaterialRejQuantity + '</td>';
                html += '<td>' + item.PendingQuantity + '</td>';
                html += '</tr>';
                tbody.html(html);
            });
        },
        error: function (xhr, status, error) {
            console.error('Error:', status, error);
        }
    });
}



function fnValidations1() {

    if ($('#idDatenew').val() == "") {

        //alert("Please Enter Chalan Date.");
        Swal.fire({
            icon: 'error',
            title: 'Save Error!',
            text: 'Please Enter Chalan Date.',
            confirmButtonColor: 'red'
        });
        return false;
    } else if ($('#ddlComponentnew option:selected').val() == "0") {
        
        //alert("Please select Component Name");
        Swal.fire({
            icon: 'error',
            title: 'Save Error!',
            text: 'Please select Component Name',
            confirmButtonColor: 'red'
        });
        return false;
    } else if ($('#idchalanNonew').val() == "") {

        //alert("Please select Chalan Number");
        Swal.fire({
            icon: 'error',
            title: 'Save Error!',
            text: 'Please select Chalan Number',
            confirmButtonColor: 'red'
        });
        return false;
    } else if ($('#idQuantitynew').val() == "") {
        //alert("Please select Quantity");
        Swal.fire({
            icon: 'error',
            title: 'Save Error!',
            text: 'Please select Quantity',
            confirmButtonColor: 'red'
        });
        return false;
    } else if ($('#ddlCompanynew option:selected').val() == "0") {
        //alert("Please select Company");
        Swal.fire({
            icon: 'error',
            title: 'Save Error!',
            text: 'Please select Company',
            confirmButtonColor: 'red'
        });
        return false;
    }
    else {
        return true;
    }

}

function fnValidations2() {

    if ($('#txtDate').val() == "") {

       // alert("Please Enter Chalan Out Date.");
        Swal.fire({
            icon: 'error',
            title: 'Save Error!',
            text: 'Please Enter Chalan Out Date',
            confirmButtonColor: 'red'
        });
        return false;

    } else if ($('#txtOutChalan').val() == "") {

        //alert("Please select Delivery Chalan Number");

        Swal.fire({
            icon: 'error',
            title: 'Save Error!',
            text: 'Please select Delivery Chalan Number',
            confirmButtonColor: 'red'
        });
        return false;
        // } else if ($('#idchalanNonew').val() == "") {
        //     alert("Please select Chalan Number");
        //     return false;
        // } else if ($('#txtDoneQuantity').val() == 0) {
        //     alert("Please select Done Quantity");
        //     return false;
    } else if ($('#ddlSelection option:selected').val() == 0) {

        //alert("Please select option REJ/OUT Material.");

        Swal.fire({
            icon: 'error',
            title: 'Save Error!',
            text: 'Please select option REJ/OUT Material.',
            confirmButtonColor: 'red'
        });
        return false;

    } else {
        return true;
    }

}

function Delete(btn) {
    var chalanProcessdtlseq = $(btn).attr('id');

    Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!"
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: '/ChalanProcess/DeleteDetals', // The URL to your action
                type: 'POST', // Use POST if you’re changing data on the server
                data: { chalanProcessdtlseq: chalanProcessdtlseq }, // Send chalanProcessdtlseq as a parameter
                dataType: 'json',
                success: function (data) {
                    if (data.success) {
                        Swal.fire({
                            title: "Deleted!",
                            text: "The entry has been deleted successfully.",
                            icon: "success",
                            confirmButtonColor: "#3085d6"
                        }).then(() => {
                            // Close the modal
                            $('#EmpModal').modal('hide');
                            // Reload the page
                            location.reload();
                        });
                    } else {
                        Swal.fire({
                            title: "Delete Failed",
                            text: "Delete failed: " + data.message,
                            icon: "error",
                            confirmButtonColor: "#d33"
                        });
                    }
                },
                error: function (xhr, status, error) {
                    console.error("Error: " + error);
                    Swal.fire({
                        title: "Error!",
                        text: "An error occurred while deleting the entry.",
                        icon: "error",
                        confirmButtonColor: "#d33"
                    });
                }
            });
        }
    });
}


