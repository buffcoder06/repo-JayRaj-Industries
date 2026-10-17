var activeDatewiseTab = 'inward';
var lastDatewiseRows = [];

$(document).ready(function () {
    setCurrentMonthDates('txtFromDate', 'txtToDate');
    runDatewiseReport();

    $('.jr-segmented[role="tablist"] .jr-segmented__btn').on('click', function () {
        $(this).addClass('is-active').siblings().removeClass('is-active');
        activeDatewiseTab = $(this).data('tab');
        runDatewiseReport();
    });

    // Changing the date range only updates the trigger label — the report
    // (table + metric strip) only re-runs when "Run report" is clicked, or
    // when switching tabs (cheap — same date range, different endpoint).
    $('#btnRunReport').on('click', runDatewiseReport);

    $('#btnDownloadPendingPdf').on('click', function () { downloadPendingModalPdf(); });
    $('#btnExportDatewiseCsv').on('click', exportDatewiseCsv);
});

function runDatewiseReport() {
    loadActiveDatewiseTab();
    loadPeriodMetrics();
}

function loadActiveDatewiseTab() {
    if (activeDatewiseTab === 'inward') loadInward();
    else if (activeDatewiseTab === 'outward') loadOutward();
    else loadRejected();
}

function loadInward() {
    $('#datewiseQtyHeader1').text('In qty');
    $('#datewiseQtyHeader2').text('');
    $('#datewiseTotalsLabel').text('Total');
    var startDate = $('#txtFromDate').val();
    var endDate = $('#txtToDate').val();

    $.ajax({
        url: '/GetDatewiseData/GetTotalInComponentDetails',
        type: 'GET',
        dataType: 'json',
        data: { startDate: startDate, endDate: endDate },
        success: function (data) {
            var rows = (data || []).map(function (item) {
                return {
                    component: item.f_Component_Desc || '',
                    qty1: parseToNumber(getFirstValue(item, ['MaterialInQuantity', 'materialInQuantity', 'f_Actual_InMaterial_Quantity'], 0)),
                    qty2: null
                };
            });
            renderDatewiseRows(rows);
        },
        error: function () { renderDatewiseError(); }
    });
}

function loadOutward() {
    $('#datewiseQtyHeader1').text('Out qty');
    $('#datewiseQtyHeader2').text('Rejected');
    $('#datewiseTotalsLabel').text('Total');
    var startDate = $('#txtFromDate').val();
    var endDate = $('#txtToDate').val();

    $.ajax({
        url: '/GetDatewiseData/GetTotalComponentDetails',
        type: 'GET',
        dataType: 'json',
        data: { startDate: startDate, endDate: endDate },
        success: function (data) {
            var rows = (data || []).map(function (item) {
                return {
                    component: item.f_Component_Desc || '',
                    qty1: parseToNumber(getFirstValue(item, ['MaterialOutQuantity', 'materialOutQuantity', 'f_OutMaterial_Quantity'], 0)),
                    qty2: parseToNumber(getFirstValue(item, ['MaterialRejQuantity', 'materialRejQuantity', 'f_RejectMaterial_Quantity'], 0))
                };
            });
            renderDatewiseRows(rows);
        },
        error: function () { renderDatewiseError(); }
    });
}

function loadRejected() {
    $('#datewiseQtyHeader1').text('Rejected qty');
    $('#datewiseQtyHeader2').text('');
    $('#datewiseTotalsLabel').text('Total');
    var startDate = $('#txtFromDate').val();
    var endDate = $('#txtToDate').val();

    $.ajax({
        url: '/GetDatewiseData/GetTotalComponentDetails',
        type: 'GET',
        dataType: 'json',
        data: { startDate: startDate, endDate: endDate },
        success: function (data) {
            var rows = (data || [])
                .map(function (item) {
                    return {
                        component: item.f_Component_Desc || '',
                        qty1: parseToNumber(getFirstValue(item, ['MaterialRejQuantity', 'materialRejQuantity', 'f_RejectMaterial_Quantity'], 0)),
                        qty2: null
                    };
                })
                .filter(function (row) { return row.qty1 > 0; });
            renderDatewiseRows(rows);
        },
        error: function () { renderDatewiseError(); }
    });
}

