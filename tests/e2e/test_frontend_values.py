"""Do the screens show the right numbers?

Every expected value is computed straight from the database (or from the
app's own JSON endpoint) at test time and compared with what the page shows.
"""
from datetime import date, timedelta

import pytest
from playwright.sync_api import expect

import db
from conftest import DEVICE_NAMES, parse_num

ACTIVE_LIST = "FROM dbo.t_JR_Chalan_Process WHERE f_active = 1"


def month_range():
    today = date.today()
    first = today.replace(day=1)
    nxt = first.replace(year=first.year + 1, month=1) if first.month == 12 else first.replace(month=first.month + 1)
    last = date.fromordinal(nxt.toordinal() - 1)
    return first.isoformat(), last.isoformat()


# ---------------------------------------------------------------- Chalan Process

@pytest.mark.parametrize("device", DEVICE_NAMES)
def test_chalan_process_totals_match_database(open_page, device):
    expected = db.rows(
        "SELECT SUM(CAST(f_Actual_InMaterial_Quantity AS bigint)) AS qtyIn, SUM(CAST(f_OutMaterial_Quantity AS bigint)) AS qtyOut, "
        "SUM(CAST(f_Pending_Quantity AS bigint)) AS pending, SUM(CAST(f_RejectMaterial_Quantity AS bigint)) AS rejected, "
        "SUM(CASE WHEN CAST(f_Pending_Quantity AS int) <> 0 THEN 1 ELSE 0 END) AS openCount, COUNT(*) AS total " + ACTIVE_LIST)[0]
    page = open_page(device, "/ChalanProcess/Index")
    expect(page.locator("#kpiIncoming")).not_to_have_text("—")

    assert parse_num(page.inner_text("#kpiIncoming")) == expected["qtyIn"]
    assert parse_num(page.inner_text("#kpiOut")) == expected["qtyOut"]
    assert parse_num(page.inner_text("#kpiPending")) == expected["pending"]
    assert parse_num(page.inner_text("#kpiRejected")) == expected["rejected"]
    assert parse_num(page.inner_text("#tabOpenCount")) == expected["openCount"]
    assert parse_num(page.inner_text("#tabClosedCount")) == expected["total"] - expected["openCount"]
    assert f"{expected['openCount']} open chalan" in page.inner_text("#chalanPageMeta")
    assert page.js_errors == []


def test_deleted_chalans_are_not_listed(open_page):
    deleted = db.rows("SELECT TOP 5 f_InChalanNo AS no FROM dbo.t_JR_Chalan_Process WHERE f_active = 0 "
                      "AND f_InChalanNo NOT IN (SELECT f_InChalanNo " + ACTIVE_LIST + ")")
    if not deleted:
        pytest.skip("no deleted chalans in this database")
    page = open_page("desktop", "/ChalanProcess/Index")
    page.click(".jr-segmented__btn[data-tab=all]")
    for row in deleted:
        page.fill("#chalanGlobalSearch", row["no"].strip())
        page.wait_for_timeout(300)
        assert page.locator(".chalan-number-link").count() == 0, f"deleted chalan {row['no']} is listed"


@pytest.mark.parametrize("device", DEVICE_NAMES)
def test_chalan_rows_show_database_values(open_page, device):
    samples = db.rows(
        "SELECT TOP 3 f_InChalanNo AS no, f_Component_Desc AS comp, CAST(f_Actual_InMaterial_Quantity AS int) AS qtyIn, "
        "CAST(f_OutMaterial_Quantity AS int) AS qtyOut, CAST(f_Pending_Quantity AS int) AS pending " + ACTIVE_LIST +
        " AND f_InChalanNo NOT LIKE '%[^0-9]%' ORDER BY f_ChalanDate DESC")
    page = open_page(device, "/ChalanProcess/Index")
    page.click(".jr-segmented__btn[data-tab=all]")
    for s in samples:
        page.fill("#chalanGlobalSearch", s["no"])
        page.wait_for_timeout(300)
        row = page.locator("#tblchalanProcess tbody tr").filter(has=page.locator(".chalan-number-link", has_text=s["no"])).first
        assert row.is_visible(), f"chalan {s['no']} not shown"
        assert row.locator(".c-comp").inner_text().strip() == s["comp"].strip()
        assert parse_num(row.locator(".c-in").inner_text()) == s["qtyIn"]
        assert parse_num(row.locator(".c-out").inner_text()) == s["qtyOut"]
        pending_text = row.locator(".c-pending").inner_text().split("\n")[-1]
        assert parse_num(pending_text) == s["pending"]


