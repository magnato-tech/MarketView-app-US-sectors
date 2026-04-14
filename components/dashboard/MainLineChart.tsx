import React, { useMemo, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea 
} from 'recharts';
import { TICKERS } from '../../constants';
import type { MainLineChartProps, ChartRangeSelection } from './types';
import { calculateSMA } from '../../services/analysisService';

export const MainLineChart: React.FC<MainLineChartProps> = ({ 
  data, 
  activeTickers, 
  onTooltipContent,
  showSMA = false,
  smaWindow = 20
}) => {
  const [rangeSelection, setRangeSelection] = useState<ChartRangeSelection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);

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

  const handleMouseDown = (e: any) => {
    if (e && e.activeTooltipIndex != null) {
      setRangeSelection({
        rangeStart: e.activeTooltipIndex,
        rangeEnd: e.activeTooltipIndex,
        anchorIdx: e.activeTooltipIndex
      });
      setIsDragging(true);
      setAnchorIndex(null); // Clear sticky tooltip when starting a new drag
    }
  };

  const handleMouseMove = (e: any) => {
    if (isDragging && e && e.activeTooltipIndex != null && rangeSelection) {
      setRangeSelection({
        ...rangeSelection,
        rangeEnd: e.activeTooltipIndex
      });
    }
  };

  const handleMouseUp = (e: any) => {
    setIsDragging(false);
    
    // If start and end are the same, it's a simple click
    if (rangeSelection && rangeSelection.rangeStart === rangeSelection.rangeEnd) {
      if (anchorIndex === rangeSelection.rangeStart) {
        setAnchorIndex(null); // Toggle off if clicking the same spot
      } else {
        setAnchorIndex(rangeSelection.rangeStart); // Lock tooltip to this spot
      }
      setRangeSelection(null);
    } else if (rangeSelection) {
      // It was a drag, lock the tooltip to the end of the range
      setAnchorIndex(rangeSelection.rangeEnd);
    }
  };

  const clearSelection = () => {
    setRangeSelection(null);
    setAnchorIndex(null);
  };

  return (
    <div className="relative w-full h-full group">
      <LineChart 
        data={chartData}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
      >
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
        <Tooltip 
          content={(props) => onTooltipContent({ ...props, rangeSelection, anchorIndex })} 
          active={anchorIndex !== null || isDragging ? true : undefined}
          coordinate={anchorIndex !== null ? undefined : undefined} // Recharts handles this
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }}
          iconType="circle"
        />
        
        {rangeSelection && (
          <ReferenceArea
            x1={data[Math.min(rangeSelection.rangeStart, rangeSelection.rangeEnd)]?.timestamp}
            x2={data[Math.max(rangeSelection.rangeStart, rangeSelection.rangeEnd)]?.timestamp}
            strokeOpacity={0.3}
            fill="#3b82f6"
            fillOpacity={0.1}
          />
        )}

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
    {rangeSelection && !isDragging && (
      <button
        onClick={clearSelection}
        className="absolute top-2 right-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-slate-700 transition-colors z-10"
      >
        Nullstill valg
      </button>
    )}
    </div>
  );
};
