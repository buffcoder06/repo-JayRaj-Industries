/* JayRaj Industries — custom dropdown popover and date-range picker.
   Both controls keep a hidden native <select>/<input> so existing form posts,
   jQuery handlers and model binding are untouched: the widgets only add a
   styled trigger + popover on top and mirror selections back onto the native
   element (setting .value and dispatching a real 'change' event). */
(function (global) {
  'use strict';

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function toIsoDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseIsoDate(s) {
    if (!s) return null;
    var parts = String(s).split('-');
    if (parts.length !== 3) return null;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDisplayDate(d) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return pad2(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function closeAllPopovers(except) {
    document.querySelectorAll('.jr-dropdown__panel[data-open], .jr-daterange__panel[data-open]').forEach(function (panel) {
      if (panel === except) return;
      var root = panel.closest('.jr-dropdown, .jr-daterange');
      if (root && root._jrClose) root._jrClose();
    });
  }

  document.addEventListener('click', function (e) {
    // Use composedPath() rather than e.target.closest(): the calendar's own
    // click handlers (month nav, day selection) re-render the panel's
    // innerHTML *before* this document-level listener runs, which detaches
    // e.target from the tree — closest() on a detached node finds nothing,
    // so the "click was outside" check would misfire and close the popover
    // on every click inside it. composedPath() is captured at dispatch time
    // and stays valid regardless of any DOM mutation the click caused.
    var path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    for (var i = 0; i < path.length; i++) {
      var node = path[i];
      if (node.classList && (node.classList.contains('jr-dropdown') || node.classList.contains('jr-daterange'))) {
        return;
      }
    }
    closeAllPopovers(null);
  });

  // ---------------------------------------------------------------------
  // Dropdown popover
  // ---------------------------------------------------------------------
  function initDropdown(root) {
    if (root._jrInit) return;
    root._jrInit = true;

    var select = root.querySelector('select');
    var trigger = root.querySelector('.jr-dropdown__trigger');
    var label = root.querySelector('.jr-dropdown__label');
    var panel = root.querySelector('.jr-dropdown__panel');
    var filterInput = root.querySelector('.jr-dropdown__filter-input');
    var list = root.querySelector('.jr-dropdown__list');
    if (!select || !trigger || !panel || !list) return;

    var items = [];
    var activeIndex = -1;

    function buildItems() {
      list.innerHTML = '';
      items = [];
      Array.prototype.forEach.call(select.options, function (opt, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'jr-dropdown__item';
        btn.setAttribute('role', 'option');
        btn.dataset.index = idx;
        btn.innerHTML = '<span class="jr-dropdown__check" aria-hidden="true">' +
          (opt.selected ? checkSvg() : '') + '</span><span class="jr-dropdown__item-label"></span>';
        btn.querySelector('.jr-dropdown__item-label').textContent = opt.text;
        btn.addEventListener('click', function () { commit(idx); });
        list.appendChild(btn);
        items.push({ el: btn, text: opt.text.toLowerCase() });
      });
    }

    function checkSvg() {
      return '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" focusable="false"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 20.6 7.4 19.2 6z"/></svg>';
    }

    function syncLabel() {
      var opt = select.options[select.selectedIndex];
      label.textContent = opt ? opt.text : '';
    }

    function syncSelectedMark() {
      items.forEach(function (it, idx) {
        var check = it.el.querySelector('.jr-dropdown__check');
        check.innerHTML = (idx === select.selectedIndex) ? checkSvg() : '';
      });
    }

    function setActive(idx) {
      items.forEach(function (it) { it.el.classList.remove('is-active'); it.el.removeAttribute('aria-selected'); });
      activeIndex = idx;
      if (idx >= 0 && items[idx]) {
        items[idx].el.classList.add('is-active');
        items[idx].el.setAttribute('aria-selected', 'true');
        items[idx].el.scrollIntoView({ block: 'nearest' });
        panel.setAttribute('aria-activedescendant', 'jr-opt-' + idx);
      }
    }

    function visibleIndexes() {
      var out = [];
      items.forEach(function (it, idx) { if (it.el.style.display !== 'none') out.push(idx); });
      return out;
    }

    function moveActive(delta) {
      var vis = visibleIndexes();
      if (!vis.length) return;
      var pos = vis.indexOf(activeIndex);
      pos = pos === -1 ? (delta > 0 ? 0 : vis.length - 1) : (pos + delta + vis.length) % vis.length;
      setActive(vis[pos]);
    }

    function commit(idx) {
      select.selectedIndex = idx;
      syncLabel();
      syncSelectedMark();
      select.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    }

    function applyFilter() {
      var q = (filterInput.value || '').trim().toLowerCase();
      items.forEach(function (it) {
        it.el.style.display = (!q || it.text.indexOf(q) !== -1) ? '' : 'none';
      });
      setActive(visibleIndexes()[0] === undefined ? -1 : visibleIndexes()[0]);
    }

    function open() {
      closeAllPopovers(panel);
      buildItems();
      syncSelectedMark();
      panel.hidden = false;
      panel.setAttribute('data-open', '1');
      trigger.setAttribute('aria-expanded', 'true');
      if (filterInput) { filterInput.value = ''; filterInput.focus(); }
      applyFilter();
      setActive(select.selectedIndex >= 0 ? select.selectedIndex : 0);
    }

    function close() {
      panel.hidden = true;
      panel.removeAttribute('data-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    root._jrClose = close;

    trigger.addEventListener('click', function () {
      if (panel.hidden) open(); else close();
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (panel.hidden) open();
      }
    });

    if (filterInput) filterInput.addEventListener('input', applyFilter);

    panel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex !== -1) commit(activeIndex); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); trigger.focus(); }
      else if (e.key === 'Tab') { close(); }
    });

    select.addEventListener('change', syncLabel);
    syncLabel();
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    panel.setAttribute('role', 'listbox');
  }

  // ---------------------------------------------------------------------
  // Date-range picker (also used in single-date mode)
  // ---------------------------------------------------------------------
  var sharedCursor = null; // shared month cursor across every calendar instance on the page

  function initDateRange(root) {
    if (root._jrInit) return;
    root._jrInit = true;

    var startInput = root.querySelector('[data-jr-role="start"]');
    var endInput = root.querySelector('[data-jr-role="end"]') || null;
    var trigger = root.querySelector('.jr-daterange__trigger');
    var label = root.querySelector('.jr-daterange__label');
    var panel = root.querySelector('.jr-daterange__panel');
    if (!startInput || !trigger || !panel) return;

    var singleMode = !endInput;
    var pendingStart = null; // during in-progress range selection

    function currentStart() { return parseIsoDate(startInput.value); }
    function currentEnd() { return endInput ? parseIsoDate(endInput.value) : currentStart(); }

    function syncLabel() {
      var s = currentStart(), e = currentEnd();
      if (!s) { label.textContent = singleMode ? 'Select date' : 'All dates'; return; }
      label.textContent = singleMode || !e || sameDay(s, e) ? formatDisplayDate(s) : (formatDisplayDate(s) + ' — ' + formatDisplayDate(e));
    }

    function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

    function setValue(start, end) {
      startInput.value = start ? toIsoDate(start) : '';
      startInput.dispatchEvent(new Event('change', { bubbles: true }));
      if (endInput) {
        endInput.value = end ? toIsoDate(end) : '';
        endInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      syncLabel();
    }

    function open() {
      closeAllPopovers(panel);
      pendingStart = null;
      sharedCursor = currentStart() || sharedCursor || new Date();
      panel.hidden = false;
      panel.setAttribute('data-open', '1');
      trigger.setAttribute('aria-expanded', 'true');
      render();
    }

    function close() {
      panel.hidden = true;
      panel.removeAttribute('data-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    root._jrClose = close;

    function render() {
      var cursor = sharedCursor;
      var year = cursor.getFullYear(), month = cursor.getMonth();
      var firstOfMonth = new Date(year, month, 1);
      var startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday-first
      var daysInMonth = new Date(year, month + 1, 0).getDate();

      var s = currentStart(), e = currentEnd();
      var rangeStart = s, rangeEnd = e;
      if (rangeStart && rangeEnd && rangeStart > rangeEnd) { var t = rangeStart; rangeStart = rangeEnd; rangeEnd = t; }
      if (pendingStart) { rangeStart = pendingStart; rangeEnd = pendingStart; }

      var today = new Date(); today.setHours(0, 0, 0, 0);

      var html = '';
      html += '<div class="jr-daterange__month-hdr">';
      html += '<button type="button" class="jr-daterange__nav" data-nav="-1" aria-label="Previous month">‹</button>';
      html += '<span class="jr-daterange__month-label">' + MONTH_NAMES[month] + ' ' + year + '</span>';
      html += '<button type="button" class="jr-daterange__nav" data-nav="1" aria-label="Next month">›</button>';
      html += '</div>';
      html += '<div class="jr-daterange__weekdays">';
      WEEKDAY_LABELS.forEach(function (w, i) {
        html += '<span class="jr-daterange__weekday' + (i === 6 ? ' is-sunday' : '') + '">' + w + '</span>';
      });
      html += '</div>';
      html += '<div class="jr-daterange__days">';
      for (var i = 0; i < startWeekday; i++) html += '<span class="jr-daterange__day is-out"></span>';
      for (var day = 1; day <= daysInMonth; day++) {
        var d = new Date(year, month, day);
        var classes = ['jr-daterange__day'];
        if (sameDay(d, today)) classes.push('is-today');
        var inRange = rangeStart && rangeEnd && d >= stripTime(rangeStart) && d <= stripTime(rangeEnd);
        var isStart = rangeStart && sameDay(d, rangeStart);
        var isEnd = rangeEnd && sameDay(d, rangeEnd);
        if (isStart || isEnd) classes.push('is-endpoint');
        else if (inRange) classes.push('is-in-range');
        html += '<button type="button" class="' + classes.join(' ') + '" data-day="' + toIsoDate(d) + '">' + day + '</button>';
      }
      html += '</div>';
      html += '<div class="jr-daterange__shortcuts">';
      html += '<button type="button" class="jr-daterange__chip" data-shortcut="this-month">This month</button>';
      html += '<button type="button" class="jr-daterange__chip" data-shortcut="last-month">Last month</button>';
      html += '<button type="button" class="jr-daterange__clear" data-shortcut="clear">Clear</button>';
      html += '</div>';

      panel.innerHTML = html;

      panel.querySelectorAll('[data-nav]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          sharedCursor = new Date(sharedCursor.getFullYear(), sharedCursor.getMonth() + Number(btn.dataset.nav), 1);
          document.querySelectorAll('.jr-daterange__panel[data-open]').forEach(function (p) {
            var r = p.closest('.jr-daterange');
            if (r && r._jrRender) r._jrRender();
          });
        });
      });

      panel.querySelectorAll('[data-day]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var d = parseIsoDate(btn.dataset.day);
          if (singleMode) {
            setValue(d, null);
            close();
            return;
          }
          if (!pendingStart) {
            pendingStart = d;
            render();
          } else {
            var a = pendingStart, b = d;
            if (a > b) { var t = a; a = b; b = t; }
            pendingStart = null;
            setValue(a, b);
            close();
          }
        });
      });

      panel.querySelector('[data-shortcut="this-month"]').addEventListener('click', function () {
        var now = new Date();
        setValue(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0));
        close();
      });
      panel.querySelector('[data-shortcut="last-month"]').addEventListener('click', function () {
        var now = new Date();
        setValue(new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0));
        close();
      });
      panel.querySelector('[data-shortcut="clear"]').addEventListener('click', function () {
        setValue(null, null);
        close();
      });
    }

    function stripTime(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

    root._jrRender = render;

    trigger.addEventListener('click', function () {
      if (panel.hidden) open(); else close();
    });

    document.addEventListener('keydown', function (e) {
      if (panel.hidden) return;
      if (e.key === 'Escape') { close(); trigger.focus(); }
    });

    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    // Recompute the label if some other script sets the hidden input(s)
    // directly (e.g. a page setting a default range on load) rather than
    // going through setValue().
    startInput.addEventListener('change', syncLabel);
    if (endInput) endInput.addEventListener('change', syncLabel);
    syncLabel();
  }

  function initAll(scope) {
    scope = scope || document;
    scope.querySelectorAll('[data-jr-dropdown]').forEach(initDropdown);
    scope.querySelectorAll('[data-jr-daterange]').forEach(initDateRange);
  }

  global.JRControls = {
    initAll: initAll,
    initDropdown: initDropdown,
    initDateRange: initDateRange,
    formatDisplayDate: formatDisplayDate,
    toIsoDate: toIsoDate,
    parseIsoDate: parseIsoDate
  };

  document.addEventListener('DOMContentLoaded', function () { initAll(document); });
})(window);
