"""End-to-end user flows, driven through the browser and verified in the database.

Every flow works on its own test chalans (unique 98xxxxxx numbers on a
component with no real pending chalans) and they are deleted after each test,
so the business rule "complete older pending orders first" never sees data
from another test.
"""
from datetime import date, timedelta

import pytest

import db
from conftest import TEST_COMPONENT_TEXT, TEST_COMPONENT_VALUE, TEST_PASSWORD, TEST_USER, parse_num


@pytest.fixture
def data(test_data):
    test_data.cleanup()
    yield test_data
    test_data.cleanup()


def swal(page, timeout=15000):
    """Wait for a SweetAlert dialog; return (title, text) and close it."""
    page.wait_for_selector(".swal2-popup", timeout=timeout)
    title = page.inner_text(".swal2-title").strip()
    text = page.inner_text(".swal2-html-container").strip() if page.locator(".swal2-html-container").is_visible() else ""
    return title, text


def close_swal(page):
    page.click(".swal2-confirm")
    page.wait_for_selector(".swal2-popup", state="detached")


def find_chalan(page, chalan_no):
    page.click(".jr-segmented__btn[data-tab=all]")
    page.fill("#chalanGlobalSearch", chalan_no)
    page.wait_for_timeout(300)
    return page.locator("#tblchalanProcess tbody tr").filter(
        has=page.locator(".chalan-number-link", has_text=chalan_no)).first


def pick_dropdown(page, scope, option_text):
    """Choose an option in one of the app's custom dropdowns (jr-dropdown)."""
    page.locator(f"{scope} .jr-dropdown__trigger").click()
    page.locator(f"{scope} .jr-dropdown__item", has_text=option_text).first.click()


# ---------------------------------------------------------------- Sign-in

def test_sign_in_wrong_password_then_right_then_sign_out(open_page):
    page = open_page("desktop", "/Account/Login", signed_in=False)
    page.fill("#Username", TEST_USER)
    page.fill("#Password", "wrong-password")
    page.click("#loginSubmit")
    page.wait_for_load_state("networkidle")
    if "Too many sign-in attempts" in page.inner_text("body"):
        pytest.fail("The login rate limit (8 attempts / 5 min per IP) was hit by earlier runs. "
                    "That is the protection working — wait 5 minutes and run again.")
    assert "Incorrect username or password" in page.inner_text(".jr-login__alert")
    assert page.input_value("#Username") == TEST_USER          # username kept

    page.fill("#Password", TEST_PASSWORD)
    page.click("#loginSubmit")
    page.wait_for_load_state("networkidle")
    assert "/Account/Login" not in page.url
    assert page.inner_text(".app-sidebar__name").strip() == TEST_USER

    page.click("#btnLogout")
    page.wait_for_url("**/Account/Login**")
    assert "signed out" in page.inner_text(".jr-login__alert--info").lower()
    page.goto("/ChalanProcess/Index")
    assert "/Account/Login" in page.url                         # protected again


# ---------------------------------------------------------------- New incoming chalan

def test_new_chalan_validation_create_and_duplicate(open_page, data):
    page = open_page("desktop", "/ChalanProcess/Index")
    page.click("#btnHeaderNewChalan")
    page.click("#SaveChalanStatus")
    errors = page.locator("#idChalanNew .jr-field.is-invalid .jr-field__error").all_inner_texts()
    assert "Select a component." in errors and "Enter the chalan number." in errors

    page.fill("#idchalanNonew", "12345")
    page.click("#SaveChalanStatus")
    assert "Chalan number must be at least 7 digits." in page.inner_text("#idChalanNew")

    chalan_no = data.next_chalan_no()
    pick_dropdown(page, "#idChalanNew", TEST_COMPONENT_TEXT)
    page.fill("#idchalanNonew", chalan_no)
    page.fill("#idQuantitynew", "50")
    page.click("#SaveChalanStatus")
    title, _ = swal(page)
    assert title == "Saved!"
    close_swal(page)

    saved = data.chalan(chalan_no)
    assert saved is not None and saved["qtyIn"] == 50 and saved["pending"] == 50
    row = find_chalan(page, chalan_no)
    assert parse_num(row.locator(".c-in").inner_text()) == 50

    # The same chalan number again is refused by the database.
    page.click("#btnHeaderNewChalan")
    pick_dropdown(page, "#idChalanNew", TEST_COMPONENT_TEXT)
    page.fill("#idchalanNonew", chalan_no)
    page.fill("#idQuantitynew", "10")
    page.click("#SaveChalanStatus")
    title, text = swal(page)
    assert "Duplicate Chalan Number" in text
    assert db.scalar(f"SELECT COUNT(*) FROM dbo.t_JR_Chalan_Process WHERE f_InChalanNo = N'{chalan_no}'") == 1


