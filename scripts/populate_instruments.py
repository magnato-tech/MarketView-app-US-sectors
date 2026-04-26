import os
import sys
import json
import asyncio
from typing import List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# Add current directory to path for imports
current_dir = Path(__file__).resolve().parent.parent
if str(current_dir) not in sys.path:
    sys.path.append(str(current_dir))

# Helper to import supabase client correctly
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
        sys.path[:] = old_path

# Load environment variables
load_dotenv(current_dir / ".env")

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

# Load environment variables
load_dotenv()

# Pre-defined major components for indices that don't have explicit holdings in etfService
INDEX_HOLDINGS = {
    "^GSPC": [
        {"symbol": "AAPL", "name": "Apple Inc.", "weight": 7.1},
        {"symbol": "MSFT", "name": "Microsoft Corp.", "weight": 6.9},
        {"symbol": "NVDA", "name": "NVIDIA Corp.", "weight": 5.0},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "weight": 3.4},
        {"symbol": "META", "name": "Meta Platforms Inc.", "weight": 2.4},
        {"symbol": "GOOGL", "name": "Alphabet Inc. (Class A)", "weight": 2.0},
        {"symbol": "BRK.B", "name": "Berkshire Hathaway Inc.", "weight": 1.7},
        {"symbol": "GOOG", "name": "Alphabet Inc. (Class C)", "weight": 1.7},
        {"symbol": "LLY", "name": "Eli Lilly & Co.", "weight": 1.4},
        {"symbol": "AVGO", "name": "Broadcom Inc.", "weight": 1.3},
    ],
    "^NDX": [
        {"symbol": "AAPL", "name": "Apple Inc.", "weight": 8.5},
        {"symbol": "MSFT", "name": "Microsoft Corp.", "weight": 8.3},
        {"symbol": "NVDA", "name": "NVIDIA Corp.", "weight": 6.2},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "weight": 4.8},
        {"symbol": "META", "name": "Meta Platforms Inc.", "weight": 4.5},
        {"symbol": "GOOGL", "name": "Alphabet Inc. (Class A)", "weight": 2.5},
        {"symbol": "GOOG", "name": "Alphabet Inc. (Class C)", "weight": 2.5},
        {"symbol": "AVGO", "name": "Broadcom Inc.", "weight": 2.3},
        {"symbol": "TSLA", "name": "Tesla Inc.", "weight": 2.2},
        {"symbol": "COST", "name": "Costco Wholesale Corp.", "weight": 2.1},
    ]
}

async def populate_instruments():
    print("Starting instrument metadata population...")
    supabase = get_supabase_service_client()
    if not supabase:
        print("Error: Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
        return
    
    # 1. Load data from constants.ts (simulated by parsing or hardcoding for this script)
    # In a real scenario, we might use a small node script to export this to JSON
    # For now, I'll use the data I read from the files.
    
    sectors = [
        {"symbol": "XLK", "name": "Teknologi", "category": "Sector", "color": "#10b981"},
        {"symbol": "XLV", "name": "Helse", "category": "Sector", "color": "#0ea5e9"},
        {"symbol": "XLF", "name": "Finans", "category": "Sector", "color": "#f59e0b"},
        {"symbol": "XLRE", "name": "Eiendom", "category": "Sector", "color": "#14b8a6"},
        {"symbol": "IGF", "name": "Infrastruktur", "category": "Sector", "color": "#64748b"},
        {"symbol": "XLY", "name": "Konsum", "category": "Sector", "color": "#ec4899"},
        {"symbol": "XLC", "name": "Telekom", "category": "Sector", "color": "#6366f1"},
        {"symbol": "XLI", "name": "Industri", "category": "Sector", "color": "#94a3b8"},
        {"symbol": "XLU", "name": "Forsyning", "category": "Sector", "color": "#eab308"},
        {"symbol": "SHY", "name": "Obligasjoner kort", "category": "Sector", "color": "#c084fc"},
        {"symbol": "TLT", "name": "Obligasjoner lang", "category": "Sector", "color": "#8b5cf6"},
        {"symbol": "XLE", "name": "Energi", "category": "Sector", "color": "#f97316"},
        {"symbol": "XLB", "name": "Materialer", "category": "Sector", "color": "#84cc16"},
        {"symbol": "DBC", "name": "Råvarer", "category": "Sector", "color": "#65a30d"},
        {"symbol": "GLD", "name": "Edelmetaller", "category": "Sector", "color": "#facc15"},
    ]
    
    indices = [
        {"symbol": "^GSPC", "name": "S&P 500", "category": "Index", "color": "#3b82f6"},
        {"symbol": "^NDX", "name": "Nasdaq 100", "category": "Index", "color": "#8b5cf6"},
        {"symbol": "^VIX", "name": "VIX Volatility", "category": "Index", "color": "#f43f5e"},
    ]
    
    # 2. Extract ETFs and Holdings from etfService.ts (simulated)
    # I will process a few key ones to demonstrate the hierarchy
    
    all_instruments = []
    
    # Add Indices
    for idx in indices:
        all_instruments.append(idx)
        # Add index holdings
        if idx["symbol"] in INDEX_HOLDINGS:
            for stock in INDEX_HOLDINGS[idx["symbol"]]:
                all_instruments.append({
                    "symbol": stock["symbol"],
                    "name": stock["name"],
                    "category": "Stock",
                    "parent_symbol": idx["symbol"],
                    "metadata": {"weight": stock["weight"]}
                })
    
    # Add Sectors
    for sec in sectors:
        all_instruments.append(sec)
        
    # Add ETFs (mapping from constants.ts)
    etfs = [
        {"symbol": "SOXX", "name": "Semiconductors", "parent": "XLK", "color": "#34d399"},
        {"symbol": "USO", "name": "Oil Fund", "parent": "DBC", "color": "#a3e635"},
        # ... add more as needed
    ]
    
    for etf in etfs:
        all_instruments.append({
            "symbol": etf["symbol"],
            "name": etf["name"],
            "category": "ETF",
            "parent_symbol": etf["parent"],
            "color": etf["color"]
        })
        
    # Upsert to Supabase
    print(f"Upserting {len(all_instruments)} instruments...")
    for inst in all_instruments:
        try:
            # Prepare data for Supabase
            data = {
                "symbol": inst["symbol"],
                "name": inst["name"],
                "category": inst["category"],
                "parent_symbol": inst.get("parent_symbol"),
                "color": inst.get("color"),
                "metadata": inst.get("metadata", {})
            }
            
            res = supabase.table("instruments").upsert(data).execute()
            if hasattr(res, 'error') and res.error:
                print(f"Error upserting {inst['symbol']}: {res.error}")
        except Exception as e:
            print(f"Failed to upsert {inst['symbol']}: {e}")
            
    print("Population complete.")

if __name__ == "__main__":
    asyncio.run(populate_instruments())
