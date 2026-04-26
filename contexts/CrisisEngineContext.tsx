import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseClient';
import type { CrisisVisualTier, EngineStatusKpiRow } from '../services/crisisEngineRules';
import {
  computeCrisisVisualTier,
  heartbeatFreshFromRow,
  isOperationalRow,
} from '../services/crisisEngineRules';

type RealtimeConn = 'idle' | 'subscribed' | 'error';

type CrisisEngineContextValue = {
  supabaseReady: boolean;
  engineRow: EngineStatusKpiRow | null;
  realtimeState: RealtimeConn;
  heartbeatFresh: boolean;
  operational: boolean;
  visualTier: CrisisVisualTier;
};

const CrisisEngineContext = createContext<CrisisEngineContextValue | null>(null);

export const CrisisEngineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const supabaseReady = isSupabaseConfigured();
  const [engineRow, setEngineRow] = useState<EngineStatusKpiRow | null>(null);
  const [realtimeState, setRealtimeState] = useState<RealtimeConn>('idle');

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
    }),
    [supabaseReady, engineRow, realtimeState, heartbeatFresh, operational, visualTier]
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
