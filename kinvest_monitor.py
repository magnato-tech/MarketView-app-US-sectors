#!/usr/bin/env python3
"""
KInvest Crisis Engine
---------------------
Tracks physical-economy KPIs for semiconductor stress signals:
- Taiwan grid reserve (Taipower)
- South Korea grid reserve (KPX; HTTPS deretter HTTP-fallback)
- Helium NE Asia price (IMARC, with CSV/API placeholder fallback)
- JKM LNG spot proxy (Twelve Data)
- TWD/USD FX (Alpha Vantage)
- Nasdaq proxy (QQQ via Twelve Data) for divergence detection

Data is logged to SQLite every run. Supports one-shot or hourly loop.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import re
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

def _bootstrap_dotenv() -> None:
    """Last .env fra prosjektmappa (der kinvest_monitor.py ligger), uansett cwd."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    root = Path(__file__).resolve().parent
    env_main = root / ".env"
    env_local = root / ".env.local"
    if env_main.is_file():
        load_dotenv(env_main, override=False)
    if env_local.is_file():
        load_dotenv(env_local, override=True)
    if not env_main.is_file() and not env_local.is_file():
        load_dotenv()


_bootstrap_dotenv()

import requests
from bs4 import BeautifulSoup
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

console = Console()

TAIPOWER_URL = "https://www.taipower.com.tw/2764/2826/2829/2830/simpleList"
# Prøv HTTPS først (nogle netværk blokerer eller hænger på ren HTTP).
KPX_URLS = (
    "https://power.kpx.or.kr/powerinfo_en.php",
    "http://power.kpx.or.kr/powerinfo_en.php",
)
IMARC_HELIUM_URL = "https://www.imarcgroup.com/helium-pricing-report"
TWELVE_TIME_SERIES_URL = "https://api.twelvedata.com/time_series"
ALPHA_VANTAGE_FX_URL = "https://www.alphavantage.co/query"
DEFAULT_DB_PATH = "kinvest_crisis.db"


@dataclass
class Snapshot:
    ts_utc: str
    taiwan_reserve_pct: Optional[float]
    korea_reserve_pct: Optional[float]
    helium_price_usd: Optional[float]
    jkm_price_usd: Optional[float]
    twd_usd: Optional[float]
    nasdaq_proxy: Optional[float]
    helium_roc_24h_pct: Optional[float]
    helium_roc_7d_pct: Optional[float]
    twd_roc_24h_pct: Optional[float]
    nasdaq_roc_24h_pct: Optional[float]
    crisis_index: float
    critical_sell: bool
    notes_json: str


def safe_float(value: object) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def pct_change(current: Optional[float], past: Optional[float]) -> Optional[float]:
    if current is None or past is None or past == 0:
        return None
    return ((current - past) / abs(past)) * 100.0


def init_db(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS crisis_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts_utc TEXT NOT NULL,
                taiwan_reserve_pct REAL,
                korea_reserve_pct REAL,
                helium_price_usd REAL,
                jkm_price_usd REAL,
                twd_usd REAL,
                nasdaq_proxy REAL,
                helium_roc_24h_pct REAL,
                helium_roc_7d_pct REAL,
                twd_roc_24h_pct REAL,
                nasdaq_roc_24h_pct REAL,
                crisis_index REAL NOT NULL,
                critical_sell INTEGER NOT NULL,
                notes_json TEXT
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def _fetch_html(url: str, timeout_sec: int = 20) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; KInvestCrisisMonitor/1.0; +https://kinvest.local)"
    }
    resp = requests.get(url, headers=headers, timeout=timeout_sec)
    resp.raise_for_status()
    return resp.text


def _extract_first_percent_near_keywords(text: str, keywords: list[str]) -> Optional[float]:
    normalized = " ".join(text.split())
    for kw in keywords:
        idx = normalized.lower().find(kw.lower())
        if idx >= 0:
            window = normalized[max(0, idx - 120) : idx + 240]
            match = re.search(r"(-?\d+(?:\.\d+)?)\s*%", window)
            if match:
                return safe_float(match.group(1))
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*%", normalized)
    return safe_float(match.group(1)) if match else None


