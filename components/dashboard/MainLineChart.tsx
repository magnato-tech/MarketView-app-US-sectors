import React, { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { TICKERS } from '../../constants';
import type { MainLineChartProps } from './types';
import { calculateSMA } from '../../services/analysisService';

export const MainLineChart: React.FC<MainLineChartProps> = ({ 
  data, 
  activeTickers, 
  onTooltipContent,
  showSMA = false,
  smaWindow = 20
}) => {
  const chartData = useMemo(() => {
    if (!showSMA) return data;

    let enrichedData = [...data];
    activeTickers.forEach(sym => {
      const prices = data.map(d => typeof d[sym] === 'number' ? d[sym] as number : 0);
      const smaValues = calculateSMA(prices, smaWindow);
      
      enrichedData = enrichedData.map((d, i) => ({
        ...d,
        [`${sym}_SMA`]: smaValues[i]
      }));
    });
    return enrichedData;
  }, [data, activeTickers, showSMA, smaWindow]);

  return (
    <LineChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
      <XAxis
        dataKey="timestamp"
        stroke="#475569"
        fontSize={10}
        tickLine={false}
        axisLine={false}
        dy={10}
        fontFamily="monospace"
      />
      <YAxis
        stroke="#475569"
        fontSize={10}
        tickLine={false}
        axisLine={false}
        tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}%`}
        fontFamily="monospace"
      />
      <Tooltip content={onTooltipContent} />
      <Legend
        wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }}
        iconType="circle"
      />
      {activeTickers.map(sym => {
        const ticker = TICKERS.find(t => t.symbol === sym);
        if (!ticker) return null;
        
        const lines = [
          <Line
            key={sym}
            type="monotone"
            dataKey={sym}
            name={ticker.name}
            stroke={ticker.color}
            strokeWidth={sym.startsWith('^') ? 3 : 2}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0 }}
            animationDuration={1500}
          />
        ];

        if (showSMA) {
          lines.push(
            <Line
              key={`${sym}_SMA`}
              type="monotone"
              dataKey={`${sym}_SMA`}
              name={`${ticker.name} (SMA ${smaWindow})`}
              stroke={ticker.color}
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              legendType="none"
              animationDuration={1500}
            />
          );
        }

        return lines;
      })}
    </LineChart>
  );
};
