import sqlite3
import datetime as dt
import random
import json
from pathlib import Path

def seed_historical_data():
    db_path = "kinvest_crisis.db"
    conn = sqlite3.connect(db_path)
    
    # Sjekk om tabellene eksisterer, hvis ikke opprett dem (likt som i kinvest_monitor.py)
    conn.execute("""
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
    """)
    
    # Slett gamle "tomme" rader fra i dag for å rydde opp i grafen
    conn.execute("DELETE FROM crisis_log WHERE taiwan_reserve_pct IS NULL AND ts_utc LIKE '2026-04-26%'")
    
    now = dt.datetime.now(dt.timezone.utc)
    
    # Generer 24 rader (én for hver time det siste døgnet)
    for i in range(24, -1, -1):
        ts = (now - dt.timedelta(hours=i)).isoformat()
        
        # Simuler et gradvis fall i reservene gjennom dagen
        # Starter på 12% og faller mot 7-8%
        base_tw = 12.0 - (random.random() * 2.0) - ( (24-i) / 6.0 )
        base_kr = 11.5 - (random.random() * 1.5) - ( (24-i) / 8.0 )
        
        helium = 163.72 + (random.random() * 0.5)
        twd = 0.03186 + (random.random() * 0.0001)
        nasdaq = 663.91 + (random.random() * 2.0)
        
        # Beregn en fiktiv kriseindeks basert på verdiene
        idx = 15.0
        if base_tw < 8: idx += 15
        if base_kr < 10: idx += 5
        
        conn.execute("""
            INSERT INTO crisis_log (
                ts_utc, taiwan_reserve_pct, korea_reserve_pct, 
                helium_price_usd, twd_usd, nasdaq_proxy, 
                crisis_index, critical_sell, notes_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ts, base_tw, base_kr, 
            helium, twd, nasdaq, 
            idx, 0, json.dumps(["Simulert historikk for trendanalyse"])
        ))
    
    # Vi hopper over engine_status lokalt siden den primært styres via Supabase i dette oppsettet
    # Men vi sikrer at crisis_log har dataene som trengs for grafene
    
    conn.commit()
    conn.close()
    print("Historiske data for det siste dognet er lagt inn i kinvest_crisis.db")

if __name__ == "__main__":
    seed_historical_data()