def fetch_taiwan_reserve_pct() -> Optional[float]:
    """
    Taipower scraper: aims for operating reserve percentage in the first relevant table entry.
    """
    try:
        html = _fetch_html(TAIPOWER_URL)
        soup = BeautifulSoup(html, "html.parser")

        for table in soup.find_all("table"):
            txt = table.get_text(" ", strip=True)
            if any(k in txt.lower() for k in ["operating reserve", "reserve", "備轉容量"]):
                val = _extract_first_percent_near_keywords(txt, ["operating reserve", "percentage", "備轉容量率"])
                if val is not None:
                    return val

        page_text = soup.get_text(" ", strip=True)
        return _extract_first_percent_near_keywords(page_text, ["operating reserve", "percentage", "備轉容量率"])
    except Exception as exc:
        console.print(f"[yellow]Taipower scrape warning:[/yellow] {exc}")
        return None


def fetch_korea_reserve_pct() -> Optional[float]:
    last_exc: Optional[Exception] = None
    for url in KPX_URLS:
        try:
            html = _fetch_html(url)
            soup = BeautifulSoup(html, "html.parser")
            page_text = soup.get_text(" ", strip=True)
            return _extract_first_percent_near_keywords(
                page_text, ["Supply Reserve Ratio", "Reserve Ratio", "reserve"]
            )
        except Exception as exc:
            last_exc = exc
            continue
    if last_exc is not None:
        console.print(f"[yellow]KPX scrape warning:[/yellow] {last_exc}")
    return None


def fetch_helium_price_from_imarc() -> Optional[float]:
    try:
        html = _fetch_html(IMARC_HELIUM_URL)
        soup = BeautifulSoup(html, "html.parser")
        text = soup.get_text(" ", strip=True)

        # Prefer value near "Northeast Asia Price"
        idx = text.lower().find("northeast asia")
        candidate = text[max(0, idx - 250) : idx + 500] if idx >= 0 else text

        # Accept "$163.72" or "163.72 USD"
        dollar = re.search(r"\$\s*(\d+(?:\.\d+)?)", candidate)
        if dollar:
            return safe_float(dollar.group(1))

        usd = re.search(r"(\d+(?:\.\d+)?)\s*(?:usd|us\$)", candidate, re.IGNORECASE)
        if usd:
            return safe_float(usd.group(1))
        return None
    except Exception as exc:
        console.print(f"[yellow]IMARC helium scrape warning:[/yellow] {exc}")
        return None


def fetch_helium_placeholder(csv_path: str) -> Optional[float]:
    """
    Les siste registrerte helium-verdi fra CSV.
    Forventede kolonner: timestamp, price_ne_asia, source (price_ne_asia er påkrevd).
    """
    if not csv_path or not os.path.exists(csv_path):
        return None
    try:
        import pandas as pd  # type: ignore

        df = pd.read_csv(csv_path)
        if df.empty:
            return None
        col = "price_ne_asia"
        if col not in df.columns:
            # Bakoverkompatibilitet
            for alt in ("price", "price_usd", "helium_usd"):
                if alt in df.columns:
                    col = alt
                    break
            else:
                return safe_float(df.iloc[-1].iloc[-1])
        return safe_float(df.iloc[-1][col])
    except ImportError:
        pass
    except Exception as exc:
        console.print(f"[yellow]Helium CSV (pandas) warning:[/yellow] {exc}")

    try:
        with open(csv_path, "r", newline="", encoding="utf-8") as f:
            rows = list(csv.reader(f))
        if not rows:
            return None
        header = [h.strip().lower() for h in rows[0]]
        body = rows[1:] if any(h for h in header if "price" in h or "timestamp" in h) else rows
        if not body:
            return None
        last = body[-1]
        if "price_ne_asia" in header:
            idx = header.index("price_ne_asia")
            return safe_float(last[idx])
        if any("price" in h for h in header):
            idx = next(i for i, h in enumerate(header) if "price" in h)
            return safe_float(last[idx])
        return safe_float(last[-1])
    except Exception as exc:
        console.print(f"[yellow]Helium CSV fallback warning:[/yellow] {exc}")
        return None


