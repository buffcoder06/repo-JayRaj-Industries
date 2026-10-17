var gridDataCache = [];
var chalanDetailsCache = {};
var activeDetailsRequest = null;
var activeTab = 'open';
var openDockedHdrSeq = null;
var monthLabelText = '';
var currentPage = 1;
var PAGE_SIZE = 7;

$(document).ready(function () {
    loadCurrentMonthLabel();
    loadGridData();

    $('#componentSearch, #chalanGlobalSearch').on('input change', debounce(resetPageAndRender, 120));
    $('#chalanDateFrom, #chalanDateTo').on('change', resetPageAndRender);

    $('.jr-segmented[role="tablist"] .jr-segmented__btn').on('click', function () {
        $(this).addClass('is-active').siblings().removeClass('is-active');
        activeTab = $(this).data('tab');
        resetPageAndRender();
    });

    $('#chalanPagePrev').on('click', function () {
        if (currentPage > 1) { currentPage--; renderGrid(); }
    });
    $('#chalanPageNext').on('click', function () {
        currentPage++; renderGrid();
    });

    $('#btnHeaderNewChalan').on('click', function () {
        closeDockedPanel();
        var dateInput = document.getElementById('idDatenew');
        if (!dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
            dateInput.dispatchEvent(new Event('change'));
        }
        $('#idChalanNew').prop('hidden', false)[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('#btnCancelNewChalan').on('click', function () {
        $('#idChalanNew').prop('hidden', true);
    });

    $('#btnExportCsv').on('click', exportVisibleRowsToCsv);

    $('#SaveChalanStatus').on('click', function () {
        if (fnValidations1()) InsertChalanDetails();
    });

    // Record out → entry form only; chalan number (or View on closed rows)
    // → previous out entries with Delete.
    $('#tblchalanProcess tbody').on('click', '.chalan-number-link, .jr-row-action', function (e) {
        e.preventDefault();
        var hdrSeq = $(this).closest('tr').data('hdrseq');
        var mode = $(this).data('mode') === 'record' ? 'record' : 'history';
        toggleDockedPanel(String(hdrSeq), mode);
    });
});

function debounce(fn, wait) {
    var timer = null;
    return function () {
        var ctx = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
}

function toNumber(value) {
    var n = Number(value);
    return isFinite(n) ? n : 0;
}

function formatNumber(value) {
    var n = toNumber(value);
    if (Math.floor(n) === n) return n.toLocaleString('en-IN');
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
    var date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    var day = date.getDate().toString().padStart(2, '0');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return day + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
}

function loadCurrentMonthLabel() {
    $.ajax({
        url: '/ChalanProcess/GetCurrentMonthSummary',
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            monthLabelText = (data && data.monthLabel) || '';
            updateHeaderMeta();
        }
    });
}

function updateHeaderMeta() {
    var openCount = 0, totalPending = 0;
    gridDataCache.forEach(function (it) {
        if (toNumber(it.pendingQuantity) !== 0) openCount++;
        totalPending += toNumber(it.pendingQuantity);
    });
    var parts = [];
    if (monthLabelText) parts.push(monthLabelText);
    parts.push(openCount + ' open chalan' + (openCount === 1 ? '' : 's'));
    parts.push(formatNumber(totalPending) + ' Nos pending');
    parts.push('synced just now');
    $('#chalanPageMeta').text(parts.join(' · '));
}

function loadGridData() {
    $.ajax({
        url: '/ChalanProcess/GetAllChalanProcessData?chalanProcessHdrseq=',
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            if (!Array.isArray(data)) {
                Swal.fire({ icon: 'error', title: 'Load Error', text: (data && data.message) || 'Unable to load chalan process data.', confirmButtonColor: 'red' });
                return;
            }
            gridDataCache = data;
            updateHeaderMeta();
            updateKpis();
            renderGrid();
        },
        error: function () {
            Swal.fire({ icon: 'error', title: 'Load Error', text: 'Unable to load chalan process data.', confirmButtonColor: 'red' });
        }
    });
}

function updateKpis() {
    var totalIn = 0, totalOut = 0, totalPending = 0, totalRej = 0, openCount = 0;
    gridDataCache.forEach(function (it) {
        totalIn += toNumber(it.actualInMaterialQuantity);
        totalOut += toNumber(it.outMaterialQuantity);
        totalPending += toNumber(it.pendingQuantity);
        totalRej += toNumber(it.rejectMaterialQuantity);
        if (toNumber(it.pendingQuantity) !== 0) openCount++;
    });

    $('#kpiIncoming').text(formatNumber(totalIn));
    $('#kpiOut').text(formatNumber(totalOut));
    $('#kpiOutPct').text(totalIn > 0 ? (totalOut / totalIn * 100).toFixed(1) + '%' : '');
    $('#kpiPending').text(formatNumber(totalPending));
    $('#kpiPendingTrack').css('width', (totalIn > 0 ? Math.min(100, totalPending / totalIn * 100) : 0) + '%');
    $('#kpiPendingQualifier').text('across ' + openCount + ' chalan' + (openCount === 1 ? '' : 's'));
    $('#kpiRejected').text(formatNumber(totalRej));
    $('#kpiRejectedPct').text(totalIn > 0 ? (totalRej / totalIn * 100).toFixed(2) + '%' : '');
}

function rowStatus(item) {
    var pending = toNumber(item.pendingQuantity);
    var inQty = toNumber(item.actualInMaterialQuantity);
    var out = toNumber(item.outMaterialQuantity);
    var rej = toNumber(item.rejectMaterialQuantity);

    if (pending === 0) {
        return { tab: 'closed', cls: 'jr-pill--closed', label: 'Closed' };
    }
    if (out === 0 && rej === 0) {
        var days = 0;
        var d = new Date(item.date);
        if (!isNaN(d.getTime())) days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
        return { tab: 'open', cls: 'jr-pill--stalled', label: 'Nothing out · ' + days + ' days' };
    }
    var pct = inQty > 0 ? Math.round(pending / inQty * 100) : 0;
    return { tab: 'open', cls: 'jr-pill--pending', label: pct + '% pending' };
}

function resetPageAndRender() {
    currentPage = 1;
    renderGrid();
}

function renderGrid() {
    closeDockedPanel();
    var compQ = ($('#componentSearch').val() || '').toLowerCase();
    var searchQ = ($('#chalanGlobalSearch').val() || '').trim().toLowerCase();
    var fromVal = $('#chalanDateFrom').val();
    var toVal = $('#chalanDateTo').val();
    var fromDate = fromVal ? new Date(fromVal) : null;
    var toDate = toVal ? new Date(toVal) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    $('#tabOpenCount').text(gridDataCache.filter(function (it) { return toNumber(it.pendingQuantity) !== 0; }).length);
    $('#tabClosedCount').text(gridDataCache.filter(function (it) { return toNumber(it.pendingQuantity) === 0; }).length);

    var filtered = gridDataCache.filter(function (it) {
        var status = rowStatus(it);
        if (activeTab !== 'all' && status.tab !== activeTab) return false;
        if (compQ && String(it.componentDescription || '').toLowerCase().indexOf(compQ) === -1) return false;
        if (searchQ) {
            var hay = (String(it.chalanNo || '') + ' ' + String(it.componentDescription || '')).toLowerCase();
            if (hay.indexOf(searchQ) === -1) return false;
        }
        if (fromDate || toDate) {
            var d = new Date(it.date);
            if (isNaN(d.getTime())) return false;
            if (fromDate && d < fromDate) return false;
            if (toDate && d > toDate) return false;
        }
        return true;
    });

    var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var pageStart = (currentPage - 1) * PAGE_SIZE;
    var pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

    var tbody = $('#tblchalanProcess tbody');
    tbody.empty();

    if (filtered.length === 0) {
        tbody.html('<tr><td colspan="8" class="jr-table-empty">No chalans match the current filters.</td></tr>');
    } else {
        pageItems.forEach(function (item) {
            tbody.append(buildRow(item));
        });
    }

    $('#chalanRowCount').text(filtered.length + ' of ' + gridDataCache.length + ' rows');

    if (filtered.length === 0) {
        $('#chalanPageSummary').text('');
    } else {
        $('#chalanPageSummary').text('Showing ' + (pageStart + 1) + '–' + Math.min(pageStart + PAGE_SIZE, filtered.length) + ' of ' + filtered.length);
    }
    $('#chalanPageIndicator').text('Page ' + currentPage + ' of ' + totalPages);
    $('#chalanPagePrev').prop('disabled', currentPage <= 1);
    $('#chalanPageNext').prop('disabled', currentPage >= totalPages);
}

function buildRow(item) {
    var status = rowStatus(item);
    var actionHtml = status.tab === 'open'
        ? '<button type="button" class="jr-row-btn jr-row-btn--bordered jr-row-action" data-mode="record">Record out</button>'
        : '<button type="button" class="jr-row-btn jr-row-btn--borderless jr-row-action">View</button>';

    var inQty = toNumber(item.actualInMaterialQuantity);
    var pendingQty = toNumber(item.pendingQuantity);
    var pendingPct = inQty > 0 ? Math.min(100, pendingQty / inQty * 100) : 0;
    var pendingBarCls = status.tab === 'closed' ? '' : (status.cls === 'jr-pill--stalled' ? 'jr-mini-bar__fill--danger' : 'jr-mini-bar__fill--warning');

    var $tr = $('<tr></tr>').data('hdrseq', item.chalanProcessHdrSeq).data('item', item);
    $tr.append('<td>' + formatDate(item.date) + '</td>');
    $tr.append($('<td class="jr-truncate"></td>').text(item.componentDescription || ''));
    $tr.append('<td><a href="javascript:void(0)" class="jr-link chalan-number-link">' + escapeHtml(item.chalanNo) + '</a></td>');
    $tr.append('<td class="jr-text-right jr-tabular">' + formatNumber(inQty) + '</td>');
    $tr.append('<td class="jr-text-right jr-tabular ' + (toNumber(item.outMaterialQuantity) > 0 ? '' : 'jr-cell-muted') + '">' + formatNumber(item.outMaterialQuantity) + '</td>');
    $tr.append('<td class="jr-text-right jr-tabular"><span class="jr-mini-bar-cell">' +
        (pendingQty > 0 ? '<span class="jr-mini-bar"><span class="jr-mini-bar__fill ' + pendingBarCls + '" style="width:' + pendingPct + '%"></span></span>' : '') +
        '<span class="' + (pendingQty > 0 ? 'jr-cell-strong' : 'jr-cell-muted') + '">' + formatNumber(pendingQty) + '</span></span></td>');
    $tr.append('<td><span class="jr-pill ' + status.cls + '"><span class="jr-pill__dot"></span>' + status.label + '</span></td>');
    $tr.append('<td class="jr-text-right">' + actionHtml + '</td>');
    return $tr;
}

function escapeHtml(value) {
    return $('<div>').text(value || '').html();
}

function exportVisibleRowsToCsv() {
    var rows = [['Date', 'Component', 'Chalan No', 'Qty In', 'Pending', 'Status']];
    $('#tblchalanProcess tbody tr').each(function () {
        var item = $(this).data('item');
        if (!item) return;
        var status = rowStatus(item);
        rows.push([formatDate(item.date), item.componentDescription, item.chalanNo, item.actualInMaterialQuantity, item.pendingQuantity, status.label]);
    });
    var csv = rows.map(function (r) {
        return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'chalan-process.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------
// Chalan popups: "record" = Record out material form,
// "history" = previous out entries on the chalan (with Delete).
// ---------------------------------------------------------------------
var openDockedMode = null;

function toggleDockedPanel(hdrSeq, mode) {
    if (openDockedHdrSeq === hdrSeq && openDockedMode === mode) {
        closeDockedPanel();
        return;
    }
    openDockedPanel(hdrSeq, mode);
}

function closeDockedPanel() {
    var $backdrop = $('.jr-modal-backdrop');
    $(document).off('keydown.jrDockedModal');
    openDockedHdrSeq = null;
    openDockedMode = null;
    if (!$backdrop.length) return;
    $backdrop.removeClass('is-open');
    setTimeout(function () { $backdrop.remove(); }, 200);
}

function openDockedPanel(hdrSeq, mode) {
    $('#idChalanNew').prop('hidden', true);
    $('.jr-modal-backdrop').remove();
    $(document).off('keydown.jrDockedModal');

    var item = gridDataCache.find(function (it) { return String(it.chalanProcessHdrSeq) === hdrSeq; });
    if (!item) return;

    var status = rowStatus(item);
    // Nothing left to record on a closed chalan — show its entries instead.
    if (mode === 'record' && status.tab !== 'open') mode = 'history';
    var isRecord = mode === 'record';
    openDockedHdrSeq = hdrSeq;
    openDockedMode = mode;

    var today = new Date().toISOString().split('T')[0];

    var headerHtml = '<div class="jr-docked__header">' +
        '<div><span class="jr-docked__title">' + (isRecord ? 'Record out material' : 'Out entries') + '</span>' +
        '<span class="jr-docked__subtitle">Chalan ' + escapeHtml(item.chalanNo) + ' · ' + escapeHtml(item.componentDescription) + '</span></div>' +
        '<div class="jr-docked__actions">' +
        '<button type="button" class="jr-modal__close" id="dockedClose" aria-label="Close" title="Close">' +
        '<svg viewBox="0 0 24 24"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.7 2.89 18.3 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.29-6.3z"/></svg>' +
        '</button>' +
        '</div></div>';

    var bodyHtml;
    if (isRecord) {
        bodyHtml = '<div class="jr-docked__body">' +
            '<div class="jr-field" data-field="date"><label class="jr-field__label">Date<span class="jr-field__required">*</span></label>' +
            '<div class="jr-daterange" data-jr-daterange><input type="hidden" data-jr-role="start" id="dockedDate" value="' + today + '" />' +
            '<button type="button" class="jr-daterange__trigger"><svg viewBox="0 0 24 24"><path d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2z"/><path d="M21 10H3v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/></svg><span class="jr-daterange__label jr-tabular"></span></button>' +
            '<div class="jr-daterange__panel" hidden></div></div><div class="jr-field__error"></div></div>' +
            '<div class="jr-field" data-field="outChalan"><label class="jr-field__label" for="dockedOutChalan">Out chalan no<span class="jr-field__required">*</span></label>' +
            '<input type="text" class="jr-input" id="dockedOutChalan" placeholder="e.g. 3391" autocomplete="off" inputmode="numeric" data-jr-digits /><div class="jr-field__error"></div></div>' +
            '<div class="jr-field"><label class="jr-field__label">Movement<span class="jr-field__required">*</span></label>' +
            '<div class="jr-toggle"><button type="button" class="jr-toggle__btn is-active" data-move="APR">Out material</button>' +
            '<button type="button" class="jr-toggle__btn" data-move="REJ">Rejected</button></div></div>' +
            '<div class="jr-field" data-field="qty"><label class="jr-field__label" for="dockedQty">Quantity<span class="jr-field__required">*</span></label>' +
            '<input type="number" class="jr-input" id="dockedQty" min="0" value="0" /><div class="jr-field__error"></div></div>' +
            '<div class="jr-docked__hint jr-tabular" id="dockedBalanceLabel">' + formatNumber(item.pendingQuantity) + ' Nos will remain pending</div>' +
            '</div>' +
            '<div class="jr-docked__save-row">' +
            '<button type="button" class="jr-btn jr-btn--accent jr-btn--sm" id="dockedSaveEntry">Save entry</button>' +
            '<button type="button" class="jr-btn jr-btn--ghost jr-btn--sm" id="dockedSaveAnother">Save &amp; add another</button>' +
            '<button type="button" class="jr-btn jr-btn--text jr-btn--sm" id="dockedCancel">Cancel</button>' +
            '</div>';
    } else {
        bodyHtml = '<div class="jr-docked__history jr-docked__history--full">' +
            '<div class="jr-table-wrap"><table class="jr-table" id="tblDockedHistory"><thead><tr>' +
            '<th>Date</th><th>Out chalan</th><th class="jr-text-right">Out</th><th class="jr-text-right">Rejected</th><th class="jr-text-right">Balance</th><th></th>' +
            '</tr></thead><tbody></tbody></table></div></div>';
    }

    var $backdrop = $('<div class="jr-modal-backdrop"></div>');
    var $modal = $('<div class="jr-modal' + (isRecord ? '' : ' jr-modal--narrow') + '" role="dialog" aria-modal="true"></div>');
    $modal.html(headerHtml + bodyHtml);
    $backdrop.append($modal);
    $('body').append($backdrop);
    var $docked = $modal;

    // Insert in its pre-transition state first, then flip to .is-open on the
    // next frame so the CSS transition actually animates in (adding the class
    // in the same tick as the insert would skip straight to the end state).
    requestAnimationFrame(function () {
        requestAnimationFrame(function () { $backdrop.addClass('is-open'); });
    });

    $backdrop.on('mousedown', function (e) {
        if (e.target === $backdrop[0]) closeDockedPanel();
    });
    $(document).on('keydown.jrDockedModal', function (e) {
        if (e.key === 'Escape') closeDockedPanel();
    });

    $docked.find('#dockedCancel, #dockedClose').on('click', closeDockedPanel);

    if (!isRecord) {
        loadDockedHistory(hdrSeq);
        return;
    }

    JRControls.initAll($docked[0]);
    setTimeout(function () { $docked.find('#dockedOutChalan').trigger('focus'); }, 220);

    function setFieldError(name, message) {
        var $field = $docked.find('[data-field="' + name + '"]');
        $field.toggleClass('is-invalid', !!message);
        $field.find('.jr-field__error').text(message || '');
    }
    $docked.find('#dockedOutChalan').on('input', function () { setFieldError('outChalan', ''); });
    $docked.find('#dockedQty').on('input', function () { setFieldError('qty', ''); });

    $docked.find('.jr-toggle__btn').on('click', function () {
        $(this).addClass('is-active').siblings().removeClass('is-active');
    });

    // Kept as one mutually-exclusive Quantity + Movement toggle rather than
    // simultaneous Qty-out/Rejected fields: sp_Deactivate_Records only
    // reverses whichever of the two is nonzero on delete, so a row with both
    // set would silently corrupt the header's pending quantity on delete.
    function currentRemaining() {
        var qty = toNumber($docked.find('#dockedQty').val());
        return Math.max(0, toNumber(item.pendingQuantity) - qty);
    }
    $docked.find('#dockedQty').on('input', function () {
        $docked.find('#dockedBalanceLabel').text(formatNumber(currentRemaining()) + ' Nos will remain pending');
    });

    function saveDockedEntry(keepOpen) {
        var qty = toNumber($docked.find('#dockedQty').val());
        var pending = toNumber(item.pendingQuantity);
        var dateVal = $docked.find('#dockedDate').val();
        var outChalanVal = $.trim($docked.find('#dockedOutChalan').val());
        var movement = $docked.find('.jr-toggle__btn.is-active').data('move');

        setFieldError('date', dateVal ? '' : 'Pick the out date.');
        setFieldError('outChalan', outChalanVal ? '' : 'Enter the out chalan number.');
        setFieldError('qty', (qty > 0 && qty <= pending) ? '' :
            (qty > pending ? 'Only ' + formatNumber(pending) + ' Nos are pending.' : 'Enter a quantity above 0.'));
        var $firstInvalid = $docked.find('.jr-field.is-invalid').first();
        if ($firstInvalid.length) {
            $firstInvalid.find('input:not([type=hidden]), button').first().trigger('focus');
            return;
        }

        var requestData = {
            chalanProcessHdrSeq: hdrSeq,
            detailDate: dateVal,
            outChalanNo: outChalanVal,
            pendingQuantity: pending,
            outMaterialQuantity: movement === 'REJ' ? 0 : qty,
            rejectMaterialQuantity: movement === 'REJ' ? qty : 0
        };

        $.ajax({
            url: '/ChalanProcess/InsertChalanProcessDtls',
            type: 'POST',
            data: requestData,
            success: function (response) {
                if (!response || !response.success) {
                    Swal.fire({ icon: 'error', title: 'Save Error!', text: (response && response.message) || 'Unable to save record', confirmButtonColor: 'red' });
                    return;
                }
                refreshChalanRow(hdrSeq, function (freshItem) {
                    if (keepOpen && freshItem && toNumber(freshItem.pendingQuantity) > 0) {
                        openDockedPanel(hdrSeq, 'record');
                    } else {
                        closeDockedPanel();
                    }
                });
            },
            error: function () {
                Swal.fire({ icon: 'error', title: 'Save Error!', text: 'Unable to save record', confirmButtonColor: 'red' });
            }
        });
    }

    $docked.find('#dockedSaveEntry').on('click', function () { saveDockedEntry(false); });
    $docked.find('#dockedSaveAnother').on('click', function () { saveDockedEntry(true); });
    $docked.find('#dockedOutChalan, #dockedQty').on('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); saveDockedEntry(false); }
    });
}

function refreshChalanRow(hdrSeq, callback) {
    $.ajax({
        url: '/ChalanProcess/GetAllChalanProcessData',
        type: 'GET',
        data: { chalanProcessHdrseq: hdrSeq },
        dataType: 'json',
        success: function (data) {
            var fresh = Array.isArray(data) && data.length > 0 ? data[0] : null;
            if (fresh) {
                var idx = gridDataCache.findIndex(function (it) { return String(it.chalanProcessHdrSeq) === String(hdrSeq); });
                if (idx !== -1) gridDataCache[idx] = fresh;
            }
            updateHeaderMeta();
            updateKpis();
            renderGrid();
            if (callback) callback(fresh);
        }
    });
}

function loadDockedHistory(hdrSeq) {
    var $tbody = $('#tblDockedHistory tbody');
    $tbody.html('<tr><td colspan="6" class="jr-table-empty">Loading…</td></tr>');

    if (activeDetailsRequest && activeDetailsRequest.readyState !== 4) activeDetailsRequest.abort();

    activeDetailsRequest = $.ajax({
        url: '/ChalanProcess/GetAllChalanProcessDetails',
        type: 'GET',
        data: { chalanProcessHdrseq: hdrSeq },
        dataType: 'json',
        success: function (data) {
            if (!Array.isArray(data)) {
                $tbody.html('<tr><td colspan="6" class="jr-table-empty">Unable to load previous entries.</td></tr>');
                return;
            }
            chalanDetailsCache[hdrSeq] = data;
            renderDockedHistory(data);
        },
        error: function (xhr) {
            if (xhr && xhr.statusText === 'abort') return;
            $tbody.html('<tr><td colspan="6" class="jr-table-empty">Unable to load previous entries.</td></tr>');
        }
    });
}

function renderDockedHistory(data) {
    var $tbody = $('#tblDockedHistory tbody');
    $tbody.empty();

    if (!data.length) {
        $tbody.html('<tr><td colspan="6" class="jr-table-empty">No entries yet.</td></tr>');
        return;
    }

    data.forEach(function (entry) {
        var out = toNumber(entry.outMaterialQuantity);
        var rej = toNumber(entry.rejectMaterialQuantity);
        var inQty = toNumber(entry.actualInMaterialQuantity);
        var balance = Math.max(0, inQty - out - rej);
        var $tr = $('<tr></tr>');
        $tr.append('<td>' + formatDate(entry.detailDate) + '</td>');
        $tr.append('<td>' + escapeHtml(entry.outChalanNo || '-') + '</td>');
        $tr.append('<td class="jr-text-right jr-tabular">' + formatNumber(out) + '</td>');
        $tr.append('<td class="jr-text-right jr-tabular">' + formatNumber(rej) + '</td>');
        $tr.append('<td class="jr-text-right jr-tabular">' + formatNumber(balance) + '</td>');
        $tr.append($('<td class="jr-text-right"></td>').append(
            $('<button type="button" class="jr-row-btn jr-row-btn--borderless jr-row-btn--danger">Delete</button>').on('click', function () {
                deleteDockedEntry(entry.chalanDetailSeq);
            })
        ));
        $tbody.append($tr);
    });
}

function deleteDockedEntry(chalanDetailSeq) {
    Swal.fire({
        title: 'Delete this entry?',
        text: 'Its quantity goes back to pending on the chalan. This can\'t be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Keep'
    }).then(function (result) {
        if (!result.isConfirmed) return;
        var hdrSeq = openDockedHdrSeq;
        $.ajax({
            url: '/ChalanProcess/DeleteDetals',
            type: 'POST',
            data: { chalanProcessdtlseq: chalanDetailSeq },
            dataType: 'json',
            success: function (data) {
                if (!data || !data.success) {
                    Swal.fire({ title: 'Delete Failed', text: 'Delete failed: ' + (data && data.message), icon: 'error', confirmButtonColor: '#d33' });
                    return;
                }
                refreshChalanRow(hdrSeq, function () {
                    openDockedPanel(hdrSeq, 'history');
                });
            },
            error: function () {
                Swal.fire({ title: 'Error!', text: 'An error occurred while deleting the entry.', icon: 'error', confirmButtonColor: '#d33' });
            }
        });
    });
}

// ---------------------------------------------------------------------
// New incoming chalan
// ---------------------------------------------------------------------
function fnValidations1() {
    if ($('#idDatenew').val() === '') {
        Swal.fire({ icon: 'error', title: 'Save Error!', text: 'Please Enter Chalan Date.', confirmButtonColor: 'red' });
        return false;
    }
    if ($('#ddlComponentnew').val() === '0') {
        Swal.fire({ icon: 'error', title: 'Save Error!', text: 'Please select Component Name', confirmButtonColor: 'red' });
        return false;
    }
    if ($('#idchalanNonew').val() === '') {
        Swal.fire({ icon: 'error', title: 'Save Error!', text: 'Please select Chalan Number', confirmButtonColor: 'red' });
        return false;
    }
    if ($('#idQuantitynew').val() === '') {
        Swal.fire({ icon: 'error', title: 'Save Error!', text: 'Please select Quantity', confirmButtonColor: 'red' });
        return false;
    }
    if ($('#idchalanNonew').val().length < 7) {
        Swal.fire({ icon: 'error', title: 'Validation Error!', text: 'Chalan Number must be at least 7 digits', confirmButtonColor: 'red' });
        return false;
    }
    return true;
}

function InsertChalanDetails() {
    $.ajax({
        url: '/ChalanProcess/InsertChalanProcess',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            date: $('#idDatenew').val(),
            componentDescription: $('#ddlComponentnew option:selected').text(),
            chalanNo: $('#idchalanNonew').val(),
            quantity: Number($('#idQuantitynew').val()),
            companyName: 'NA',
            companyCode: 'NA'
        }),
        success: function (response) {
            if (response.success) {
                Swal.fire({ icon: 'success', title: 'Saved!', text: response.message, confirmButtonColor: '#28a745' }).then(function () {
                    window.location.reload();
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Save Error!', text: response.message, confirmButtonColor: 'red' });
            }
        },
        error: function () {
            Swal.fire({ icon: 'error', title: 'Save Error!', text: 'Unable to save chalan. Please try again.', confirmButtonColor: 'red' });
        }
    });
}
