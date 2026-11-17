# JayRaj end-to-end tests (Playwright + pytest)

Browser tests that drive the real app and check what the screens show against
the database. They run on **desktop Chrome, iPhone 13 (WebKit / Safari engine)
and Pixel 7 (Chromium / Android Chrome)**.

| File | What it checks |
|---|---|
| `test_frontend_values.py` | Numbers on screen match the database: Chalan Process totals and counts, individual chalan rows, the Out entries popup, all three Datewise tabs, Out Material Entry's pending list, the dashboard, invoice lines vs the API. |
| `test_functional.py` | Real user flows, verified in the database: sign-in / sign-out, new chalan (validation, save, duplicate), record out / rejected / delete, the "complete older pending orders first" rule, bulk out allocation, the Pending PDF, invoice load + PDF, multi-tab sign-out. |
| `test_mobile.py` | Phone layout and touch behaviour: no sideways scrolling, chalan cards, popups fit and close, the menu opens and closes, no iOS zoom-on-focus, button fonts, Datewise controls, Out Material amounts visible. |

## Safety

The tests **only run against a local app and a local database** — they refuse
anything else. Functional tests create their own test data (chalan numbers
starting `98…`, out chalans `97…`, on a component with no real pending
chalans) and delete it afterwards, together with a temporary `e2e.tester` user.
Never point them at the live Azure site.

## Running

1. Start the app locally (from the project folder):

   ```
   dotnet run --urls http://127.0.0.1:5241
   ```

2. First time only, create the test environment:

   ```
   cd tests/e2e
   python -m venv .venv
   .venv\Scripts\python -m pip install -r requirements.txt
   .venv\Scripts\python -m playwright install chromium webkit
   ```

3. Run everything (about 2 minutes):

   ```
   .venv\Scripts\python -m pytest -q
   ```

   One file or test: `.venv\Scripts\python -m pytest -q test_mobile.py` or
   `... -k record_out`.

Settings (environment variables): `JR_BASE_URL` (default
`http://127.0.0.1:5241`), `JR_SQL_SERVER` (default `localhost\SQLEXPRESS01`),
`JR_SQL_DATABASE` (default `JAYRAJ_INDUSTRIES`).

**Login rate limit:** the app allows 8 sign-in attempts per 5 minutes per IP.
The suite signs in only 3 times per run, but running it twice in quick
succession can hit the limit — wait 5 minutes and run again.