def fetch_twelve_symbol(symbol: str, api_key: str, interval: str = "1h") -> Optional[float]:
    if not api_key:
        return None
    try:
        params = {
            "symbol": symbol,
            "interval": interval,
            "outputsize": 1,
            "apikey": api_key,
        }
        resp = requests.get(TWELVE_TIME_SERIES_URL, params=params, timeout=20)
        resp.raise_for_status()
        payload = resp.json()
        values = payload.get("values") or []
        if not values:
            return None
        return safe_float(values[0].get("close"))
    except Exception as exc:
        console.print(f"[yellow]Twelve Data warning ({symbol}):[/yellow] {exc}")
        return None


def fetch_twd_usd_alpha_vantage(api_key: str) -> Optional[float]:
    if not api_key:
        return None
    try:
        params = {
            "function": "CURRENCY_EXCHANGE_RATE",
            "from_currency": "TWD",
            "to_currency": "USD",
            "apikey": api_key,
        }
        resp = requests.get(ALPHA_VANTAGE_FX_URL, params=params, timeout=20)
        resp.raise_for_status()
        payload = resp.json()
        quote = payload.get("Realtime Currency Exchange Rate", {})
        return safe_float(quote.get("5. Exchange Rate"))
    except Exception as exc:
        console.print(f"[yellow]Alpha Vantage warning (TWD/USD):[/yellow] {exc}")
        return None


def fetch_nasdaq_proxy(twelve_api_key: str) -> Optional[float]:
    # QQQ used as Nasdaq growth/liquidity proxy.
    return fetch_twelve_symbol("QQQ", twelve_api_key, interval="1h")


def compute_time_to_10_week_void() -> str:
    """
    Estimat: 10-ukers «void»-vindu fra KINVEST_BLOCKADE_START (ISO dato, UTC).
    Viser gjenværende tid til vinduet slutter.
    """
    start_raw = os.getenv("KINVEST_BLOCKADE_START", "").strip()
    if not start_raw:
        return "Sett KINVEST_BLOCKADE_START (ISO, f.eks. 2026-03-15) for void-tidslinje."
    try:
        start = dt.datetime.fromisoformat(start_raw.replace("Z", "+00:00"))
        if start.tzinfo is None:
            start = start.replace(tzinfo=dt.timezone.utc)
        void_end = start + dt.timedelta(weeks=10)
        now = dt.datetime.now(dt.timezone.utc)
        if now >= void_end:
            return "10-ukers void-vindu er passert — vurder ny tidslinje."
        remaining = void_end - now
        days = remaining.days
        hrs = remaining.seconds // 3600
        return f"{days}d {hrs}h gjenstår til void-slutt ({void_end.date()} UTC)"
    except ValueError:
        return "Ugyldig KINVEST_BLOCKADE_START — bruk ISO-format."


_supabase_client = None


def _import_supabase_create_client():
    """
    PyPI-pakken «supabase» skygges av prosjektmappa `supabase/` (SQL-filer).
    Last den ekte klienten uten at lokal mappe er på sys.path.
    """
    import importlib
    import sys

    root = Path(__file__).resolve().parent

    def entry_is_project_root(p: str) -> bool:
        if not p:
            try:
                return Path.cwd().resolve() == root
            except OSError:
                return False
        try:
            return Path(p).resolve() == root
        except OSError:
            return False

    for key in list(sys.modules):
        if key == "supabase" or key.startswith("supabase."):
            del sys.modules[key]

    old_path = sys.path[:]
    try:
        sys.path[:] = [p for p in sys.path if not entry_is_project_root(p)]
        mod = importlib.import_module("supabase")
        return mod.create_client
    finally:
        sys.path[:] = old_path


def get_supabase_service_client():
    """Service role-klient for skriving til crisis_log / engine_status."""
    global _supabase_client
    if _supabase_client is False:
        return None
    if _supabase_client is not None:
        return _supabase_client
    url = (
        os.getenv("SUPABASE_URL", "").strip()
        or os.getenv("VITE_SUPABASE_URL", "").strip()
    )
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        _supabase_client = False
        return None
    try:
        create_client = _import_supabase_create_client()
        _supabase_client = create_client(url, key)
        return _supabase_client
    except ModuleNotFoundError as exc:
        console.print(
            f"[yellow]Supabase init feilet:[/yellow] {exc} "
            "(kjør: [bold]pip install -r requirements-monitor.txt[/bold])"
        )
        _supabase_client = False
        return None
    except Exception as exc:
        console.print(f"[yellow]Supabase init feilet:[/yellow] {exc}")
        _supabase_client = False
        return None


