
$(document).ready(function () {
    setCurrentMonthDates("txtFromDate", "txtToDate");
});
$('#idShowOutData').on('click', function () {

    var startDate = $('#txtFromDate').val();
    var endDate = $('#txtToDate').val();

    GetTotalComponentDetails(startDate, endDate);
})

$('#idShowInData').on('click', function () {

    var startDate = $('#txtFromDate').val();
    var endDate = $('#txtToDate').val();

    GetTotalInComponentDetails(startDate, endDate);

})

function GetTotalComponentDetails(startDate, endDate) {
    //$('#idTotalDtlsGrid').show();
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
                // html += '<td>' + item.MaterialInQuantity.toLocaleString() + '</td>';
                var outQty = getFirstValue(item, ['MaterialOutQuantity', 'materialOutQuantity', 'f_OutMaterial_Quantity'], 0);
                html += '<td>' + formatNumber(outQty) + '</td>'; 
                var rejQty = getFirstValue(item, ['MaterialRejQuantity', 'materialRejQuantity', 'f_RejectMaterial_Quantity'], 0);
                html += '<td>' + formatNumber(rejQty) + '</td>'; 
                // html += '<td>' + item.PendingQuantity.toLocaleString() + '</td>';
                html += '</tr>';
            });
            tbody.html(html); // Insert the new rows
        },
        error: function (xhr, status, error) {
            console.error('Error:', status, error);
            if (window.showToast) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error!',
                    text: 'Failed to fetch out material data: ' + error,
                    confirmButtonColor: 'red'
                });
            }
        }
    });
}

$('#btnShowPenData').on('click', function () {
    var startDate = $('#txtFromDate').val();
    var endDate = $('#txtToDate').val();

    GetTotalPenComponentDetails(startDate, endDate);
});

$('#btnDownloadPendingPdf').on('click', function () {
    downloadPendingModalPdf();
});

function GetTotalPenComponentDetails(startDate, endDate) {
    $('#idTotalDtlsGrid').show();

    var outReq = $.ajax({
        url: '/GetDatewiseData/GetTotalComponentDetails',
        type: 'GET',
        dataType: 'json',
        data: {
            startDate: startDate,
            endDate: endDate
        }
    });

    var inReq = $.ajax({
        url: '/GetDatewiseData/GetTotalInComponentDetails',
        type: 'GET',
        dataType: 'json',
        data: {
            startDate: startDate,
            endDate: endDate
        }
    });

    $.when(outReq, inReq).done(function (outRes, inRes) {
        var outData = outRes[0] || [];
        var inData = inRes[0] || [];

        var map = {};

        $.each(inData, function (_, item) {
            var component = (item.f_Component_Desc || '').toString().trim();
            if (!component) return;
            var key = component.toLowerCase();
            if (!map[key]) {
                map[key] = { component: component, inQty: 0, outQty: 0, rejQty: 0 };
            }
            map[key].inQty += parseToNumber(getFirstValue(item, ['MaterialInQuantity', 'materialInQuantity', 'f_Actual_InMaterial_Quantity'], 0));
        });

        $.each(outData, function (_, item) {
            var component = (item.f_Component_Desc || '').toString().trim();
            if (!component) return;
            var key = component.toLowerCase();
            if (!map[key]) {
                map[key] = { component: component, inQty: 0, outQty: 0, rejQty: 0 };
            }
            map[key].outQty += parseToNumber(getFirstValue(item, ['MaterialOutQuantity', 'materialOutQuantity', 'f_OutMaterial_Quantity'], 0));
            map[key].rejQty += parseToNumber(getFirstValue(item, ['MaterialRejQuantity', 'materialRejQuantity', 'f_RejectMaterial_Quantity'], 0));
        });

        var rows = Object.keys(map).map(function (k) {
            var r = map[k];
            return {
                component: r.component,
                pendingQty: Math.max(0, r.inQty - r.outQty - r.rejQty)
            };
        });

        rows.sort(function (a, b) {
            return a.component.localeCompare(b.component);
        });

        $('#PenMaterialModal').modal('show');
        var tbody = $('#tblTotalPenDtls tbody');
        tbody.empty();

        var html = "";
        $.each(rows, function (index, row) {
            html += '<tr>';
            html += '<td>' + (index + 1) + '</td>';
            html += '<td>' + row.component + '</td>';
            html += '<td>' + formatNumber(row.pendingQty) + '</td>';
            html += '</tr>';
        });

        tbody.html(html);
    }).fail(function (xhr, status, error) {
        console.error('Error:', status, error);
    });
}

