/**
 * Felles regler for Crisis Monitor (UI + analytiker).
 *
 * twd_usd i databasen = Alpha Vantage «TWD → USD» = USD per 1 TWD (typisk ~0,03).
 * Noterte kurs «TWD per 1 USD» = 1 / twd_usd (typisk ~33).
 */

export const TWD_PER_ONE_USD_STRAIN = 33;
export const HELIUM_PRICE_CRITICAL_USD = 150;

/**
 * Maks alder på last_heartbeat før UI viser «offline» / grå prikk.
 * Standard `kinvest_monitor.py --loop` bruker 3600 s; 75 min gir margin etter hver timekjøring.
 */
export const HEARTBEAT_OK_MS = 75 * 60 * 1000;

export const HEARTBEAT_OK_MINUTES = Math.round(HEARTBEAT_OK_MS / 60_000);

export type CrisisVisualTier = 'offline' | 'grid_lock' | 'red' | 'yellow' | 'green';

export type EngineStatusKpiRow = {
  id: number;
  last_heartbeat: string;
  status: string;
  crisis_index: number | null;
  critical_sell: boolean | null;
  asian_grid_lock: boolean | null;
  taiwan_reserve_pct?: number | null;
  helium_price_usd?: number | null;
  twd_usd?: number | null;
};

/** TWD per én USD. `twd_usd` må være > 0 (USD per TWD). */
export function twdPerOneUsd(twdUsd: number | null | undefined): number | null {
  if (twdUsd == null || !Number.isFinite(twdUsd) || twdUsd <= 0) return null;
  return 1 / twdUsd;
}

export function isRedKpiTier(row: Pick<EngineStatusKpiRow, 'crisis_index' | 'taiwan_reserve_pct'>): boolean {
  const ci = row.crisis_index;
  const tw = row.taiwan_reserve_pct;
  return (ci != null && Number.isFinite(ci) && ci > 75) || (tw != null && Number.isFinite(tw) && tw < 6);
}

export function isYellowKpiTier(row: Pick<EngineStatusKpiRow, 'crisis_index' | 'taiwan_reserve_pct'>): boolean {
  const ci = row.crisis_index;
  const tw = row.taiwan_reserve_pct;
  return (ci != null && Number.isFinite(ci) && ci > 50) || (tw != null && Number.isFinite(tw) && tw < 9);
}

/**
 * Én «vinner»-tilstand: verst sjanse vinner (grid > rød KPI > gul KPI > grønn).
 * Drift uten fersk heartbeat eller uten OPERATIONAL gir ikke grønn.
 */
export function computeCrisisVisualTier(
  row: EngineStatusKpiRow | null,
  opts: { heartbeatFresh: boolean; operational: boolean }
): CrisisVisualTier {
  if (!opts.heartbeatFresh) return 'offline';
  if (row?.asian_grid_lock === true) return 'grid_lock';
  if (row && isRedKpiTier(row)) return 'red';
  if (row && isYellowKpiTier(row)) return 'yellow';
  if (!opts.operational) return 'yellow';
  return 'green';
}

export function heartbeatFreshFromRow(row: EngineStatusKpiRow | null): boolean {
  const raw = row?.last_heartbeat;
  if (!raw) return false;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < HEARTBEAT_OK_MS;
}

export function isOperationalRow(row: EngineStatusKpiRow | null): boolean {
  return (row?.status ?? '').toUpperCase() === 'OPERATIONAL';
}

/**
 * Analytiker-linjer: verst først (samme prioritet som visuell tier for KPI).
 * Taiwan/rød nivå kommer før helium/TWD slik at «rød Taiwan» ikke drukner i «grønn gass».
 */
export function getAnalystVerdictLines(row: EngineStatusKpiRow | null, isNo: boolean): string[] {
  if (!row) return [];

  const lines: string[] = [];
  const lock = row.asian_grid_lock === true;
  const red = isRedKpiTier(row);
  const kurs = twdPerOneUsd(row.twd_usd);
  const twdStrain = kurs != null && kurs > TWD_PER_ONE_USD_STRAIN;
  const hel = row.helium_price_usd;
  const helHigh = hel != null && Number.isFinite(hel) && hel > HELIUM_PRICE_CRITICAL_USD;

  if (lock) {
    lines.push(
      isNo
        ? '🚨 SYSTEMKOLLAPS: Aktiver nødplan for porteføljen.'
        : '🚨 SYSTEM COLLAPSE: Activate emergency portfolio plan.'
    );
  } else if (red) {
    lines.push(
      isNo
        ? 'Krisevarsel: Svært høy indeks og/eller kritisk lav nettreserve i Taiwan — dette overstyrer «fine» isolerte priser (f.eks. helium).'
        : 'Crisis alert: Very high index and/or critically low Taiwan grid reserve — this overrides isolated «fine» prices (e.g. helium).'
    );
  }

  if (twdStrain) {
    lines.push(
      isNo
        ? 'Kapitalflukt fra Taiwan pågår. Markedet ignorerer fysisk risiko.'
        : 'Capital flight from Taiwan underway. The market is underpricing physical risk.'
    );
  }

  if (helHigh) {
    lines.push(
      isNo
        ? 'ADVARSEL: Kritisk mangel på industrigass detektert. Chip-forsyningskjeden er i fare.'
        : 'WARNING: Critical industrial gas shortage detected. The chip supply chain is at risk.'
    );
  }

  return lines;
}
