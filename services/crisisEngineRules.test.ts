import { describe, expect, it } from 'vitest';
import {
  computeCrisisVisualTier,
  getAnalystVerdictLines,
  twdPerOneUsd,
  TWD_PER_ONE_USD_STRAIN,
} from './crisisEngineRules';

describe('twdPerOneUsd', () => {
  it('maps Alpha Vantage USD-per-TWD to TWD per 1 USD', () => {
    expect(twdPerOneUsd(0.03030303)).toBeCloseTo(33, 1);
    expect(twdPerOneUsd(1 / 40)).toBeCloseTo(40, 5);
  });

  it('returns null for non-positive or missing', () => {
    expect(twdPerOneUsd(null)).toBeNull();
    expect(twdPerOneUsd(0)).toBeNull();
    expect(twdPerOneUsd(-1)).toBeNull();
  });
});

describe('computeCrisisVisualTier', () => {
  const baseRow = {
    id: 1,
    last_heartbeat: new Date().toISOString(),
    status: 'OPERATIONAL',
    crisis_index: 10 as number | null,
    critical_sell: false as boolean | null,
    asian_grid_lock: false as boolean | null,
    taiwan_reserve_pct: 12 as number | null,
    helium_price_usd: 50 as number | null,
    twd_usd: 1 / 34 as number | null,
  };

  it('prioritises grid lock over red KPI', () => {
    const row = {
      ...baseRow,
      asian_grid_lock: true,
      crisis_index: 90,
      taiwan_reserve_pct: 3,
    };
    expect(computeCrisisVisualTier(row, { heartbeatFresh: true, operational: true })).toBe('grid_lock');
  });

  it('prioritises red KPI over low helium (same row)', () => {
    const row = {
      ...baseRow,
      crisis_index: 80,
      helium_price_usd: 10,
    };
    expect(computeCrisisVisualTier(row, { heartbeatFresh: true, operational: true })).toBe('red');
  });

  it('returns offline when heartbeat is stale', () => {
    const row = { ...baseRow, asian_grid_lock: true };
    expect(computeCrisisVisualTier(row, { heartbeatFresh: false, operational: true })).toBe('offline');
  });
});

describe('getAnalystVerdictLines TWD strain', () => {
  it('uses 1/twd_usd > 33, not raw twd_usd', () => {
    const rowOk = {
      id: 1,
      last_heartbeat: '',
      status: 'OPERATIONAL',
      crisis_index: 10,
      critical_sell: false,
      asian_grid_lock: false,
      twd_usd: 1 / 30,
      helium_price_usd: 10,
    };
    const linesOk = getAnalystVerdictLines(rowOk, true);
    expect(linesOk.some(l => l.includes('Kapitalflukt'))).toBe(false);

    const rowStrain = { ...rowOk, twd_usd: 1 / 35 };
    const linesStrain = getAnalystVerdictLines(rowStrain, true);
    expect(linesStrain.some(l => l.includes('Kapitalflukt'))).toBe(true);
  });

  it('does not treat raw 0.04 as above 33 TWD/USD', () => {
    const row = {
      id: 1,
      last_heartbeat: '',
      status: 'OPERATIONAL',
      crisis_index: 10,
      critical_sell: false,
      asian_grid_lock: false,
      twd_usd: 0.04,
      helium_price_usd: 10,
    };
    const kurs = twdPerOneUsd(row.twd_usd);
    expect(kurs).not.toBeNull();
    expect(kurs!).toBeLessThan(TWD_PER_ONE_USD_STRAIN);
  });
});