# ---------------------------------------------------------------- Record out / rejected / delete

def test_record_out_rejected_and_delete(open_page, data):
    chalan = data.create_chalan(100)
    page = open_page("desktop", "/ChalanProcess/Index")
    row = find_chalan(page, chalan["chalanNo"])
    row.locator(".jr-row-action").click()

    # More than pending is refused inline.
    page.fill("#dockedOutChalan", data.next_out_no())
    page.fill("#dockedQty", "150")
    page.click("#dockedSaveEntry")
    assert "Only 100 Nos are pending." in page.inner_text(".jr-modal-backdrop--docked .jr-modal")

    # Record 30 out.
    out_no = data.next_out_no()
    page.fill("#dockedOutChalan", out_no)
    page.fill("#dockedQty", "30")
    assert "70 Nos will remain pending" in page.inner_text("#dockedBalanceLabel")
    page.click("#dockedSaveEntry")
    page.wait_for_selector(".jr-modal-backdrop--docked", state="detached")
    page.wait_for_timeout(500)
    db_row = data.chalan(chalan["chalanNo"])
    assert (db_row["pending"], db_row["outQty"]) == (70, 30)
    row = find_chalan(page, chalan["chalanNo"])
    assert parse_num(row.locator(".c-pending").inner_text().split("\n")[-1]) == 70

    # Record 10 rejected.
    row.locator(".jr-row-action").click()
    page.fill("#dockedOutChalan", data.next_out_no())
    page.click(".jr-toggle__btn[data-move=REJ]")
    page.fill("#dockedQty", "10")
    page.click("#dockedSaveEntry")
    page.wait_for_selector(".jr-modal-backdrop--docked", state="detached")
    page.wait_for_timeout(500)
    db_row = data.chalan(chalan["chalanNo"])
    assert (db_row["pending"], db_row["outQty"], db_row["rejQty"]) == (60, 30, 10)

    # Delete the rejected entry from the Out entries popup -> pending goes back to 70.
    row = find_chalan(page, chalan["chalanNo"])
    row.locator(".chalan-number-link").click()
    page.wait_for_selector("#tblDockedHistory .jr-row-btn--danger")
    assert page.locator("#tblDockedHistory tbody tr").count() == 2
    balances = [parse_num(t) for t in page.locator("#tblDockedHistory tbody tr td:nth-child(5)").all_inner_texts()]
    assert balances == [70, 60]                                   # running balance: 100-30, then -10
    rej_row = page.locator("#tblDockedHistory tbody tr").filter(has_text="10").last
    rej_row.locator(".jr-row-btn--danger").click()
    title, _ = swal(page)
    assert title == "Delete this entry?"
    page.click(".swal2-confirm")
    page.wait_for_timeout(1500)
    db_row = data.chalan(chalan["chalanNo"])
    assert (db_row["pending"], db_row["outQty"], db_row["rejQty"]) == (70, 30, 0)
    assert page.locator("#tblDockedHistory tbody tr").count() == 1


def test_older_pending_chalan_blocks_newer_one(open_page, data):
    data.create_chalan(10, date.today() - timedelta(days=3))
    newer = data.create_chalan(20, date.today())
    page = open_page("desktop", "/ChalanProcess/Index")
    find_chalan(page, newer["chalanNo"]).locator(".jr-row-action").click()
    page.fill("#dockedOutChalan", data.next_out_no())
    page.fill("#dockedQty", "5")
    page.click("#dockedSaveEntry")
    _, text = swal(page)
    assert "complete older pending orders" in text.lower()
    assert data.chalan(newer["chalanNo"])["pending"] == 20      # nothing saved


# ---------------------------------------------------------------- Out Material Entry (bulk)

