// Home/Index dashboard: current-month totals.
$(document).ready(function () {
    $.ajax({
        url: '/ChalanProcess/GetCurrentMonthSummary',
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            if (!data || data.success === false) {
                setDashError();
                return;
            }
            $('#appTopbarMeta').text(data.monthLabel || '');
            $('#dashIncomingChalan').text(formatDashValue(data.incomingChalanCount));
            $('#dashTotalOutMaterial').text(formatDashValue(data.totalOutMaterial));
            $('#dashTotalPendingMaterial').text(formatDashValue(data.totalPendingMaterial));
            $('#dashTotalRejectedMaterial').text(formatDashValue(data.totalRejectedMaterial));
        },
        error: function () {
            setDashError();
        }
    });

    function setDashError() {
        $('#appTopbarMeta').text('Current month');
        $('#dashIncomingChalan, #dashTotalOutMaterial, #dashTotalPendingMaterial, #dashTotalRejectedMaterial').text('—');
    }

    function formatDashValue(value) {
        var n = Number(value);
        if (!isFinite(n)) return '0';
        if (Math.floor(n) === n) return n.toLocaleString('en-IN');
        return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
});
