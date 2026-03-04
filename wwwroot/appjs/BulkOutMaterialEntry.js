$(document).ready(function () {


    $('#idChalanProcessGrid').hide();
    $('#divDate').hide();
    $('#divChalan').hide();
    $('#idSubmit').hide();

    var today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    $('#txtDate').val(today);

});


$('#ddlComponentnew').on('change', function () {
    var CompDesc = $('#ddlComponentnew option:selected').text();
    $('#idTotAmount').val("");
    $.ajax({
        url: '/BulkOutMaterialEntry/GetChalanProcessDataBasedOnComp?CompDesc=' + encodeURIComponent(CompDesc), // Ensure encoding
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            var tbody = $('#tblchalanProcess tbody');
            tbody.empty(); // Clear existing rows
            $('#idChalanProcessGrid').show();
            $('#divDate').show();
            $('#divChalan').show();

            if (data.length === 0) {
                tbody.html('<tr><td colspan="6" style="text-align:center; font-weight:bold;">No data found</td></tr>');
                $('#idSubmit').hide();
                $('#divDate').hide();
                $('#divChalan').hide();
            } else {
                var row = "";
                var totalPendingQty = 0; // Store total pending quantity

                $.each(data, function (index, item) {
                    totalPendingQty += parseFloat(item.pendingQuantity) || 0; // Summing up pending quantity

                    row += '<tr>';
                    var formattedDate = formatDate(item.date);
                    row += '<td>' + formattedDate + '</td>';
                    row += '<td>' + item.componentDescription + '</td>';
                    row += '<td><a href="javascript:void(0);" class="chalan-number-link" chalanProccessHdrSeq="' + item.chalanProccessHdrSeq + '">' + item.chalanNo + '</a></td>';
                    row += '<td>' + item.actualInMaterialQuantity + '</td>';
                    row += '<td class="pending-qty">' + item.pendingQuantity + '</td>';
                    row += '<td><input type="text" class="amount-input" name="amount" value="0" readonly/></td>'; // Readonly input for amount
                    row += '</tr>';
                });

                tbody.html(row);
                $('#idSubmit').show();

                // Attach event listener to idTotAmount for allocation logic
                $('#idTotAmount').off('input').on('input', function () {
                    var totalAmount = parseFloat($(this).val()) || 0; // Get entered total amount
                    var remainingAmount = totalAmount;

                    if (totalAmount > totalPendingQty) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Amount Exceeded!',
                            text: "Entered amount exceeds total pending quantity (" + totalPendingQty + "). Please correct the amount.",
                            confirmButtonColor: 'red'
                        });

                        //$(this).val(totalPendingQty); // Reset to maximum valid amount
                        //remainingAmount = totalPendingQty;
                        $('#idTotAmount').val("");
                        return;
                    }


                    // Reset allocation
                    $('#tblchalanProcess tbody tr').each(function () {
                        $(this).find('.amount-input').val(0);
                    });

                    // Allocate amounts row by row
                    $('#tblchalanProcess tbody tr').each(function () {
                        var pendingQty = parseFloat($(this).find('.pending-qty').text()) || 0;
                        var allocatedAmount = Math.min(remainingAmount, pendingQty); // Allocate up to pending quantity
                        $(this).find('.amount-input').val(allocatedAmount); // Set value in input
                        remainingAmount -= allocatedAmount; // Reduce remaining amount
                    });

                    // Show error if remainingAmount is not fully allocated
                    if (remainingAmount > 0) {

                        Swal.fire({
                            icon: 'error',
                            title: 'Amount Error!',
                            text: "Entered amount does not fully match the pending records",
                            confirmButtonColor: 'red'
                        });

                        return false;
                    }
                    
                });
            }
        },
        error: function (error) {
            console.error('Error fetching data: ', error);
            var tbody = $('#tblchalanProcess tbody');
            tbody.html('<tr><td colspan="6" style="text-align:center; color:red; font-weight:bold;">Error fetching data</td></tr>');
        }
    });
});


$('#idSubmit').on('click', function () {

    if ($('#txtOutChalan').val() == "") {

       Swal.fire({
            icon: 'error',
            title: 'Cannot Submit!',
            text: "Please select out chalan Number",
            confirmButtonColor: 'red'
        });

    } else {

        var chalanDate = $('#txtDate').val(); // Get Chalan Date
        var chalanNumber = $('#txtOutChalan').val(); // Get Chalan Number
        var chalanData = [];

        // Loop through table rows
        $('#tblchalanProcess tbody tr').each(function () {
            var hdrSeq = $(this).find('.chalan-number-link').attr('chalanProccessHdrSeq'); // Get hdrseq from anchor tag
            var pendingQty = $(this).find('.pending-qty').text().trim(); // Get pending quantity
            var outMaterialQty = parseFloat($(this).find('.amount-input').val().trim()) || 0; // Convert to number
            var rejectMaterialQty = "0"; // You can add logic to handle reject material if needed

            // Only add records where Out Material Quantity > 0
            if (hdrSeq && outMaterialQty > 0) {
                chalanData.push({
                    chalanProcessHdrseq: hdrSeq,
                    f_ChalanDtls_Date: chalanDate,
                    f_OutChalanNo: chalanNumber,
                    f_Pending_Quantity: pendingQty,
                    f_OutMaterial_Quantity: outMaterialQty.toString(), // Convert back to string
                    f_RejectMaterial_Quantity: rejectMaterialQty
                });
            }
        });

        // If no valid records, show alert and stop submission
        if (chalanData.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Cannot Submit!',
                text: "Please Enter Out Material Amount",
                confirmButtonColor: 'red'
            });
            return;
        }

        // Send data to C# API
        $.ajax({
            url: '/BulkOutMaterialEntry/InsertChalanProcessDtls',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(chalanData),
            success: function (response) {
                if (response.success) {
                    //alert('Data saved successfully!');
                    Swal.fire({
                        icon: 'success',
                        title: 'Saved!',
                        text: 'Data saved successfully!',
                        confirmButtonColor: '#28a745' // Correct green color
                    }).then(() => {
                        window.location.reload(); // Reload page only after confirmation
                    }); // Reload page after successful insert
                } else {
                    //alert('Error saving data!');
                    Swal.fire({
                        icon: 'error',
                        title: 'Cannot Submit!',
                        text: "Error saving data!",
                        confirmButtonColor: 'red'
                    });
                }
            },
            error: function (error) {
                console.error('Error:', error);
                //alert('An error occurred while saving data.');
                Swal.fire({
                    icon: 'error',
                    title: 'Cannot Submit!',
                    text: "An error occurred while saving data.",
                    confirmButtonColor: 'red'
                });
            }
        });
    }
});



function formatDate(dateString) {
    var date = new Date(dateString);
    var day = date.getDate().toString().padStart(2, '0');
    var month = (date.getMonth() + 1).toString().padStart(2, '0');
    var year = date.getFullYear().toString();
    return day + "-" + month + "-" + year;
}


$('#idClear').on('click', function () {
    location.href = 'BulkOutMaterialEntry';
});




