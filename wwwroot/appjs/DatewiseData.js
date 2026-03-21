
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
    GetTotalPenComponentDetails();
});

$('#btnDownloadPendingPdf').on('click', function () {
    downloadPendingModalPdf();
});

function GetTotalPenComponentDetails() {
    $('#idTotalDtlsGrid').show();

    $.ajax({
        url: '/GetDatewiseData/GetTotalComponentDetails',
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            var rows = [];
            $.each(data || [], function (_, item) {
                var component = (item.f_Component_Desc || '').toString().trim();
                if (!component) return;

                rows.push({
                    component: component,
                    pendingQty: parseToNumber(getFirstValue(item, ['PendingMaterialQuantity', 'PendingQuantity', 'pendingQuantity', 'f_Pending_Quantity'], 0))
                });
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
        },
        error: function (xhr, status, error) {
            console.error('Error:', status, error);
            if (window.Swal && typeof window.Swal.fire === "function") {
                window.Swal.fire({ icon: "error", title: "Error", text: "Failed to fetch pending material data." });
            }
        }
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

async function downloadPendingModalPdf() {
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

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF('p', 'mm', 'a4');
    var pageWidth = doc.internal.pageSize.getWidth();
    var pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(193, 18, 31);
    doc.text('JAYRAJ INDUSTRIES', 105, 14, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Pending Material Report', 105, 21, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    var subtitle = 'Following materials pending in Jayraj Industries';
    var subtitleY = 28;
    var subtitleX = pageWidth / 2;
    var subtitleWidth = doc.getTextWidth(subtitle);
    doc.text(subtitle, subtitleX, subtitleY, { align: 'center' });
    doc.setLineWidth(0.25);
    doc.line(subtitleX - (subtitleWidth / 2), subtitleY + 1.2, subtitleX + (subtitleWidth / 2), subtitleY + 1.2);

    var toDateRaw = $('#txtToDate').val() || '';
    var toDateDisplay = toDateRaw ? formatPdfDate(toDateRaw) : '-';
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Date: ' + toDateDisplay, pageWidth - 14, 14, { align: 'right' });

    doc.autoTable({
        startY: 38,
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

    var finalY = doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : 32;
    var signHeaderY = Math.min(finalY + 12, pageHeight - 34);
    var signImageY = Math.min(signHeaderY + 4, pageHeight - 30);
    var signNameY = Math.min(signImageY + 22, pageHeight - 10);
    var signRoleY = Math.min(signNameY + 5, pageHeight - 4);
    var rightMarginX = pageWidth - 14;
    var signImageWidth = 42;
    var signImageHeight = 16;
    var signImageX = rightMarginX - signImageWidth;
    var signTextX = signImageX + 1;
    var signImageData = null;

    try {
        signImageData = await loadImageAsDataUrl('/images/abhi_dada-sign-original.png');
    } catch (e) {
        console.warn('Unable to load signature image for pending PDF.', e);
        if (window.Swal && typeof window.Swal.fire === "function") {
            await window.Swal.fire({
                icon: 'warning',
                title: 'Signature Not Loaded',
                text: 'Signature image could not be loaded. PDF will be generated without it.',
                confirmButtonColor: '#f0a500'
            });
        }
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(193, 18, 31);
    doc.text('For JAYRAJ INDUSTRIES', signTextX, signHeaderY, { align: 'left' });
    doc.setTextColor(0, 0, 0);

    if (signImageData) {
        doc.addImage(signImageData, 'PNG', signImageX, signImageY, signImageWidth, signImageHeight);
    }

    doc.setFontSize(9);
    doc.text('( Abhishek R. Desale )', signTextX, signNameY, { align: 'left' });
    doc.setFont('times', 'normal');
    doc.text('Authorised Signatory', signTextX, signRoleY, { align: 'left' });

    doc.save('Pending_Material_All_Dates.pdf');
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

function loadImageAsDataUrl(src) {
    return new Promise(function (resolve, reject) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
            try {
                var canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = function (err) { reject(err); };
        img.src = src;
    });
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


