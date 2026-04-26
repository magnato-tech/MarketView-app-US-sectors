import os
import sys
import asyncio
import datetime as dt
import pandas as pd
import requests
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

# Add current directory to path for imports
current_dir = Path(__file__).resolve().parent.parent
if str(current_dir) not in sys.path:
    sys.path.append(str(current_dir))

# Load environment variables
load_dotenv(current_dir / ".env")

# Helper to import supabase client correctly (avoiding shadowing)
def _import_supabase_create_client():
    import importlib
    root = current_dir
    def entry_is_project_root(p: str) -> bool:
        if not p: return False
        try: return Path(p).resolve() == root
        except OSError: return False
    
    for key in list(sys.modules):
        if key == "supabase" or key.startswith("supabase."):
            del sys.modules[key]
    
    old_path = sys.path[:]
    try:
        sys.path[:] = [p for p in sys.path if not entry_is_project_root(p)]
        mod = importlib.import_module("supabase")
        return mod.create_client
    finally:
        sys.path = old_path

def get_supabase_service_client():
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    try:
        create_client = _import_supabase_create_client()
        return create_client(url, key)
    except Exception as e:
        print(f"Supabase init failed: {e}")
        return None

def fetch_yahoo_history(symbol: str, range_str: str = "6mo", interval: str = "1d") -> Optional[pd.DataFrame]:
    """Fetch historical data from Yahoo Finance."""
    try:
        # Using the same endpoint as the frontend proxy would
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={interval}&range={range_str}"
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        json_data = resp.json()
        
        result = json_data.get("chart", {}).get("result", [{}])[0]
        timestamps = result.get("timestamp", [])
        closes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        
        if not timestamps or not closes:
            return None
            
        df = pd.DataFrame({"timestamp": timestamps, "close": closes})
        df = df.dropna()
        return df
    except Exception as e:
        print(f"Error fetching Yahoo data for {symbol}: {e}")
        return None

def calculate_volatility(prices: pd.Series) -> float:
    if len(prices) < 2: return 0.0
    returns = prices.pct_change().dropna()
    return float(returns.std() * (252**0.5) * 100)

def calculate_max_drawdown(prices: pd.Series) -> float:
    if len(prices) < 1: return 0.0
    roll_max = prices.cummax()
    drawdown = (prices - roll_max) / roll_max
    return float(abs(drawdown.min()) * 100)

async def sync_market_data():
    supabase = get_supabase_service_client()
    if not supabase:
        print("Supabase client not available.")
        return

    # 1. Get all instruments from DB
    res = supabase.table("instruments").select("symbol, category").execute()
    instruments = res.data if hasattr(res, 'data') else []
    
    if not instruments:
        print("No instruments found in database.")
        return

    print(f"Starting sync for {len(instruments)} instruments...")
    
    # We need a benchmark for relative strength (usually S&P 500)
    benchmark_df = fetch_yahoo_history("^GSPC")
    benchmark_return = 0.0
    if benchmark_df is not None:
        first = benchmark_df["close"].iloc[0]
        last = benchmark_df["close"].iloc[-1]
        benchmark_return = ((last - first) / first) * 100

    for inst in instruments:
        symbol = inst["symbol"]
        print(f"Syncing {symbol}...")
        
        df = fetch_yahoo_history(symbol)
        if df is None or df.empty:
            continue
            
        prices = df["close"]
        first_price = prices.iloc[0]
        last_price = prices.iloc[-1]
        change_pct = ((last_price - first_price) / first_price) * 100
        
        vol = calculate_volatility(prices)
        mdd = calculate_max_drawdown(prices)
        rs = change_pct - benchmark_return
        
        # Simple momentum score (return / volatility)
        momentum = change_pct / vol if vol > 0 else 0
        
        stats = {
            "symbol": symbol,
            "last_price": float(round(last_price, 2)),
            "change_pct": float(round(change_pct, 2)),
            "volatility": float(round(vol, 2)),
            "max_drawdown": float(round(mdd, 2)),
            "relative_strength": float(round(rs, 2)),
            "momentum_score": float(round(momentum, 2)),
            "updated_at": dt.datetime.now(dt.timezone.utc).isoformat()
        }
        
        try:
            supabase.table("market_stats").upsert(stats).execute()
        except Exception as e:
            print(f"Failed to upsert stats for {symbol}: {e}")
            
        # Small delay to avoid hitting Yahoo too hard
        await asyncio.sleep(0.5)

    print("Market data sync complete.")

if __name__ == "__main__":
    asyncio.run(sync_market_data())
