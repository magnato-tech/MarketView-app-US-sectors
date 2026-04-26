/**
 * Felles regler for Crisis Monitor (UI + analytiker).
 *
 * twd_usd i databasen = Alpha Vantage «TWD → USD» = USD per 1 TWD (typisk ~0,03).
 * Noterte kurs «TWD per 1 USD» = 1 / twd_usd (typisk ~33).
 */

export const TWD_PER_ONE_USD_STRAIN = 33;
export const HELIUM_PRICE_WARNING_USD = 155;
export const HELIUM_PRICE_CRITICAL_USD = 165;

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
  korea_reserve_pct?: number | null;
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
  const helCritical = hel != null && Number.isFinite(hel) && hel >= HELIUM_PRICE_CRITICAL_USD;
  const helWarning = hel != null && Number.isFinite(hel) && hel >= HELIUM_PRICE_WARNING_USD;

  if (lock) {
    lines.push(
      isNo
        ? '🚨 SYSTEMKOLLAPS: Fysisk kapasitet i Asia er brutt sammen. Aktiver nødplan.'
        : '🚨 SYSTEM COLLAPSE: Physical capacity in Asia has collapsed. Activate emergency plan.'
    );
  } else if (red) {
    lines.push(
      isNo
        ? '🔴 KRISENIVÅ: Aggregert stress er kritisk høyt. Flere uavhengige systemer (strøm/FX/gass) svikter samtidig.'
        : '🔴 CRISIS LEVEL: Aggregate stress is critically high. Multiple independent systems failing simultaneously.'
    );
  }

  if (twdStrain) {
    lines.push(
      isNo
        ? '⚠️ Valuta-stress: Kapitalflukt fra Taiwan detektert. Markedet underpriser fysisk risiko.'
        : '⚠️ Currency Strain: Capital flight from Taiwan detected. Market is underpricing physical risk.'
    );
  }

  if (helCritical) {
    lines.push(
      isNo
        ? '🚫 KRITISK GASSPRESS: Helium-priser på nivåer som tvinger frem produksjonsstans i wafer-fabs.'
        : '🚫 CRITICAL GAS PRESSURE: Helium prices at levels forcing production halts in wafer fabs.'
    );
  } else if (helWarning) {
    lines.push(
      isNo
        ? '🟡 Gass-varsel: Helium-priser stiger uvanlig raskt. Forsyningskjeden strammer seg til.'
        : '🟡 Gas Warning: Helium prices rising unusually fast. Supply chain is tightening.'
    );
  }

  if (lines.length === 1 && !red && !lock) {
    lines.push(
      isNo
        ? 'Info: Samlet kriseindeks er lav fordi øvrige fundamentale forhold (strøm/valuta) fortsatt er stabile.'
        : 'Note: Overall crisis index remains low as other fundamentals (power/FX) are still stable.'
    );
  }

  return lines;
}
