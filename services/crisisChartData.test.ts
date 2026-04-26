import { describe, expect, it } from 'vitest';
import {
  newestCrisisLogRow,
  parseCrisisLogRows,
  rowsToChartPoints,
  sortCrisisLogChronological,
} from './crisisChartData';

describe('crisisChartData', () => {
  it('sorts chronological', () => {
    const rows = parseCrisisLogRows([
      { id: 2, ts_utc: '2026-04-26T22:00:00Z', crisis_index: 20, critical_sell: false, asian_grid_lock: false },
      { id: 1, ts_utc: '2026-04-26T20:00:00Z', crisis_index: 18, critical_sell: false, asian_grid_lock: false },
    ]);
    const s = sortCrisisLogChronological(rows);
    expect(s[0].crisis_index).toBe(18);
    expect(s[1].crisis_index).toBe(20);
  });

  it('newestCrisisLogRow picks latest ts', () => {
    const rows = parseCrisisLogRows([
      { id: 1, ts_utc: '2026-04-26T20:00:00Z', crisis_index: 1, critical_sell: false, asian_grid_lock: false },
      { id: 2, ts_utc: '2026-04-26T23:00:00Z', crisis_index: 2, critical_sell: false, asian_grid_lock: false },
    ]);
    expect(newestCrisisLogRow(rows)?.crisis_index).toBe(2);
  });

  it('rowsToChartPoints produces ascending labels', () => {
    const rows = parseCrisisLogRows([
      { id: 2, ts_utc: '2026-04-26T22:00:00Z', crisis_index: 20, critical_sell: false, asian_grid_lock: false },
      { id: 1, ts_utc: '2026-04-26T20:00:00Z', crisis_index: 18, critical_sell: false, asian_grid_lock: false },
    ]);
    const pts = rowsToChartPoints(rows);
    expect(pts.length).toBe(2);
    expect(pts[0].crisis_index).toBe(18);
    expect(pts[1].crisis_index).toBe(20);
  });
});
