"""Shared fixtures for the JayRaj end-to-end tests.

Prerequisites: the app running locally (default http://127.0.0.1:5241) against
the local SQL Server database. See README.md.

- A dedicated test user is created for the session and removed afterwards.
- Sign-in happens ONCE and the cookie is reused by every test (the login page
  is rate-limited to 8 attempts per 5 minutes per IP).
- Test data uses unique chalan numbers on a component that has no real
  pending chalans, and is deleted at the end of the session.
"""
import base64
import hashlib
import os
import re
import time
from datetime import date

import pytest

import db

BASE_URL = os.environ.get("JR_BASE_URL", "http://127.0.0.1:5241").rstrip("/")
if not re.match(r"^https?://(127\.0\.0\.1|localhost)(:\d+)?$", BASE_URL):
    raise RuntimeError(f"Refusing to run tests against non-local app '{BASE_URL}'.")

TEST_USER = "e2e.tester"
TEST_PASSWORD = "E2e-Tester!2026"

# A component with no real pending chalans, so test chalans never mix with real
# ones (Out Material Entry allocates oldest-first across a component).
TEST_COMPONENT_VALUE = "JR_JLRDC2"
TEST_COMPONENT_TEXT = "J Mcie-3.3L Front Hub 0503Gaa 0047"

# Phone / desktop profiles used by the layout and mobile tests.
DEVICE_NAMES = ["desktop", "iphone13", "pixel7"]


def device_options(playwright, name):
    if name == "iphone13":
        return playwright.webkit, dict(playwright.devices["iPhone 13"])
    if name == "pixel7":
        return playwright.chromium, dict(playwright.devices["Pixel 7"])
    return playwright.chromium, {"viewport": {"width": 1440, "height": 900}}


def _pbkdf2_hash(password: str) -> str:
    """Same format as DataAccessLayer/PasswordHasher.cs: iterations.salt.hash"""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000, 32)
    return f"100000.{base64.b64encode(salt).decode()}.{base64.b64encode(digest).decode()}"


def parse_num(text: str) -> float:
    """'4,73,747' -> 473747 ; '98.5%' -> 98.5"""
    cleaned = re.sub(r"[^0-9.\-]", "", text or "")
    return float(cleaned) if cleaned not in ("", "-", ".") else 0.0


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session", autouse=True)
def app_is_running():
    import urllib.request
    try:
        urllib.request.urlopen(BASE_URL + "/Account/Login", timeout=15)
    except Exception as e:  # pragma: no cover - environment problem, not a test failure
        pytest.exit(f"App not reachable at {BASE_URL} ({e}). Start it first — see tests/e2e/README.md.", 2)


@pytest.fixture(scope="session", autouse=True)
def test_user():
    db.execute(f"DELETE FROM dbo.t_JR_Users WHERE f_Username = N'{TEST_USER}';")
    db.execute(
        "INSERT INTO dbo.t_JR_Users (f_Username, f_PasswordHash, f_DisplayName, f_Active, f_CreatedAt) "
        f"VALUES (N'{TEST_USER}', N'{_pbkdf2_hash(TEST_PASSWORD)}', N'E2E Tester', 1, GETDATE());")
    yield TEST_USER
    db.execute(f"DELETE FROM dbo.t_JR_Users WHERE f_Username = N'{TEST_USER}';")