def test_out_entries_popup_matches_database(open_page):
    hdr = db.rows(
        "SELECT TOP 1 h.f_Chalan_Proccess_HdrSeq AS hdrSeq, h.f_InChalanNo AS no FROM dbo.t_JR_Chalan_Process h "
        "WHERE h.f_active = 1 AND h.f_InChalanNo NOT LIKE '%[^0-9]%' AND (SELECT COUNT(*) FROM dbo.t_JR_Chalan_Process_Dtls d "
        "WHERE d.f_Chalan_Proccess_HdrSeq = h.f_Chalan_Proccess_HdrSeq AND d.f_active = 1) >= 2 ORDER BY h.f_PK_Chalan_ProcessID DESC")[0]
    entries = db.rows(
        "SELECT f_OutChalanNo AS outNo, CAST(f_OutMaterial_Quantity AS int) AS qtyOut, CAST(f_RejectMaterial_Quantity AS int) AS rej "
        f"FROM dbo.t_JR_Chalan_Process_Dtls WHERE f_Chalan_Proccess_HdrSeq = N'{hdr['hdrSeq']}' AND f_active = 1")

    page = open_page("desktop", "/ChalanProcess/Index")
    page.click(".jr-segmented__btn[data-tab=all]")
    page.fill("#chalanGlobalSearch", hdr["no"])
    page.wait_for_timeout(300)
    page.locator(".chalan-number-link", has_text=hdr["no"]).first.click()
    page.wait_for_selector("#tblDockedHistory tbody tr td:not(.jr-table-empty)")
    page.wait_for_timeout(300)

    shown = page.locator("#tblDockedHistory tbody tr").all()
    assert len(shown) == len(entries)
    shown_pairs = sorted((r.locator("td").nth(1).inner_text().strip(), parse_num(r.locator("td").nth(2).inner_text()),
                          parse_num(r.locator("td").nth(3).inner_text())) for r in shown)
    expected_pairs = sorted((e["outNo"].strip(), e["qtyOut"], e["rej"]) for e in entries)
    assert shown_pairs == expected_pairs

    # Balance is a running total, oldest entry first: incoming minus every
    # out/rejected entry so far. The last balance equals the chalan's pending.
    ordered = db.rows(
        "SELECT CAST(f_OutMaterial_Quantity AS int) + CAST(f_RejectMaterial_Quantity AS int) AS moved "
        f"FROM dbo.t_JR_Chalan_Process_Dtls WHERE f_Chalan_Proccess_HdrSeq = N'{hdr['hdrSeq']}' AND f_active = 1 "
        "ORDER BY CAST(f_ChalanDtls_Date AS date), f_PK_Chalan_Process_Dtls_ID")
    head = db.rows("SELECT CAST(f_Actual_InMaterial_Quantity AS int) AS qtyIn, CAST(f_Pending_Quantity AS int) AS pending "
                   f"FROM dbo.t_JR_Chalan_Process WHERE f_Chalan_Proccess_HdrSeq = N'{hdr['hdrSeq']}'")[0]
    running, expected_balances = head["qtyIn"], []
    for e in ordered:
        running -= e["moved"]
        expected_balances.append(max(0, running))
    shown_balances = [parse_num(r.locator("td").nth(4).inner_text()) for r in shown]
    assert shown_balances == expected_balances
    assert shown_balances[-1] == head["pending"]