// The 3-cell period strip (In / Out / Net pending) is shown regardless of
// which tab is active, so it's fetched independently of the table data —
// both from the same date-range-scoped endpoints the tabs already use.
function loadPeriodMetrics() {
    var startDate = $('#txtFromDate').val();
    var endDate = $('#txtToDate').val();

    $.ajax({
        url: '/GetDatewiseData/GetTotalInComponentDetails',
        type: 'GET',
        dataType: 'json',
        data: { startDate: startDate, endDate: endDate },
        success: function (data) {
            var totalIn = (data || []).reduce(function (sum, item) {
                return sum + parseToNumber(getFirstValue(item, ['MaterialInQuantity', 'materialInQuantity', 'f_Actual_InMaterial_Quantity'], 0));
            }, 0);
            $('#statInPeriod').text(formatNumber(totalIn));
            $('#statInPeriod').data('total', totalIn);
            updateNetPending();
        },
        error: function () { $('#statInPeriod').text('—'); }
    });

    $.ajax({
        url: '/GetDatewiseData/GetTotalComponentDetails',
        type: 'GET',
        dataType: 'json',
        data: { startDate: startDate, endDate: endDate },
        success: function (data) {
            var totalOut = 0, totalRej = 0, componentCount = 0;
            (data || []).forEach(function (item) {
                var out = parseToNumber(getFirstValue(item, ['MaterialOutQuantity', 'materialOutQuantity', 'f_OutMaterial_Quantity'], 0));
                var rej = parseToNumber(getFirstValue(item, ['MaterialRejQuantity', 'materialRejQuantity', 'f_RejectMaterial_Quantity'], 0));
                totalOut += out;
                totalRej += rej;
                if (out > 0 || rej > 0) componentCount++;
            });
            $('#statOutPeriod').text(formatNumber(totalOut));
            $('#statOutPeriod').data('total', totalOut);
            $('#statOutPeriod').data('rejtotal', totalRej);
            updateNetPending();
            updatePageMeta(componentCount);
        },
        error: function () { $('#statOutPeriod').text('—'); }
    });
}

function updateNetPending() {
    var inTotal = $('#statInPeriod').data('total');
    var outTotal = $('#statOutPeriod').data('total');
    var rejTotal = $('#statOutPeriod').data('rejtotal');
    if (inTotal === undefined || outTotal === undefined || rejTotal === undefined) return;
    $('#statNetPending').text(formatNumber(inTotal - outTotal - rejTotal));
}

function updatePageMeta(componentCount) {
    var fromDisplay = JRControls.formatDisplayDate(JRControls.parseIsoDate($('#txtFromDate').val()));
    var toDisplay = JRControls.formatDisplayDate(JRControls.parseIsoDate($('#txtToDate').val()));
    var parts = [];
    if (fromDisplay && toDisplay) parts.push(fromDisplay + ' — ' + toDisplay);
    parts.push(componentCount + ' component' + (componentCount === 1 ? '' : 's') + ' with activity');
    $('#datewisePageMeta').text(parts.join(' · '));
}

function renderDatewiseRows(rows) {
    lastDatewiseRows = rows;
    var tbody = $('#tblDatewiseResults tbody');
    tbody.empty();

    if (!rows.length) {
        tbody.html('<tr><td colspan="5" class="jr-table-empty">No data for this range.</td></tr>');
        $('#datewiseTotalsRow').prop('hidden', true);
        return;
    }

    var maxQty = rows.reduce(function (m, r) { return Math.max(m, r.qty1); }, 0);
    var total1 = 0, total2 = 0;

    rows.forEach(function (row, index) {
        var pct = maxQty > 0 ? Math.round(row.qty1 / maxQty * 100) : 0;
        total1 += row.qty1;
        if (row.qty2 !== null) total2 += row.qty2;
        var $tr = $('<tr></tr>');
        $tr.append('<td class="jr-tabular">' + (index + 1) + '</td>');
        $tr.append($('<td class="jr-truncate"></td>').text(row.component));
        $tr.append('<td class="jr-text-right jr-tabular">' + formatNumber(row.qty1) + '</td>');
        // This column always renders (empty when not applicable) rather than
        // being hidden/shown per tab: a hidden <th>/<td> pair still tripped up
        // table-layout:fixed's column-width math between <thead> and <tbody>
        // in testing, throwing off every column to its right.
        $tr.append('<td class="jr-text-right jr-tabular">' + (row.qty2 !== null ? formatNumber(row.qty2) : '') + '</td>');
        $tr.append('<td><div class="jr-bar"><div class="jr-bar__fill" style="width:' + pct + '%"></div></div></td>');
        tbody.append($tr);
    });

    $('#datewiseTotal1').text(formatNumber(total1));
    $('#datewiseTotal2').text(rows[0].qty2 !== null ? formatNumber(total2) : '');
    $('#datewiseTotalsRow').prop('hidden', false);
}

function renderDatewiseError() {
    $('#tblDatewiseResults tbody').html('<tr><td colspan="5" class="jr-table-empty">Unable to load data.</td></tr>');
    $('#datewiseTotalsRow').prop('hidden', true);
    if (window.Swal) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to fetch datewise data.', confirmButtonColor: 'red' });
    }
}

