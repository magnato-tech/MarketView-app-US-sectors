import React, { useMemo, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea 
} from 'recharts';
import { TICKERS } from '../../constants';
import type { MainLineChartProps, ChartRangeSelection } from './types';
import { calculateSMA } from '../../services/analysisService';
import { useDashboard } from '../../contexts/DashboardContext';

export const MainLineChart: React.FC<MainLineChartProps> = ({ 
  data, 
  activeTickers, 
  onTooltipContent,
  showSMA = false,
  smaWindow = 20
}) => {
  const { isDarkMode } = useDashboard();
  const [rangeSelection, setRangeSelection] = useState<ChartRangeSelection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);

  const gridColor = isDarkMode ? "#1e293b" : "#e2e8f0";
  const axisColor = isDarkMode ? "#475569" : "#64748b";

  const { chartData, vixScaleFactor } = useMemo(() => {
    // 1. Calculate VIX scale factor
    let maxSektor = 0;
    let maxVix = 0;

    data.forEach(d => {
      activeTickers.forEach(sym => {
        const val = Math.abs(typeof d[sym] === 'number' ? d[sym] as number : 0);
        if (sym === '^VIX') {
          if (val > maxVix) maxVix = val;
        } else {
          if (val > maxSektor) maxSektor = val;
        }
      });
    });

    // Default to 1.0 if no data or VIX is not active
    const factor = (maxVix > 0 && maxSektor > 0) ? (maxSektor / maxVix) * 0.8 : 1.0;

    // 2. Enrich data with SMA and scaled VIX
    let enrichedData = data.map(d => {
      const newPoint = { ...d };
      if (typeof d['^VIX'] === 'number') {
        newPoint['^VIX_SCALED'] = (d['^VIX'] as number) * factor;
      }
      return newPoint;
    });

    if (showSMA) {
      activeTickers.forEach(sym => {
        const key = sym === '^VIX' ? '^VIX_SCALED' : sym;
        const prices = enrichedData.map(d => typeof d[key] === 'number' ? d[key] as number : 0);
        const smaValues = calculateSMA(prices, smaWindow);
        
        enrichedData = enrichedData.map((d, i) => ({
          ...d,
          [`${sym}_SMA`]: smaValues[i]
        }));
      });
    }

    return { chartData: enrichedData, vixScaleFactor: factor };
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
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="timestamp"
          stroke={axisColor}
          fontSize={10}
          tickLine={false}
          axisLine={false}
          dy={10}
          fontFamily="monospace"
        />
        <YAxis
          stroke={axisColor}
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
        
        const dataKey = sym === '^VIX' ? '^VIX_SCALED' : sym;
        const displayName = sym === '^VIX' 
          ? `${ticker.name} (auto-skalert ${vixScaleFactor.toFixed(2)}x)` 
          : ticker.name;

        const lines = [
          <Line
            key={sym}
            type="monotone"
            dataKey={dataKey}
            name={displayName}
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