def sync_crisis_to_supabase(snap: Snapshot, asian_grid_lock: bool) -> bool:
    """INSERT crisis_log + UPSERT engine_status. Returnerer True ved fullført sync."""
    client = get_supabase_service_client()
    if client is None:
        console.print(
            "[yellow]Supabase ikke konfigurert:[/yellow] sett SUPABASE_URL (eller VITE_SUPABASE_URL) og SUPABASE_SERVICE_ROLE_KEY i .env"
        )
        return False

    try:
        notes_parsed = json.loads(snap.notes_json) if snap.notes_json else []
    except json.JSONDecodeError:
        notes_parsed = []

    row = {
        "ts_utc": snap.ts_utc,
        "taiwan_reserve_pct": snap.taiwan_reserve_pct,
        "korea_reserve_pct": snap.korea_reserve_pct,
        "helium_price_usd": snap.helium_price_usd,
        "jkm_price_usd": snap.jkm_price_usd,
        "twd_usd": snap.twd_usd,
        "nasdaq_proxy": snap.nasdaq_proxy,
        "helium_roc_24h_pct": snap.helium_roc_24h_pct,
        "helium_roc_7d_pct": snap.helium_roc_7d_pct,
        "twd_roc_24h_pct": snap.twd_roc_24h_pct,
        "nasdaq_roc_24h_pct": snap.nasdaq_roc_24h_pct,
        "crisis_index": snap.crisis_index,
        "critical_sell": snap.critical_sell,
        "asian_grid_lock": asian_grid_lock,
        "notes_json": notes_parsed,
    }

    try:
        client.table("crisis_log").insert(row).execute()
    except Exception as exc:
        console.print(f"[yellow]Supabase crisis_log INSERT feilet:[/yellow] {exc}")
        return False

    try:
        client.table("engine_status").upsert(
            {
                "id": 1,
                "last_heartbeat": snap.ts_utc,
                "status": "OPERATIONAL",
                "crisis_index": snap.crisis_index,
                "critical_sell": snap.critical_sell,
                "asian_grid_lock": asian_grid_lock,
                "taiwan_reserve_pct": snap.taiwan_reserve_pct,
                "korea_reserve_pct": snap.korea_reserve_pct,
                "helium_price_usd": snap.helium_price_usd,
                "twd_usd": snap.twd_usd,
            },
            on_conflict="id",
        ).execute()
    except Exception as exc:
        console.print(f"[yellow]Supabase engine_status UPSERT feilet:[/yellow] {exc}")
        return False

    console.print("[green]Supabase sync OK[/green] — crisis_log + engine_status (OPERATIONAL)")
    return True


def get_value_at_or_before(conn: sqlite3.Connection, ts_cutoff: str, column: str) -> Optional[float]:
    row = conn.execute(
        f"""
        SELECT {column}
        FROM crisis_log
        WHERE ts_utc <= ?
        ORDER BY ts_utc DESC
        LIMIT 1
        """,
        (ts_cutoff,),
    ).fetchone()
    return safe_float(row[0]) if row and row[0] is not None else None


