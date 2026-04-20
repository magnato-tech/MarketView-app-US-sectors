export type RechartsTooltipPayloadItem = {
  dataKey?: string | number;
  name?: string;
  value?: number;
  color?: string;
};
import type { MarketDataPoint, Period, Interval, SummaryStats } from '../../types';
import type { RangeSummaryRow } from '../../services/analysisService';

export type ChartRangeSelection = {
  rangeStart: number;
  rangeEnd: number;
  anchorIdx: number;
};

export type TrendLine = {
  id: string;
  x1: string;
  y1: number;
  x2: string;
  y2: number;
  color: string;
};

export type ZoomRange = {
  start: number;
  end: number;
};

export type TooltipBaselineMode = 'start' | 'anchor';

export type { RangeSummaryRow };

export type ChartToolbarProps = {
  period: Period;
  interval: Interval;
  onPeriodChange: (p: Period) => void;
  onIntervalChange: (i: Interval) => void;
};

export type MainLineChartProps = {
  data: MarketDataPoint[];
  activeTickers: string[];
  onTooltipContent: (props: { active?: boolean; payload?: RechartsTooltipPayloadItem[]; label?: string | number; rangeSelection?: ChartRangeSelection | null; anchorIndex?: number | null; showLiquidityFlow?: boolean }) => React.ReactNode;
  showSMA?: boolean;
  smaWindow?: number;
  showLiquidityFlow?: boolean;
};

export type SelectedInstrumentBadgesProps = {
  summary: SummaryStats[];
  maxItems: number;
  bubbleClassName: string;
  containerClassName?: string;
  labelClassName?: string;
};

export type DashboardHeaderProps = {
  summary: SummaryStats[];
};

export type AIInsightPanelProps = {
  aiInsight: string;
  period: Period;
};

export type MarketSummaryTableProps = {
  summary: SummaryStats[];
  title?: string;
  showCheckboxes?: boolean;
  activeCheckboxes?: string[];
  onCheckboxToggle?: (symbol: string) => void;
  onRowClick?: (symbol: string, type: 'sector' | 'etf' | 'stock') => void;
  onExitDrilldown?: () => void;
  holdingsWeights?: Record<string, number>;
};

export type RelativAvkastningControlsProps = {
  hasChartData: boolean;
  rangeStatusLabel: string;
  rangeSelection: ChartRangeSelection | null;
  zoomRange: ZoomRange | null;
  tooltipBaseline: TooltipBaselineMode;
  onTooltipBaselineChange: (mode: TooltipBaselineMode) => void;
  vixLeverage: number;
  onVixLeverageChange: (v: number) => void;
  activeTickers: string[];
  showVixSlider: boolean;
  drawingMode: string | null;
  onDrawingModeChange: (color: string | null) => void;
  trendLineCount: number;
  onClearAllTrendLines: () => void;
  isAnalysisView: boolean;
  showMA: boolean;
  onToggleShowMA: () => void;
  onClearRangeSelection: () => void;
  onZoomToSelection: () => void;
  onResetZoom: () => void;
  onOpenAnalysisView: () => void;
  onExportSelectionCsv: () => void;
  benchmarkSymbol: string | null;
  onBenchmarkSymbolChange: (symbol: string | null) => void;
  rangeSummaryData: RangeSummaryRow[] | null;
};
