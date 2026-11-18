"""Phone layout and touch behaviour: iPhone 13 (WebKit / Safari engine) and
Pixel 7 (Chromium / Android Chrome), with desktop as a control."""
import pytest

from conftest import DEVICE_NAMES

PHONES = ["iphone13", "pixel7"]
PAGES = ["/ChalanProcess/Index", "/BulkOutMaterialEntry", "/GetDatewiseData/Index", "/Invoice/Index", "/Home/Index"]


def no_sideways_scroll(page):
    # Check the page and the main content column: .app-content scrolls on its
    # own, so content wider than the screen can hide inside it. (Wide tables and
    # the invoice sit in their own scroll boxes and don't count.)
    return page.evaluate("""() => {
        const fits = el => !el || el.scrollWidth <= el.clientWidth + 1;
        return fits(document.documentElement) && fits(document.querySelector('.app-content'));
    }""")


def inside_viewport(page, selector):
    return page.locator(selector).first.evaluate(
        "el => { const r = el.getBoundingClientRect(); return r.left >= -1 && r.right <= document.documentElement.clientWidth + 1; }")


@pytest.mark.parametrize("device", DEVICE_NAMES)
@pytest.mark.parametrize("path", PAGES)
def test_pages_fit_the_screen(open_page, device, path):
    page = open_page(device, path)
    page.wait_for_timeout(500)
    assert no_sideways_scroll(page), f"{path} scrolls sideways on {device}"
    assert page.js_errors == []


@pytest.mark.parametrize("device", DEVICE_NAMES)
def test_login_page_fits(open_page, device):
    page = open_page(device, "/Account/Login", signed_in=False)
    assert no_sideways_scroll(page)
    assert inside_viewport(page, "#loginSubmit")


@pytest.mark.parametrize("device", PHONES)
def test_chalan_list_shows_cards_on_phones(open_page, device):
    page = open_page(device, "/ChalanProcess/Index")
    page.wait_for_selector(".chalan-number-link")
    assert page.locator("#tblchalanProcess thead").is_hidden()
    first = page.locator("#tblchalanProcess tbody tr").first
    for cell in [".c-chalan", ".c-comp", ".c-in", ".c-out", ".c-pending", ".c-status", ".c-action"]:
        assert first.locator(cell).is_visible(), f"{cell} not visible in the card"
        assert first.locator(cell).evaluate("el => el.getBoundingClientRect().right <= document.documentElement.clientWidth + 1")
    # The full chalan number is readable (not clipped like '270').
    link = first.locator(".chalan-number-link")
    assert link.evaluate("el => el.scrollWidth <= el.clientWidth + 1")


@pytest.mark.parametrize("device", PHONES)
@pytest.mark.parametrize("popup", ["record", "history", "new"])
def test_popups_fit_and_can_be_closed(open_page, device, popup):
    page = open_page(device, "/ChalanProcess/Index")
    page.wait_for_selector(".chalan-number-link")
    if popup == "record":
        page.locator(".jr-row-action[data-mode=record]").first.click()
        close = "#dockedClose"
    elif popup == "history":
        page.locator(".chalan-number-link").first.click()
        close = "#dockedClose"
    else:
        page.click("#btnHeaderNewChalan")
        close = "#btnCloseNewChalan"
    page.wait_for_timeout(500)
    assert inside_viewport(page, ".jr-modal-backdrop.is-open .jr-modal"), "popup wider than the screen"
    assert inside_viewport(page, close), "close button is off-screen"
    page.click(close)
    page.wait_for_timeout(500)
    assert page.locator(".jr-modal-backdrop.is-open").count() == 0


@pytest.mark.parametrize("device", PHONES)
def test_menu_opens_and_closes_on_phones(open_page, device):
    page = open_page(device, "/ChalanProcess/Index")
    sidebar_x = lambda: page.locator(".app-sidebar").bounding_box()["x"]
    page.click(".app-topbar__sidebar-trigger")
    page.wait_for_timeout(400)
    assert sidebar_x() == 0
    page.mouse.click(page.viewport_size["width"] - 20, 400)          # tap outside the menu
    page.wait_for_timeout(400)
    assert sidebar_x() < 0
    page.click(".app-topbar__sidebar-trigger")
    page.wait_for_timeout(400)
    page.locator(".app-sidebar__link", has_text="Datewise Status").click()
    page.wait_for_url("**/GetDatewiseData**")
    page.wait_for_timeout(300)
    assert sidebar_x() < 0


@pytest.mark.parametrize("device", PHONES)
def test_inputs_do_not_trigger_ios_zoom(open_page, device):
    """iOS Safari zooms in when focusing a field with text under 16px."""
    page = open_page(device, "/ChalanProcess/Index")
    page.click("#btnHeaderNewChalan")
    for sel in ["#chalanGlobalSearch", "#idchalanNonew", "#idQuantitynew"]:
        size = page.locator(sel).evaluate("el => parseFloat(getComputedStyle(el).fontSize)")
        assert size >= 16, f"{sel} font-size {size}px"


@pytest.mark.parametrize("device", PHONES)
def test_buttons_use_the_app_font(open_page, device):
    page = open_page(device, "/ChalanProcess/Index")
    page.wait_for_selector(".jr-row-action")
    family = page.locator(".jr-row-action").first.evaluate("el => getComputedStyle(el).fontFamily")
    assert "Inter" in family, f"button font is {family}"


@pytest.mark.parametrize("device", PHONES)
def test_datewise_tabs_and_dates_visible(open_page, device):
    page = open_page(device, "/GetDatewiseData/Index")
    for tab in ["inward", "outward", "pending"]:
        assert inside_viewport(page, f".jr-segmented__btn[data-tab={tab}]"), f"{tab} tab off-screen"
    assert inside_viewport(page, ".jr-page-title .jr-daterange__trigger")
    assert page.locator("#btnRunReport").count() == 0             # removed: reports load on their own


@pytest.mark.parametrize("device", PHONES)
def test_out_material_amounts_visible(open_page, device):
    page = open_page(device, "/BulkOutMaterialEntry")
    page.evaluate("() => { const s = document.getElementById('ddlComponentnew'); s.value = 'JR_JHS'; s.dispatchEvent(new Event('change')); }")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)
    if page.locator(".amount-input").count() == 0:
        pytest.skip("no pending chalans for this component")
    assert inside_viewport(page, ".amount-input"), "Amount column is off-screen"
    assert no_sideways_scroll(page)
