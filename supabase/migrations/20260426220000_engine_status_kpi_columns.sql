ALTER TABLE public.engine_status
  ADD COLUMN IF NOT EXISTS taiwan_reserve_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS helium_price_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS twd_usd NUMERIC;