function exportDatewiseCsv() {
    var headers = ['Sr', 'Component', $('#datewiseQtyHeader1').text()];
    if (!$('#datewiseQtyHeader2').text()) headers.push($('#datewiseQtyHeader2').text());

    var rows = [headers];
    lastDatewiseRows.forEach(function (row, index) {
        var line = [index + 1, row.component, row.qty1];
        if (row.qty2 !== null) line.push(row.qty2);
        rows.push(line);
    });

    var csv = rows.map(function (r) {
        return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'datewise-' + activeDatewiseTab + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function normalizeKeyName(key) {
    return String(key || '')
        .toLowerCase()
        .replace(/[\s_]/g, '')
        .replace(/^f/, '');
}

async function downloadPendingModalPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error('jsPDF library is not available.');
        return;
    }

    var tableRows = lastDatewiseRows.map(function (row, index) {
        return [String(index + 1), row.component, String(row.qty1)];
    });

    if (activeDatewiseTab !== 'pending' || tableRows.length === 0) {
        if (window.Swal) {
            Swal.fire({ icon: 'warning', title: 'No Data', text: 'Switch to the Rejected tab to download the rejected material report.' });
        }
        return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF('p', 'mm', 'a4');
    var pageWidth = doc.internal.pageSize.getWidth();
    var pageHeight = doc.internal.pageSize.getHeight();

    var logoImageData = null;
    try {
        logoImageData = await loadImageAsDataUrl('/images/jr_logo.png');
    } catch (e) {
        console.warn('Unable to load logo image for rejected PDF.', e);
    }

    if (logoImageData) {
        doc.addImage(logoImageData, 'PNG', 10, 6, 20, 20);
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(193, 18, 31);
    doc.text('JAYRAJ INDUSTRIES', 105, 14, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Rejected Material Report', 105, 21, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    var subtitle = 'Following materials rejected at Jayraj Industries';
    var subtitleY = 28;
    var subtitleX = pageWidth / 2;
    var subtitleWidth = doc.getTextWidth(subtitle);
    doc.text(subtitle, subtitleX, subtitleY, { align: 'center' });
    doc.setLineWidth(0.25);
    doc.line(subtitleX - (subtitleWidth / 2), subtitleY + 1.2, subtitleX + (subtitleWidth / 2), subtitleY + 1.2);

    var fromDateRaw = $('#txtFromDate').val() || '';
    var toDateRaw = $('#txtToDate').val() || '';
    var rangeDisplay = (fromDateRaw ? formatPdfDate(fromDateRaw) : '-') + ' to ' + (toDateRaw ? formatPdfDate(toDateRaw) : '-');
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Period: ' + rangeDisplay, pageWidth - 14, 14, { align: 'right' });

    doc.autoTable({
        startY: 38,
        head: [['Sr.No', 'Material code & Description', 'Rejected Material']],
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
        console.warn('Unable to load signature image for rejected PDF.', e);
        if (window.Swal) {
            await Swal.fire({
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

    doc.save('Rejected_Material_Report.pdf');
}

function formatPdfDate(dateText) {
    if (!dateText) return '';
    var dt = new Date(dateText + 'T00:00:00');
    if (isNaN(dt.getTime())) return dateText;
    var day = ('0' + dt.getDate()).slice(-2);
    var month = dt.toLocaleString('en-IN', { month: 'short' });
    var year = dt.getFullYear();
    return day + '-' + month + '-' + year;
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
        if (item[directKey] !== undefined && item[directKey] !== null && item[directKey] !== '') {
            return item[directKey];
        }
    }

    var expected = keys.map(function (k) { return normalizeKeyName(k); });
    for (var prop in item) {
        if (!Object.prototype.hasOwnProperty.call(item, prop)) continue;
        var normalizedProp = normalizeKeyName(prop);
        if (expected.indexOf(normalizedProp) !== -1) {
            var value = item[prop];
            if (value !== undefined && value !== null && value !== '') {
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
    if (typeof raw === 'string') {
        raw = raw.replace(/,/g, '').trim();
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
        var day = ('0' + date.getDate()).slice(-2);
        var month = ('0' + (date.getMonth() + 1)).slice(-2);
        return date.getFullYear() + '-' + month + '-' + day;
    };

    document.getElementById(fromDateId).value = formatDate(firstDay);
    document.getElementById(fromDateId).dispatchEvent(new Event('change'));
    document.getElementById(toDateId).value = formatDate(lastDay);
    document.getElementById(toDateId).dispatchEvent(new Event('change'));
}
