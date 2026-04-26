import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseClient';
import type { CrisisVisualTier, EngineStatusKpiRow } from '../services/crisisEngineRules';
import {
  computeCrisisVisualTier,
  heartbeatFreshFromRow,
  isOperationalRow,
} from '../services/crisisEngineRules';
import {
  CRISIS_LOG_CHART_LIMIT,
  parseCrisisLogRows,
  type CrisisLogRow,
} from '../services/crisisChartData';

type RealtimeConn = 'idle' | 'subscribed' | 'error';

type CrisisEngineContextValue = {
  supabaseReady: boolean;
  engineRow: EngineStatusKpiRow | null;
  realtimeState: RealtimeConn;
  heartbeatFresh: boolean;
  operational: boolean;
  visualTier: CrisisVisualTier;
  crisisLogRows: CrisisLogRow[];
  crisisLogLoading: boolean;
  crisisLogError: string | null;
};

const CrisisEngineContext = createContext<CrisisEngineContextValue | null>(null);

export const CrisisEngineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const supabaseReady = isSupabaseConfigured();
  const [engineRow, setEngineRow] = useState<EngineStatusKpiRow | null>(null);
  const [realtimeState, setRealtimeState] = useState<RealtimeConn>('idle');
  const [crisisLogRows, setCrisisLogRows] = useState<CrisisLogRow[]>([]);
  const [crisisLogLoading, setCrisisLogLoading] = useState(false);
  const [crisisLogError, setCrisisLogError] = useState<string | null>(null);
  const heartbeatRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabaseReady) return;

    const sb = getSupabaseClient();
    let cancelled = false;

    const loadInitial = async () => {
      const { data, error } = await sb.from('engine_status').select('*').eq('id', 1).maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn('engine_status fetch', error.message);
        setEngineRow(null);
        return;
      }
      if (data) setEngineRow(data as EngineStatusKpiRow);
    };

    void loadInitial();

    const channel: RealtimeChannel = sb
      .channel('engine_status_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'engine_status' },
        payload => {
          const next = payload.new as EngineStatusKpiRow | undefined;
          if (next && typeof next.id === 'number') {
            setEngineRow(next);
          }
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setRealtimeState('subscribed');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeState('error');
      });

    return () => {
      cancelled = true;
      void sb.removeChannel(channel);
    };
  }, [supabaseReady]);

  const loadCrisisLog = useCallback(async () => {
    if (!supabaseReady) return;
    setCrisisLogLoading(true);
    setCrisisLogError(null);
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('crisis_log')
        .select(
          'id, ts_utc, taiwan_reserve_pct, korea_reserve_pct, helium_price_usd, jkm_price_usd, twd_usd, nasdaq_proxy, helium_roc_24h_pct, helium_roc_7d_pct, twd_roc_24h_pct, nasdaq_roc_24h_pct, crisis_index, critical_sell, asian_grid_lock'
        )
        .order('ts_utc', { ascending: false })
        .limit(CRISIS_LOG_CHART_LIMIT);
      if (error) {
        setCrisisLogError(error.message);
        setCrisisLogRows([]);
        return;
      }
      setCrisisLogRows(parseCrisisLogRows(data ?? []));
    } catch (e) {
      setCrisisLogError(e instanceof Error ? e.message : String(e));
      setCrisisLogRows([]);
    } finally {
      setCrisisLogLoading(false);
    }
  }, [supabaseReady]);

  useEffect(() => {
    if (!supabaseReady) return;
    void loadCrisisLog();
  }, [supabaseReady, loadCrisisLog]);

  useEffect(() => {
    if (!supabaseReady) return;
    const hb = engineRow?.last_heartbeat ?? null;
    if (hb === heartbeatRef.current) return;
    heartbeatRef.current = hb;
    if (hb) void loadCrisisLog();
  }, [supabaseReady, engineRow?.last_heartbeat, loadCrisisLog]);

  useEffect(() => {
    if (!supabaseReady) return;
    const id = window.setInterval(() => void loadCrisisLog(), 60_000);
    return () => window.clearInterval(id);
  }, [supabaseReady, loadCrisisLog]);

  const heartbeatFresh = heartbeatFreshFromRow(engineRow);
  const operational = isOperationalRow(engineRow);

  const visualTier = useMemo(
    () => computeCrisisVisualTier(engineRow, { heartbeatFresh, operational }),
    [engineRow, heartbeatFresh, operational]
  );

  const value = useMemo<CrisisEngineContextValue>(
    () => ({
      supabaseReady,
      engineRow,
      realtimeState,
      heartbeatFresh,
      operational,
      visualTier,
      crisisLogRows,
      crisisLogLoading,
      crisisLogError,
    }),
    [
      supabaseReady,
      engineRow,
      realtimeState,
      heartbeatFresh,
      operational,
      visualTier,
      crisisLogRows,
      crisisLogLoading,
      crisisLogError,
    ]
  );

  return <CrisisEngineContext.Provider value={value}>{children}</CrisisEngineContext.Provider>;
};

export function useCrisisEngine(): CrisisEngineContextValue {
  const ctx = useContext(CrisisEngineContext);
  if (!ctx) {
    throw new Error('useCrisisEngine must be used within CrisisEngineProvider');
  }
  return ctx;
}