class TestData:
    """Unique numbers for this run + cleanup of everything the tests create."""

    def __init__(self):
        stamp = f"{int(time.time()) % 1_000_000:06d}"
        self.chalan_prefix = "98" + stamp          # in-chalan numbers: 98xxxxxx + n
        self.out_prefix = "97" + stamp             # out-chalan numbers: 97xxxxxx + n
        self._n = 0
        self.max_invoice_header = db.scalar("SELECT ISNULL(MAX(InvoiceAuditHeaderId), 0) FROM dbo.t_jr_InvoiceAuditHeader")
        self.max_exception_log = db.scalar("SELECT ISNULL(MAX(ExceptionLogId), 0) FROM dbo.t_jr_ApplicationExceptionLog")

    def next_chalan_no(self) -> str:
        self._n += 1
        return f"{self.chalan_prefix}{self._n}"

    def next_out_no(self) -> str:
        self._n += 1
        return f"{self.out_prefix}{self._n}"

    def create_chalan(self, qty: int, chalan_date: date | None = None) -> dict:
        """Insert a chalan directly through the app's stored procedure."""
        no = self.next_chalan_no()
        d = (chalan_date or date.today()).isoformat()
        db.execute(
            "EXEC dbo.sp_InsertIntoChallanProcess "
            f"@ChalanDate=N'{d}', @Component_Desc=N'{TEST_COMPONENT_TEXT}', @Company_Cd=N'NA', "
            f"@InChalanNo=N'{no}', @OutChalanNo=N'NA', @Company_Name=N'NA', "
            f"@Actual_InMaterial_Quantity=N'{qty}', @Pending_Quantity=N'{qty}', @OutMaterial_Quantity=N'0', "
            "@RejectMaterial_Quantity=N'0', @Remarks=N'', @Remark_StatusID=0, "
            "@CreatedBy=N'e2e', @UpdatedBy=N'e2e', @SessionID=0;")
        return self.chalan(no)

    @staticmethod
    def chalan(no: str) -> dict:
        found = db.rows(
            "SELECT f_Chalan_Proccess_HdrSeq AS hdrSeq, f_InChalanNo AS chalanNo, "
            "CAST(f_Actual_InMaterial_Quantity AS int) AS qtyIn, CAST(f_Pending_Quantity AS int) AS pending, "
            "CAST(f_OutMaterial_Quantity AS int) AS outQty, CAST(f_RejectMaterial_Quantity AS int) AS rejQty, "
            f"f_ChalanDate AS chalanDate FROM dbo.t_JR_Chalan_Process WHERE f_InChalanNo = N'{no}' AND f_active = 1")
        return found[0] if found else None

    def cleanup(self):
        like_in, like_out = self.chalan_prefix + "%", self.out_prefix + "%"
        db.execute(
            f"DELETE FROM dbo.t_JR_Chalan_Process_Dtls WHERE f_InChalanNo LIKE N'{like_in}' OR f_OutChalanNo LIKE N'{like_out}';"
            f"DELETE FROM dbo.t_JR_Chalan_Process WHERE f_InChalanNo LIKE N'{like_in}';"
            f"DELETE FROM dbo.t_jr_InvoiceAuditDetail WHERE InvoiceAuditHeaderId > {self.max_invoice_header};"
            f"DELETE FROM dbo.t_jr_InvoiceAuditHeader WHERE InvoiceAuditHeaderId > {self.max_invoice_header};"
            f"DELETE FROM dbo.t_jr_ApplicationExceptionLog WHERE ExceptionLogId > {self.max_exception_log};")


@pytest.fixture(scope="session")
def test_data():
    data = TestData()
    data.cleanup()          # leftovers from an interrupted earlier run with the same stamp
    yield data
    data.cleanup()


@pytest.fixture(scope="session")
def auth_state(playwright, test_user, tmp_path_factory):
    """Sign in once over HTTP and save the cookie for every browser context."""
    request = playwright.request.new_context(base_url=BASE_URL)
    page = request.get("/Account/Login").text()
    token = re.search(r'name="__RequestVerificationToken" type="hidden" value="([^"]+)"', page).group(1)
    response = request.post("/Account/Login", form={
        "Username": TEST_USER, "Password": TEST_PASSWORD, "__RequestVerificationToken": token}, max_redirects=0)
    assert response.status == 302, f"test sign-in failed: HTTP {response.status}"
    path = tmp_path_factory.mktemp("auth") / "state.json"
    request.storage_state(path=str(path))
    request.dispose()
    return str(path)


@pytest.fixture
def open_page(playwright, auth_state):
    """open_page(device="desktop", path="/ChalanProcess/Index", signed_in=True) -> page.
    Collects JavaScript errors on page.js_errors; closes everything after the test."""
    opened = []

    def _open(device="desktop", path="/ChalanProcess/Index", signed_in=True):
        browser_type, options = device_options(playwright, device)
        browser = browser_type.launch()
        if signed_in:
            options["storage_state"] = auth_state
        context = browser.new_context(base_url=BASE_URL, accept_downloads=True, **options)
        page = context.new_page()
        page.set_default_timeout(30000)
        page.js_errors = []
        page.on("pageerror", lambda e: page.js_errors.append(str(e)))
        opened.append(browser)
        if path:
            page.goto(path)
            page.wait_for_load_state("networkidle")
        return page

    yield _open
    for b in opened:
        b.close()