function GetTotalInComponentDetails(startDate, endDate) {
    //$('#idTotalDtlsGrid').show();
    $.ajax({
        url: '/GetDatewiseData/GetTotalInComponentDetails',
        type: 'GET',
        dataType: 'json',
        data: {
            startDate: startDate,  // Pass startDate as a query parameter
            endDate: endDate       // Pass endDate as a query parameter
        },
        success: function (data) {
            $('#InMaterialModal').modal('show');
            var tbody = $('#tblTotalInDtls tbody');
            tbody.empty(); // Clear existing rows
            var html = "";
            $.each(data, function (index, item) {
                html += '<tr>';
                html += '<td>' + (index + 1) + '</td>';
                html += '<td>' + item.f_Component_Desc + '</td>';
                // html += '<td>' + item.MaterialInQuantity.toLocaleString() + '</td>';
                var inQty = getFirstValue(item, ['MaterialInQuantity', 'materialInQuantity', 'f_Actual_InMaterial_Quantity'], 0);
                html += '<td>' + formatNumber(inQty) + '</td>'; 
                //html += '<td>' + item.MaterialRejQuantity.toLocaleString() + '</td>';
                // html += '<td>' + item.PendingQuantity.toLocaleString() + '</td>';
                html += '</tr>';
            });
            tbody.html(html); // Insert the new rows
        },
        error: function (xhr, status, error) {
            console.error('Error:', status, error);
            if (window.showToast) {
                window.showToast("Failed to fetch in material data: " + error, { type: 'error' });
            }
        }
    });
}

function normalizeKeyName(key) {
    return String(key || "")
        .toLowerCase()
        .replace(/[\s_]/g, "")
        .replace(/^f/, "");
}

function downloadPendingModalPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF library is not available.");
        return;
    }

    var tableRows = [];
    $('#tblTotalPenDtls tbody tr').each(function () {
        var cells = $(this).find('td');
        if (cells.length >= 3) {
            tableRows.push([
                $(cells[0]).text().trim(),
                $(cells[1]).text().trim(),
                $(cells[2]).text().trim()
            ]);
        }
    });

    if (tableRows.length === 0) {
        if (window.Swal && typeof window.Swal.fire === "function") {
            window.Swal.fire({ icon: "warning", title: "No Data", text: "No pending material data to download." });
        }
        return;
    }

    var fromDate = $('#txtFromDate').val() || '';
    var toDate = $('#txtToDate').val() || '';
    var formattedFromDate = formatPdfDate(fromDate);
    var formattedToDate = formatPdfDate(toDate);

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF('p', 'mm', 'a4');
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('JAYRAJ INDUSTRIES', 105, 14, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Pending Material Report', 105, 21, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text('Date Range: ' + formattedFromDate + ' to ' + formattedToDate, 14, 28);

    doc.autoTable({
        startY: 32,
        head: [['Sr.No', 'Material code & Description', 'Pending Material']],
        body: tableRows,
        theme: 'grid',
        styles: { font: 'times', fontSize: 10, cellPadding: 2.5, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
        bodyStyles: { textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
        columnStyles: {
            0: { halign: 'center', cellWidth: 18 },
            1: { halign: 'left', cellWidth: 120 },
            2: { halign: 'center', cellWidth: 40 }
        }
    });

    var fileFrom = fromDate || 'from';
    var fileTo = toDate || 'to';
    doc.save('Pending_Material_' + fileFrom + '_to_' + fileTo + '.pdf');
}

function formatPdfDate(dateText) {
    if (!dateText) return '';
    var dt = new Date(dateText + "T00:00:00");
    if (isNaN(dt.getTime())) return dateText;
    var day = ("0" + dt.getDate()).slice(-2);
    var month = dt.toLocaleString("en-IN", { month: "short" });
    var year = dt.getFullYear();
    return day + "-" + month + "-" + year;
}

function getFirstValue(item, keys, defaultValue) {
    if (!item) return defaultValue;

    for (var i = 0; i < keys.length; i++) {
        var directKey = keys[i];
        if (item[directKey] !== undefined && item[directKey] !== null && item[directKey] !== "") {
            return item[directKey];
        }
    }

    var expected = keys.map(function (k) { return normalizeKeyName(k); });
    for (var prop in item) {
        if (!Object.prototype.hasOwnProperty.call(item, prop)) continue;
        var normalizedProp = normalizeKeyName(prop);
        if (expected.indexOf(normalizedProp) !== -1) {
            var value = item[prop];
            if (value !== undefined && value !== null && value !== "") {
                return value;
            }
        }
    }

    return defaultValue;
}

function formatNumber(value) {
    var n = parseToNumber(value);
    return n.toLocaleString();
}

function parseToNumber(value) {
    var raw = value;
    if (typeof raw === "string") {
        raw = raw.replace(/,/g, "").trim();
    }
    var n = Number(raw);
    if (!isFinite(n)) n = 0;
    return n;
}
function setCurrentMonthDates(fromDateId, toDateId) {
    var today = new Date();

    var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    var lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    var formatDate = function (date) {
        var day = ("0" + date.getDate()).slice(-2);
        var month = ("0" + (date.getMonth() + 1)).slice(-2);
        return date.getFullYear() + "-" + month + "-" + day;
    };

    $("#" + fromDateId).val(formatDate(firstDay));
    $("#" + toDateId).val(formatDate(lastDay));
}


