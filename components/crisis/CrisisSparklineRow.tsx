import React, { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { useCrisisEngine } from '../../contexts/CrisisEngineContext';
import { rowsToChartPoints } from '../../services/crisisChartData';

const SPARKS = [
  { key: 'crisis_index' as const, label: 'Index', color: '#22d3ee' },
  { key: 'helium_price_usd' as const, label: 'He', color: '#a78bfa' },
  { key: 'taiwan_reserve_pct' as const, label: 'TW%', color: '#34d399' },
  { key: 'twd_usd' as const, label: 'TWD/USD', color: '#f472b6' },
];

type Props = { isNo: boolean };

export const CrisisSparklineRow: React.FC<Props> = ({ isNo }) => {
  const { crisisLogRows } = useCrisisEngine();
  const points = useMemo(() => {
    const all = rowsToChartPoints(crisisLogRows);
    return all.length > 48 ? all.slice(-48) : all;
  }, [crisisLogRows]);

  if (points.length < 2) return null;

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
        {isNo ? 'Siste observasjoner (sparklines)' : 'Recent observations (sparklines)'}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {SPARKS.map(s => {
          const data = points.map(p => ({ v: p[s.key] }));
          return (
            <div
              key={s.key}
              className="rounded-lg border border-slate-700/60 bg-slate-950/50 light:bg-slate-50 light:border-slate-200 p-2"
            >
              <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">{s.label}</p>
              <div className="h-[52px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <YAxis domain={['auto', 'auto']} hide width={0} />
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={s.color}
                      strokeWidth={1.5}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