def compute_crisis_index(
    taiwan_reserve: Optional[float],
    korea_reserve: Optional[float],
    helium_price: Optional[float],
    helium_roc_7d: Optional[float],
    twd_roc_24h: Optional[float],
    nasdaq_roc_24h: Optional[float],
) -> tuple[float, list[str], bool]:
    penalties = 0.0
    notes: list[str] = []
    critical_sell = False

    # Rule set (from your brief)
    if helium_price is not None:
        if helium_price >= 165:
            penalties += 45  # Heavy weight for critical level
            notes.append("Helium >= $165 (CRITICAL)")
        elif helium_price >= 155:
            penalties += 20
            notes.append("Helium >= $155 (WARNING)")
    
    if helium_roc_7d is not None and helium_roc_7d > 5:
        penalties += 18
        notes.append("Helium > 5% weekly rise")
    if taiwan_reserve is not None and taiwan_reserve < 8:
        penalties += 20
        notes.append("Taipower reserve < 8%")
    if taiwan_reserve is not None and taiwan_reserve < 6:
        penalties += 25
        notes.append("Taipower reserve < 6%")
        critical_sell = True
    if korea_reserve is not None and korea_reserve < 10:
        penalties += 10
        notes.append("KPX reserve weak")
    if (
        twd_roc_24h is not None
        and twd_roc_24h > 2
        and nasdaq_roc_24h is not None
        and nasdaq_roc_24h >= 0
    ):
        penalties += 25
        notes.append("TWD divergence vs Nasdaq")
        critical_sell = True

    # Extra kill switch
    if helium_roc_7d is not None and helium_roc_7d > 15:
        notes.append("Immediate liquidation warning: helium > 15% weekly")
        critical_sell = True

    crisis_index = max(0.0, min(100.0, penalties))
    if crisis_index > 75:
        critical_sell = True

    # Asian Grid Lock — dobbel bekreftelse (ultimate multiplikator)
    if (
        taiwan_reserve is not None
        and korea_reserve is not None
        and taiwan_reserve < 6
        and korea_reserve < 6
    ):
        crisis_index = max(crisis_index, 96.0)
        crisis_index = min(100.0, crisis_index)
        critical_sell = True
        notes.append("Asian Grid Lock: Taipower & KPX begge < 6%")

    return crisis_index, notes, critical_sell


def save_snapshot(db_path: str, snap: Snapshot) -> None:
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO crisis_log (
                ts_utc,
                taiwan_reserve_pct,
                korea_reserve_pct,
                helium_price_usd,
                jkm_price_usd,
                twd_usd,
                nasdaq_proxy,
                helium_roc_24h_pct,
                helium_roc_7d_pct,
                twd_roc_24h_pct,
                nasdaq_roc_24h_pct,
                crisis_index,
                critical_sell,
                notes_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                snap.ts_utc,
                snap.taiwan_reserve_pct,
                snap.korea_reserve_pct,
                snap.helium_price_usd,
                snap.jkm_price_usd,
                snap.twd_usd,
                snap.nasdaq_proxy,
                snap.helium_roc_24h_pct,
                snap.helium_roc_7d_pct,
                snap.twd_roc_24h_pct,
                snap.nasdaq_roc_24h_pct,
                snap.crisis_index,
                1 if snap.critical_sell else 0,
                snap.notes_json,
            ),
        )
        conn.commit()
    finally:
        conn.close()


def _fmt_num(v: Optional[float], unit: str = "", precision: int = 2) -> str:
    if v is None:
        return "N/A"
    return f"{v:.{precision}f}{unit}"


