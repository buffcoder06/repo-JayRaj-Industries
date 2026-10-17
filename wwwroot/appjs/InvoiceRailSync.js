/* Wires the settings rail (period chips, date-picker labels, totals block,
   line-item summary) on top of InvoiceGeneration.js without changing it:
   that file owns all invoice math/state, this only mirrors its output. */
(function () {
    var DATE_INPUT_IDS = ['invFromDate', 'invToDate', 'invDate', 'poDate'];

    function toIso(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    function setPeriod(fromDate, toDate) {
        var fromEl = document.getElementById('invFromDate');
        var toEl = document.getElementById('invToDate');
        fromEl.value = toIso(fromDate);
        fromEl.dispatchEvent(new Event('change', { bubbles: true }));
        toEl.value = toIso(toDate);
        toEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    document.getElementById('btnPeriodThisMonth').addEventListener('click', function () {
        var now = new Date();
        setPeriod(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0));
    });

    document.getElementById('btnPeriodLastMonth').addEventListener('click', function () {
        var now = new Date();
        setPeriod(new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0));
    });

    document.getElementById('btnPeriodQuarter').addEventListener('click', function () {
        var now = new Date();
        var quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        setPeriod(new Date(now.getFullYear(), quarterStartMonth, 1), new Date(now.getFullYear(), quarterStartMonth + 3, 0));
    });

    // InvoiceGeneration.js writes these hidden inputs' .value directly (on
    // load, and when the invoice type / scrap party changes the PO date) with
    // no 'change' event, so the picker labels have to be nudged after it runs.
    function syncDateLabels() {
        DATE_INPUT_IDS.forEach(function (id) {
            document.getElementById(id).dispatchEvent(new Event('change'));
        });
    }

    function syncTotals() {
        document.getElementById('railAssessableValue').textContent = document.getElementById('assessableValue').textContent;
        document.getElementById('railCgstValue').textContent = document.getElementById('cgstValue').textContent;
        document.getElementById('railSgstValue').textContent = document.getElementById('sgstValue').textContent;
        document.getElementById('railGrandTotal').textContent = document.getElementById('grandTotal').textContent;
    }

    function syncLineItemsSummary() {
        var rows = document.querySelectorAll('#invoiceItemsTable tbody tr.invoice-item-row, #invoiceItemsTable tbody tr.invoice-manual-row');
        document.getElementById('lineItemsSummary').textContent = rows.length ? rows.length + ' loaded' : '';

        var zeroRateCount = 0;
        rows.forEach(function (row) {
            var rateInput = row.querySelector('.inv-rate-input');
            var rateText = rateInput ? rateInput.value : (row.querySelector('.inv-rate') || {}).textContent;
            var qtyInput = row.querySelector('.inv-qty-input');
            var qtyText = qtyInput ? qtyInput.value : (row.querySelector('.inv-qty') || {}).textContent;
            var rate = parseFloat(String(rateText || '0').replace(/,/g, ''));
            var qty = parseFloat(String(qtyText || '0').replace(/,/g, ''));
            if (qty > 0 && !rate) zeroRateCount++;
        });

        var warning = document.getElementById('zeroRateWarning');
        warning.hidden = zeroRateCount === 0;
        if (zeroRateCount > 0) {
            document.getElementById('zeroRateWarningText').textContent =
                zeroRateCount + ' component' + (zeroRateCount === 1 ? ' has' : 's have') + ' no rate in the master and will invoice at 0.00.';
        }
    }

    var totalsObserver = new MutationObserver(syncTotals);
    ['assessableValue', 'cgstValue', 'sgstValue', 'grandTotal'].forEach(function (id) {
        totalsObserver.observe(document.getElementById(id), { childList: true, characterData: true, subtree: true });
    });

    new MutationObserver(syncLineItemsSummary)
        .observe(document.querySelector('#invoiceItemsTable tbody'), { childList: true, subtree: true, attributes: true });
    document.querySelector('#invoiceItemsTable tbody').addEventListener('input', syncLineItemsSummary);

    ['invoiceProfileSelect', 'scrapPartySelect'].forEach(function (id) {
        document.getElementById(id).addEventListener('change', function () { setTimeout(syncDateLabels, 0); });
    });

    // This runs before InvoiceGeneration.js's $(document).ready defaults are
    // guaranteed to have been applied, so retry briefly until they have.
    var attempts = 0;
    var poll = setInterval(function () {
        attempts++;
        syncTotals();
        syncLineItemsSummary();
        syncDateLabels();
        if (document.getElementById('invDate').value || attempts > 40) clearInterval(poll);
    }, 50);
})();