def test_bulk_out_allocates_oldest_first_and_saves(open_page, data):
    older = data.create_chalan(40, date.today() - timedelta(days=2))
    newer = data.create_chalan(60, date.today())
    page = open_page("desktop", "/BulkOutMaterialEntry")
    pick_dropdown(page, "section.jr-card:first-of-type", TEST_COMPONENT_TEXT)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)

    rows = page.locator("#tblchalanProcess tbody tr")
    assert rows.count() == 2
    assert rows.nth(0).locator("td").nth(2).inner_text().strip() == older["chalanNo"]   # oldest first

    page.locator("#idTotAmount").press_sequentially("5a0")                              # letters stripped
    assert page.input_value("#idTotAmount") == "50"
    amounts = page.locator(".amount-input").evaluate_all("els => els.map(e => e.value)")
    assert amounts == ["40", "10"]

    page.click("#idSubmit")                                                              # no delivery chalan yet
    _, text = swal(page)
    assert "out chalan" in text.lower()
    close_swal(page)

    page.fill("#txtOutChalan", data.next_out_no())
    page.click("#idSubmit")
    title, _ = swal(page)
    assert title == "Saved!"
    assert data.chalan(older["chalanNo"])["pending"] == 0
    assert data.chalan(newer["chalanNo"])["pending"] == 50


# ---------------------------------------------------------------- Reports

def test_datewise_pending_pdf_downloads(open_page):
    page = open_page("desktop", "/GetDatewiseData/Index")
    assert not page.is_visible("#btnDownloadPendingPdf")          # only on the Pending tab
    page.click(".jr-segmented__btn[data-tab=pending]")
    page.wait_for_load_state("networkidle")
    with page.expect_download(timeout=60000) as dl:
        page.click("#btnDownloadPendingPdf")
    assert dl.value.suggested_filename == "Pending_Material_All_Dates.pdf"
    with open(dl.value.path(), "rb") as f:
        assert f.read(5) == b"%PDF-"


def test_invoice_loads_and_pdf_downloads(open_page):
    page = open_page("desktop", "/Invoice/Index")
    page.click("#btnLoadInvoiceData")
    page.wait_for_selector(".swal2-popup")          # "Loaded" (or a no-data message)
    page.click(".swal2-confirm")
    if page.locator("#invoiceItemsTable tbody tr.invoice-item-row").count() == 0:
        pytest.skip("no invoice lines for the current month")
    with page.expect_download(timeout=90000) as dl:
        page.locator("#btnDownloadInvoicePdf").evaluate("el => el.click()")
    with open(dl.value.path(), "rb") as f:
        assert f.read(5) == b"%PDF-"


# ---------------------------------------------------------------- Multiple tabs

def test_sign_out_in_one_tab_signs_out_the_other(open_page, base_url):
    tab_a = open_page("desktop", "/ChalanProcess/Index")
    tab_b = tab_a.context.new_page()
    tab_b.goto(base_url + "/GetDatewiseData/Index")
    tab_b.wait_for_load_state("networkidle")
    tab_a.click("#btnLogout")
    tab_b.wait_for_url("**/Account/Login**", timeout=10000)
    assert "signed out" in tab_b.inner_text(".jr-login__alert--info").lower()


# ---------------------------------------------------------------- Double-click protection

def _entry_count(chalan_no):
    return db.scalar(
        "SELECT COUNT(*) FROM dbo.t_JR_Chalan_Process_Dtls d JOIN dbo.t_JR_Chalan_Process h "
        "ON h.f_Chalan_Proccess_HdrSeq = d.f_Chalan_Proccess_HdrSeq "
        f"WHERE h.f_InChalanNo = N'{chalan_no}' AND h.f_active = 1 AND d.f_active = 1")


def test_double_click_record_out_saves_once(open_page, data):
    chalan = data.create_chalan(100)
    page = open_page("desktop", "/ChalanProcess/Index")
    find_chalan(page, chalan["chalanNo"]).locator(".jr-row-action").click()
    page.fill("#dockedOutChalan", data.next_out_no())
    page.fill("#dockedQty", "40")
    page.dblclick("#dockedSaveEntry")
    page.wait_for_selector(".jr-modal-backdrop--docked", state="detached")
    page.wait_for_timeout(1000)
    assert _entry_count(chalan["chalanNo"]) == 1
    db_row = data.chalan(chalan["chalanNo"])
    assert (db_row["pending"], db_row["outQty"]) == (60, 40)


def test_double_click_bulk_submit_saves_once(open_page, data):
    chalan = data.create_chalan(50)
    page = open_page("desktop", "/BulkOutMaterialEntry")
    pick_dropdown(page, "section.jr-card:first-of-type", TEST_COMPONENT_TEXT)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)
    page.locator("#idTotAmount").press_sequentially("20")
    page.fill("#txtOutChalan", data.next_out_no())
    page.dblclick("#idSubmit")
    title, _ = swal(page)
    assert title == "Saved!"
    page.wait_for_timeout(1000)
    assert _entry_count(chalan["chalanNo"]) == 1
    db_row = data.chalan(chalan["chalanNo"])
    assert (db_row["pending"], db_row["outQty"]) == (30, 20)