# ---------------------------------------------------------------- Datewise

def test_datewise_incoming_matches_database(open_page):
    start, end = month_range()
    expected = {r["comp"]: r["qty"] for r in db.rows(
        "SELECT f_Component_Desc AS comp, SUM(CAST(f_Actual_InMaterial_Quantity AS int)) AS qty " + ACTIVE_LIST +
        f" AND CONVERT(date, f_ChalanDate, 23) BETWEEN '{start}' AND '{end}' GROUP BY f_Component_Desc")}
    page = open_page("desktop", "/GetDatewiseData/Index")
    expect(page.locator("#statInPeriod")).not_to_have_text("—")
    shown = _datewise_rows(page)
    assert shown == {k.strip(): v for k, v in expected.items()}
    assert parse_num(page.inner_text("#statInPeriod")) == sum(expected.values())


def test_datewise_out_material_matches_database(open_page):
    start, end = month_range()
    expected = {r["comp"].strip(): (r["qtyOut"], r["rej"]) for r in db.rows(
        "SELECT f_Component_Desc AS comp, SUM(CAST(f_OutMaterial_Quantity AS int)) AS qtyOut, SUM(CAST(f_RejectMaterial_Quantity AS int)) AS rej "
        f"FROM dbo.t_JR_Chalan_Process_Dtls WHERE f_active = 1 AND CONVERT(date, f_ChalanDtls_Date, 23) BETWEEN '{start}' AND '{end}' "
        "GROUP BY f_Component_Desc")}
    page = open_page("desktop", "/GetDatewiseData/Index")
    page.click(".jr-segmented__btn[data-tab=outward]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)
    shown = {}
    for r in page.locator("#tblDatewiseResults tbody tr").all():
        cells = r.locator("td")
        if cells.count() < 4:
            continue
        shown[cells.nth(1).inner_text().strip()] = (parse_num(cells.nth(2).inner_text()), parse_num(cells.nth(3).inner_text()))
    assert shown == expected


def test_datewise_pending_matches_database_and_is_sorted(open_page):
    expected = {r["comp"].strip(): r["pending"] for r in db.rows(
        "SELECT f_Component_Desc AS comp, SUM(CAST(f_Pending_Quantity AS int)) AS pending " + ACTIVE_LIST + " GROUP BY f_Component_Desc")}
    page = open_page("desktop", "/GetDatewiseData/Index")
    page.click(".jr-segmented__btn[data-tab=pending]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)
    shown = _datewise_rows(page)
    assert shown == expected
    names = list(shown.keys())
    assert names == sorted(names, key=lambda n: n.lower()), "Pending list must be A-Z"
    assert parse_num(page.inner_text("#datewiseTotal1")) == sum(expected.values())
    # The Chalan Process screen must agree with the Pending report.
    page.goto("/ChalanProcess/Index")
    expect(page.locator("#kpiPending")).not_to_have_text("—")
    assert parse_num(page.inner_text("#kpiPending")) == sum(expected.values())


def test_datewise_reloads_when_dates_change_and_has_no_share_column(open_page):
    today = date.today()
    first_this = today.replace(day=1)
    last_month_end = first_this - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    expected = {r["comp"].strip(): r["qty"] for r in db.rows(
        "SELECT f_Component_Desc AS comp, SUM(CAST(f_Actual_InMaterial_Quantity AS int)) AS qty " + ACTIVE_LIST +
        f" AND CONVERT(date, f_ChalanDate, 23) BETWEEN '{last_month_start}' AND '{last_month_end}' GROUP BY f_Component_Desc")}
    page = open_page("desktop", "/GetDatewiseData/Index")
    expect(page.locator("#statInPeriod")).not_to_have_text("—")
    headers = [h.strip().lower() for h in page.locator("#tblDatewiseResults thead th").all_inner_texts()]
    assert not any("share" in h for h in headers)
    assert page.locator("#tblDatewiseResults .jr-bar").count() == 0
    assert page.locator("#tblDatewiseResults thead th.c-qty2").is_hidden()   # Rejected only on Out material

    page.locator(".jr-page-title .jr-daterange__trigger").click()
    page.locator(".jr-daterange__chip[data-shortcut=last-month]").click()     # no Run report button needed
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    assert _datewise_rows(page) == expected
    assert parse_num(page.inner_text("#statInPeriod")) == sum(expected.values())

    page.click(".jr-segmented__btn[data-tab=outward]")
    page.wait_for_load_state("networkidle")
    assert page.locator("#tblDatewiseResults thead th.c-qty2").is_visible()


def _datewise_rows(page) -> dict:
    page.wait_for_selector("#tblDatewiseResults tbody tr")
    out = {}
    for r in page.locator("#tblDatewiseResults tbody tr").all():
        cells = r.locator("td")
        if cells.count() < 3:
            continue
        out[cells.nth(1).inner_text().strip()] = parse_num(cells.nth(2).inner_text())
    return out


# ---------------------------------------------------------------- Out Material Entry

def test_out_material_entry_lists_pending_chalans_from_database(open_page):
    comp_value, comp_text = "JR_JHS", "J Hub Small 111.06.021.61.9"
    expected = [(r["no"].strip(), r["pending"]) for r in db.rows(
        "SELECT f_InChalanNo AS no, CAST(f_Pending_Quantity AS int) AS pending " + ACTIVE_LIST +
        f" AND f_Component_Desc = N'{comp_text}' AND f_Pending_Quantity <> '0' ORDER BY f_ChalanDate")]
    page = open_page("desktop", "/BulkOutMaterialEntry")
    page.evaluate("v => { const s = document.getElementById('ddlComponentnew'); s.value = v; s.dispatchEvent(new Event('change')); }", comp_value)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)
    shown = [(r.locator("td").nth(2).inner_text().strip(), parse_num(r.locator("td").nth(4).inner_text()))
             for r in page.locator("#tblchalanProcess tbody tr").all() if r.locator("td").count() >= 5]
    assert shown == expected


# ---------------------------------------------------------------- Dashboard & Invoice

def test_dashboard_month_summary_matches_database(open_page):
    start, end = month_range()
    expected = db.scalar("SELECT COUNT(*) " + ACTIVE_LIST + f" AND CONVERT(date, f_ChalanDate, 23) BETWEEN '{start}' AND '{end}'")
    page = open_page("desktop", "/Home/Index")
    expect(page.locator("#dashIncomingChalan")).not_to_have_text("—")
    assert parse_num(page.inner_text("#dashIncomingChalan")) == expected


def test_invoice_lines_match_api(open_page):
    page = open_page("desktop", "/Invoice/Index")
    start, end = page.input_value("#invFromDate"), page.input_value("#invToDate")
    profile = page.locator("#invoiceProfileSelect").input_value()
    api = page.request.get(f"/Invoice/GetInvoiceLineItems?startDate={start}&endDate={end}&invoiceProfile={profile}").json()
    assert api["success"] is True
    page.click("#btnLoadInvoiceData")
    page.wait_for_selector(".swal2-popup")          # "Loaded" (or a no-data message)
    page.click(".swal2-close")
    rows = page.locator("#invoiceItemsTable tbody tr.invoice-item-row")
    assert rows.count() == len(api["items"])
    shown_qty = page.evaluate("""() => [...document.querySelectorAll('#invoiceItemsTable tbody tr.invoice-item-row')].map(r => {
        const input = r.querySelector('.inv-qty-input');
        return parseFloat((input ? input.value : r.querySelector('.inv-qty').textContent).replace(/,/g, '')) || 0;
    })""")
    assert sorted(shown_qty) == sorted(float(i["qty"]) for i in api["items"])
