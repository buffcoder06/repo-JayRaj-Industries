"""Minimal SQL Server access for the tests, through sqlcmd (no driver install).

Reads come back as JSON (FOR JSON PATH) wrapped in marker characters, so
values containing commas, quotes or line breaks parse safely.

The suite only ever talks to a LOCAL database: functional tests create and
remove data, and must never run against the live Azure database.
"""
import json
import os
import subprocess

SERVER = os.environ.get("JR_SQL_SERVER", r"localhost\SQLEXPRESS01")
DATABASE = os.environ.get("JR_SQL_DATABASE", "JAYRAJ_INDUSTRIES")

if not SERVER.lower().startswith(("localhost", "127.0.0.1", ".", "(local)")):
    raise RuntimeError(f"Refusing to run tests against non-local SQL Server '{SERVER}'.")

_BASE_ARGS = ["sqlcmd", "-S", SERVER, "-d", DATABASE, "-C", "-b", "-x", "-y", "0"]


def _run(sql: str) -> str:
    result = subprocess.run(_BASE_ARGS + ["-Q", "SET NOCOUNT ON; " + sql],
                            capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise RuntimeError(f"sqlcmd failed ({result.returncode}): {result.stdout}{result.stderr}\nSQL: {sql}")
    return result.stdout


def rows(select_sql: str) -> list[dict]:
    """Run a SELECT and return its rows as dicts."""
    out = _run(f"SELECT NCHAR(29) + ISNULL(({select_sql} FOR JSON PATH, INCLUDE_NULL_VALUES), N'[]') + NCHAR(30);")
    payload = out.split(chr(29), 1)[1].split(chr(30), 1)[0]
    return json.loads(payload)


def scalar(select_sql: str):
    """Run a SELECT returning one value (aliased or not) and return it."""
    data = rows(f"SELECT ({select_sql}) AS v")
    return data[0]["v"] if data else None


def execute(sql: str) -> None:
    _run(sql)
