import React, { useMemo, useState } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea, Cell 
} from 'recharts';
import { TICKERS } from '../../constants';
import type { MainLineChartProps, ChartRangeSelection } from './types';
import { calculateSMA } from '../../services/analysisService';
import { useDashboard, DashboardTab } from '../../contexts/DashboardContext';

export const MainLineChart: React.FC<MainLineChartProps> = ({ 
  data, 
  activeTickers, 
  onTooltipContent,
  showSMA = false,
  smaWindow = 20,
  showLiquidityFlow = false
}) => {
  const { isDarkMode, drilldownSector, activeDrilldownTickers, activeTab } = useDashboard();
  const [rangeSelection, setRangeSelection] = useState<ChartRangeSelection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);

  // Bestem hvilke tickers som faktisk skal vises
  const visibleTickers = useMemo(() => {
    if (drilldownSector && activeDrilldownTickers.length > 0) {
      return activeDrilldownTickers;
    }
    return activeTickers;
  }, [activeTickers, drilldownSector, activeDrilldownTickers]);

  const gridColor = isDarkMode ? "#1e293b" : "#e2e8f0";
  const axisColor = isDarkMode ? "#475569" : "#64748b";

  const { chartData, vixScaleFactor, maxVolume } = useMemo(() => {
    // 1. Calculate VIX scale factor and Max Volume
    let maxSektor = 0;
    let maxVix = 0;
    let currentMaxVolume = 0;

    // Enrich data with SMA, scaled VIX and Aggregated Dollar Volume
    const enrichedData = data.map(d => {
      const newPoint = { ...d };
      
      // Beregn aggregert dollar-volum for de synlige tickerne
      let totalDollarVolume = 0;
      visibleTickers.forEach(sym => {
        const vol = typeof d[`${sym}_dollar_volume`] === 'number' ? d[`${sym}_dollar_volume`] as number : 0;
        totalDollarVolume += vol;
      });
      newPoint['total_dollar_volume'] = totalDollarVolume;

      // Finn max aggregert volum for skalering
      if (totalDollarVolume > currentMaxVolume) currentMaxVolume = totalDollarVolume;

      // Finn max verdier for VIX-skalering
      visibleTickers.forEach(sym => {
        const val = Math.abs(typeof d[sym] === 'number' ? d[sym] as number : 0);
        if (sym === '^VIX') {
          if (val > maxVix) maxVix = val;
        } else {
          if (val > maxSektor) maxSektor = val;
        }
      });

      if (typeof d['^VIX'] === 'number') {
        newPoint['^VIX_SCALED'] = (d['^VIX'] as number) * 1.0; // Midlertidig faktor
      }
      
      return newPoint;
    });

    // Beregn endelig VIX-faktor
    const factor = (maxVix > 0 && maxSektor > 0) ? (maxSektor / maxVix) * 0.8 : 1.0;
    
    // Oppdater VIX_SCALED med riktig faktor og legg til SMA
    let finalData = enrichedData.map(d => ({
      ...d,
      '^VIX_SCALED': typeof d['^VIX'] === 'number' ? (d['^VIX'] as number) * factor : undefined
    }));

    if (showSMA) {
      visibleTickers.forEach(sym => {
        const key = sym === '^VIX' ? '^VIX_SCALED' : sym;
        const prices = finalData.map(d => typeof d[key] === 'number' ? d[key] as number : 0);
        const smaValues = calculateSMA(prices, smaWindow);
        
        finalData = finalData.map((d, i) => ({
          ...d,
          [`${sym}_SMA`]: smaValues[i]
        }));
      });
    }

    if (showLiquidityFlow) {
      visibleTickers.forEach(sym => {
        if (sym === '^VIX') return;
        
        // Finn baseline volum (første gyldige datapunkt)
        let baselineVol = 0;
        for (const d of finalData) {
          const v = typeof d[`${sym}_dollar_volume`] === 'number' ? d[`${sym}_dollar_volume`] as number : 0;
          if (v > 0) {
            baselineVol = v;
            break;
          }
        }

        // Beregn indeksert endring % fra start
        const indexedShares = finalData.map(d => {
          const currentVol = typeof d[`${sym}_dollar_volume`] === 'number' ? d[`${sym}_dollar_volume`] as number : 0;
          if (baselineVol === 0) return 0;
          return ((currentVol - baselineVol) / baselineVol) * 100;
        });

        // Bruk 5-dagers SMA for å glatte ut kapitalstrømmen
        const smoothedFlow = calculateSMA(indexedShares, 5);
        
        finalData = finalData.map((d, i) => ({
          ...d,
          [`${sym}_FLOW`]: smoothedFlow[i]
        }));
      });
    }

    return { chartData: finalData, vixScaleFactor: factor, maxVolume: currentMaxVolume };
  }, [data, visibleTickers, showSMA, smaWindow, showLiquidityFlow]);

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

  // Finn fargen til den primære sektoren for volum-histogrammet
  const primaryTicker = visibleTickers[0];
  const primaryColor = TICKERS.find(t => t.symbol === primaryTicker)?.color || '#3b82f6';

  return (
    <div className="relative w-full h-full group">
      <ComposedChart 
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
          yAxisId="left"
          stroke={axisColor}
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}%`}
          fontFamily="monospace"
        />
        <YAxis
          yAxisId="volume"
          orientation="right"
          domain={[0, maxVolume * 4]} // Volum tar opp nederste 25%
          hide={true}
        />
        <YAxis
          yAxisId="flow"
          orientation="right"
          domain={['auto', 'auto']} // La skalaen tilpasse seg momentumet
          hide={!showLiquidityFlow}
          stroke={axisColor}
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => `${val > 0 ? '+' : ''}${val.toFixed(0)}%`}
          fontFamily="monospace"
          label={{ 
            value: 'Volum-momentum %', 
            angle: 90, 
            position: 'insideRight', 
            style: { fontSize: '10px', fill: axisColor, fontWeight: 'bold' },
            offset: 10
          }}
        />
        <Tooltip 
          content={(props) => onTooltipContent({ ...props, rangeSelection, anchorIndex, showLiquidityFlow })} 
          active={anchorIndex !== null || isDragging ? true : undefined}
          cursor={{ stroke: isDarkMode ? '#334155' : '#e2e8f0', strokeWidth: 1 }}
        />
        <Legend
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{ 
            paddingTop: '30px', 
            fontSize: '11px', 
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
          iconType="plainline"
          formatter={(value: string) => (
            <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>{value}</span>
          )}
        />
        
        {rangeSelection && (
          <ReferenceArea
            yAxisId="left"
            x1={data[Math.min(rangeSelection.rangeStart, rangeSelection.rangeEnd)]?.timestamp}
            x2={data[Math.max(rangeSelection.rangeStart, rangeSelection.rangeEnd)]?.timestamp}
            strokeOpacity={0.3}
            fill="#3b82f6"
            fillOpacity={0.1}
          />
        )}

        {/* Aggregert Volum Histogram (Dollar Volume) */}
        <Bar
          yAxisId="volume"
          dataKey="total_dollar_volume"
          name="Total verdi handlet"
          fill={primaryColor}
          opacity={0.15}
          radius={[2, 2, 0, 0]}
          legendType="none"
        >
          {chartData.map((entry, index) => {
            // Fargelegg basert på gjennomsnittlig retning for alle valgte sektorer
            let totalChange = 0;
            let count = 0;
            visibleTickers.forEach(sym => {
              if (sym !== '^VIX') {
                const currentVal = entry[sym] as number;
                const prevVal = index > 0 ? chartData[index - 1][sym] as number : currentVal;
                totalChange += (currentVal - prevVal);
                count++;
              }
            });
            const isUp = count > 0 ? totalChange >= 0 : true;
            return (
              <Cell 
                key={`cell-${index}`} 
                fill={isUp ? '#10b981' : '#ef4444'} 
                opacity={0.2}
              />
            );
          })}
        </Bar>

        {visibleTickers.map(sym => {
        const ticker = TICKERS.find(t => t.symbol === sym);
        if (!ticker) return null;
        
        const dataKey = sym === '^VIX' ? '^VIX_SCALED' : sym;
        const displayName = sym === '^VIX' 
          ? `${ticker.name} (auto-skalert ${vixScaleFactor.toFixed(2)}x)` 
          : (activeTab === 'analysis' ? `${ticker.name} (Pris %)` : ticker.name);

        const lines = [
          <Line
            yAxisId="left"
            key={sym}
            type="monotone"
            dataKey={dataKey}
            name={displayName}
            stroke={ticker.color}
            strokeWidth={sym.startsWith('^') ? 3 : 2}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0 }}
            animationDuration={1500}
            connectNulls
          />
        ];

        if (showSMA) {
          lines.push(
            <Line
              yAxisId="left"
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
              connectNulls
            />
          );
        }

        if (showLiquidityFlow && sym !== '^VIX') {
          lines.push(
            <Line
              yAxisId="flow"
              key={`${sym}_FLOW`}
              type="monotone"
              dataKey={`${sym}_FLOW`}
              name={`${ticker.name} (Volum %)`}
              stroke={ticker.color}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              legendType="plainline"
              animationDuration={1500}
              connectNulls
              strokeOpacity={0.6}
            />
          );
        }

        return lines;
      })}
      </ComposedChart>
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