def render_dashboard(snap: Snapshot) -> None:
    table = Table(title="KInvest Crisis Monitor (Semiconductor Stress)")
    table.add_column("KPI", style="bold cyan")
    table.add_column("Value", justify="right")
    table.add_column("ROC", justify="right")
    table.add_column("Status", justify="left")

    def status_from_value(label: str, val: Optional[float]) -> str:
        if val is None:
            return "[yellow]MISSING[/yellow]"
        if label == "Taiwan Reserve %":
            if val < 6:
                return "[red]CRITICAL[/red]"
            if val < 8:
                return "[yellow]WARNING[/yellow]"
            return "[green]OK[/green]"
        if label == "Helium NE Asia (USD)":
            if val > 160:
                return "[yellow]HEAT[/yellow]"
            return "[green]OK[/green]"
        return "[green]OK[/green]"

    table.add_row(
        "Taiwan Reserve %",
        _fmt_num(snap.taiwan_reserve_pct, "%"),
        "-",
        status_from_value("Taiwan Reserve %", snap.taiwan_reserve_pct),
    )
    table.add_row("Korea Reserve %", _fmt_num(snap.korea_reserve_pct, "%"), "-", "[green]Track[/green]")
    table.add_row(
        "Helium NE Asia (USD)",
        _fmt_num(snap.helium_price_usd),
        _fmt_num(snap.helium_roc_7d_pct, "%"),
        status_from_value("Helium NE Asia (USD)", snap.helium_price_usd),
    )
    table.add_row("JKM LNG (USD)", _fmt_num(snap.jkm_price_usd), "-", "[green]Track[/green]")
    table.add_row(
        "TWD/USD",
        _fmt_num(snap.twd_usd, precision=5),
        _fmt_num(snap.twd_roc_24h_pct, "%"),
        "[yellow]Divergence watch[/yellow]" if (snap.twd_roc_24h_pct or 0) > 2 else "[green]OK[/green]",
    )
    table.add_row("Nasdaq Proxy (QQQ)", _fmt_num(snap.nasdaq_proxy), _fmt_num(snap.nasdaq_roc_24h_pct, "%"), "[green]Track[/green]")

    console.print(table)

    headline = f"Crisis Index: {snap.crisis_index:.1f}/100"
    color = "green"
    if snap.crisis_index > 75:
        color = "red"
    elif snap.crisis_index > 50:
        color = "yellow"

    notes = json.loads(snap.notes_json) if snap.notes_json else []
    notes_text = "\n".join(f"- {n}" for n in notes) if notes else "- No active stress notes"
    void_line = compute_time_to_10_week_void()
    panel_body = Text.assemble(
        (headline + "\n", f"bold {color}"),
        ("Time to 10-Week Void: ", "dim"),
        (void_line, "white"),
    )
    console.print(Panel(panel_body, title="Risk Report", border_style=color))
    console.print(notes_text)

    if snap.critical_sell:
        console.print("\n[bold white on red]TRIGGER SELL_OFF PROTOCOL[/bold white on red]")


def run_once(
    db_path: str,
    twelve_key: str,
    alpha_key: str,
    helium_csv_path: str,
) -> Snapshot:
    init_db(db_path)

    ts_now = dt.datetime.now(dt.timezone.utc)
    ts_utc = ts_now.isoformat()

    taiwan = fetch_taiwan_reserve_pct()
    korea = fetch_korea_reserve_pct()
    # Når --helium-csv er satt og finnes: bruk siste rad som autoritativ inngang (IMARC som sekundær).
    helium: Optional[float] = None
    if helium_csv_path and os.path.exists(helium_csv_path):
        helium = fetch_helium_placeholder(helium_csv_path)
    if helium is None:
        helium = fetch_helium_price_from_imarc()
    jkm = fetch_twelve_symbol("JKM", twelve_key, interval="1h")
    twd_usd = fetch_twd_usd_alpha_vantage(alpha_key)
    nasdaq = fetch_nasdaq_proxy(twelve_key)

    conn = sqlite3.connect(db_path)
    try:
        cutoff_24h = (ts_now - dt.timedelta(hours=24)).isoformat()
        cutoff_7d = (ts_now - dt.timedelta(days=7)).isoformat()

        helium_24h_base = get_value_at_or_before(conn, cutoff_24h, "helium_price_usd")
        helium_7d_base = get_value_at_or_before(conn, cutoff_7d, "helium_price_usd")
        twd_24h_base = get_value_at_or_before(conn, cutoff_24h, "twd_usd")
        nasdaq_24h_base = get_value_at_or_before(conn, cutoff_24h, "nasdaq_proxy")

        helium_roc_24h = pct_change(helium, helium_24h_base)
        helium_roc_7d = pct_change(helium, helium_7d_base)
        twd_roc_24h = pct_change(twd_usd, twd_24h_base)
        nasdaq_roc_24h = pct_change(nasdaq, nasdaq_24h_base)
    finally:
        conn.close()

    crisis_index, notes, critical_sell = compute_crisis_index(
        taiwan_reserve=taiwan,
        korea_reserve=korea,
        helium_price=helium,
        helium_roc_7d=helium_roc_7d,
        twd_roc_24h=twd_roc_24h,
        nasdaq_roc_24h=nasdaq_roc_24h,
    )

    asian_grid_lock = (
        taiwan is not None and korea is not None and taiwan < 6 and korea < 6
    )

    # Original kill-switch clause from earlier brief:
    if helium_roc_24h is not None and helium_roc_24h > 10:
        notes.append("Kill switch: helium > 10% over 24h")
        critical_sell = True
        crisis_index = max(crisis_index, 82.0)
        crisis_index = min(100.0, crisis_index)

    snap = Snapshot(
        ts_utc=ts_utc,
        taiwan_reserve_pct=taiwan,
        korea_reserve_pct=korea,
        helium_price_usd=helium,
        jkm_price_usd=jkm,
        twd_usd=twd_usd,
        nasdaq_proxy=nasdaq,
        helium_roc_24h_pct=helium_roc_24h,
        helium_roc_7d_pct=helium_roc_7d,
        twd_roc_24h_pct=twd_roc_24h,
        nasdaq_roc_24h_pct=nasdaq_roc_24h,
        crisis_index=crisis_index,
        critical_sell=critical_sell,
        notes_json=json.dumps(notes, ensure_ascii=True),
    )
    save_snapshot(db_path, snap)
    sync_crisis_to_supabase(snap, asian_grid_lock)
    return snap


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="KInvest Crisis Monitor")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH, help="SQLite file path")
    parser.add_argument(
        "--loop",
        action="store_true",
        help="Run forever and sample repeatedly",
    )
    parser.add_argument(
        "--interval-seconds",
        type=int,
        default=3600,
        help="Loop interval in seconds (default: 3600)",
    )
    parser.add_argument(
        "--helium-csv",
        default=os.getenv("HELIUM_PLACEHOLDER_CSV", ""),
        help="CSV med kolonnene timestamp, price_ne_asia, source (siste rad brukes når fil finnes)",
    )
    return parser.parse_args()


