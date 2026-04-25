-- Supabase Schema for AI Trading Bot Factory

-- 1. Bots Table (DNA and Lifecycle)
CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL, -- 'Draft', 'Candidate', 'Published', 'Deployed'
  dna JSONB NOT NULL, -- Full BotDNA object
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Evaluations Table (Backtest Results)
CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- '1y', '2y', '5y'
  metrics JSONB NOT NULL, -- {totalReturn, marketReturn, maxDrawdown, sharpeRatio, winRate, tradeCount}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Deployments Table (Virtual Portfolio)
CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
  bot_version TEXT NOT NULL,
  status TEXT NOT NULL, -- 'Active', 'Paused', 'Stopped'
  allocated_capital_nok NUMERIC NOT NULL,
  allocated_pct NUMERIC,
  symbol TEXT DEFAULT 'SPY',
  benchmark_symbol TEXT DEFAULT '^GSPC',
  interval TEXT DEFAULT '1wk',
  live_balance_nok NUMERIC,
  last_processed_at TEXT,
  performance JSONB, -- DeploymentPerformance
  equity_curve JSONB, -- DeploymentEquityPoint[]
  live_equity_curve JSONB, -- DeploymentEquityPoint[]
  transactions JSONB, -- DeploymentTransaction[]
  backtest_performance JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Evolution Events (Factory Log)
CREATE TABLE IF NOT EXISTS evolution_events (
  id TEXT PRIMARY KEY,
  cycle_number INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'spawn', 'mutate', etc.
  bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
  source_bot_ids JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Factory State
CREATE TABLE IF NOT EXISTS factory_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  cycle_number INTEGER NOT NULL DEFAULT 0,
  active_bot_ids JSONB DEFAULT '[]',
  last_run_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{"maxPopulation": 10, "cycleIntervalHours": 24, "ollamaEnabled": true}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS (Row Level Security)
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evolution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_state ENABLE ROW LEVEL SECURITY;

-- Create Policies (Public access for now, as requested for local-first transition)
CREATE POLICY "Public Read Access" ON bots FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON bots FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON bots FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access" ON bots FOR DELETE USING (true);

CREATE POLICY "Public Read Access" ON evaluations FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON evaluations FOR UPDATE USING (true);

CREATE POLICY "Public Read Access" ON deployments FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON deployments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON deployments FOR UPDATE USING (true);

CREATE POLICY "Public Read Access" ON evolution_events FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON evolution_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Access" ON factory_state FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON factory_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON factory_state FOR UPDATE USING (true);
