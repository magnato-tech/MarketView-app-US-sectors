-- Tabell for instrument-metadata
CREATE TABLE IF NOT EXISTS instruments (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Sector', 'ETF', 'Stock', 'Index')),
  parent_symbol TEXT REFERENCES instruments(symbol),
  color TEXT,
  description_no TEXT,
  description_en TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabell for sanntids-KPIer
CREATE TABLE IF NOT EXISTS market_stats (
  symbol TEXT PRIMARY KEY REFERENCES instruments(symbol) ON DELETE CASCADE,
  last_price NUMERIC,
  change_pct NUMERIC,
  volatility NUMERIC,
  max_drawdown NUMERIC,
  relative_strength NUMERIC,
  momentum_score NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indekser for raskere oppslag
CREATE INDEX IF NOT EXISTS idx_instruments_parent ON instruments(parent_symbol);
CREATE INDEX IF NOT EXISTS idx_instruments_category ON instruments(category);

-- Aktiver RLS
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_stats ENABLE ROW LEVEL SECURITY;

-- Slett gamle policier hvis de eksisterer for å unngå feil ved re-kjøring
DROP POLICY IF EXISTS "Allow public read access on instruments" ON instruments;
DROP POLICY IF EXISTS "Allow public read access on market_stats" ON market_stats;
DROP POLICY IF EXISTS "Allow service_role full access on instruments" ON instruments;
DROP POLICY IF EXISTS "Allow service_role full access on market_stats" ON market_stats;

-- Tillat alle å lese (frontend)
CREATE POLICY "Allow public read access on instruments" ON instruments FOR SELECT USING (true);
CREATE POLICY "Allow public read access on market_stats" ON market_stats FOR SELECT USING (true);

-- Tillat alle roller (inkludert anon/authenticated) å gjøre alt
-- OBS: Dette er kun for initial populering hvis service_role-nøkkelen er feil
-- Vi endrer den tilbake til service_role etterpå
CREATE POLICY "Allow all access on instruments" ON instruments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on market_stats" ON market_stats FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for these tables (Safe version)
DO $$
BEGIN
  -- Legg til instruments hvis den ikke allerede er med
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'instruments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE instruments;
    END IF;

    -- Legg til market_stats hvis den ikke allerede er med
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'market_stats'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE market_stats;
    END IF;
  END IF;
END $$;