def resolve_helium_csv_path(cli_value: str) -> str:
    v = (cli_value or "").strip()
    if v:
        return v
    for candidate in ("helium_placeholder.csv", str(Path("data") / "helium_placeholder.csv")):
        if os.path.isfile(candidate):
            return candidate
    return ""


import subprocess

def run_market_stats_sync():
    """Kjører det eksterne synkroniseringsscriptet for markedsdata."""
    script_path = Path(__file__).resolve().parent / "scripts" / "sync_market_stats.py"
    if not script_path.exists():
        console.print(f"[yellow]Sync-script ikke funnet:[/yellow] {script_path}")
        return
    
    console.print("[cyan]Starter daglig synkronisering av markedsdata...[/cyan]")
    try:
        # Vi kjører dette som en separat prosess for å unngå blokkering og minneproblemer i hovedloopen
        subprocess.run([sys.executable, str(script_path)], check=True)
        console.print("[green]Markedsdata-synkronisering fullført.[/green]")
    except Exception as exc:
        console.print(f"[red]Synkronisering feilet:[/red] {exc}")

def main() -> None:
    args = parse_args()
    twelve_key = os.getenv("TWELVE_DATA_API_KEY", "") or os.getenv("TWELVE_DATA_KEY", "")
    alpha_key = os.getenv("ALPHA_VANTAGE_API_KEY", "") or os.getenv("ALPHA_VANTAGE_KEY", "")

    if not twelve_key:
        console.print("[yellow]TWELVE_DATA_API_KEY / TWELVE_DATA_KEY not set. JKM/QQQ may be missing.[/yellow]")
    if not alpha_key:
        console.print("[yellow]ALPHA_VANTAGE_API_KEY / ALPHA_VANTAGE_KEY not set. TWD/USD may be missing.[/yellow]")

    helium_csv = resolve_helium_csv_path(args.helium_csv)

    last_sync_date = None

    while True:
        try:
            # Sjekk om vi skal kjøre markedsdata-sync (en gang per dag)
            today = dt.date.today()
            if last_sync_date != today:
                run_market_stats_sync()
                last_sync_date = today

            snap = run_once(
                db_path=args.db_path,
                twelve_key=twelve_key,
                alpha_key=alpha_key,
                helium_csv_path=helium_csv,
            )
            render_dashboard(snap)
        except KeyboardInterrupt:
            console.print("\n[cyan]Stopped by user.[/cyan]")
            break
        except Exception as exc:
            console.print(f"[bold red]Fatal run error:[/bold red] {exc}")

        if not args.loop:
            break
        time.sleep(max(10, args.interval_seconds))


if __name__ == "__main__":
    main()

