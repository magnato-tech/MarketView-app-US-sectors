import { MarketDataPoint, SummaryStats, Period, Interval } from '../types';
import { TICKERS } from '../constants';

const periodMap: Record<Period, string> = {
  '1d': '1d',
  '5d': '5d',
  '1mo': '1mo',
  '2mo': '2mo',
  '3mo': '3mo',
  '6mo': '6mo',
  '1y': '1y',
  '2y': '2y'
};

const intervalMap: Record<Interval, string> = {
  '1d': '1d',
  '1wk': '1wk',
  '1mo': '1mo'
};

export const fetchMarketData = async (
  symbols: string[],
  period: Period,
  interval: Interval
): Promise<{ data: MarketDataPoint[]; summary: SummaryStats[] }> => {
  try {
    const responses = await Promise.all(
      symbols.map(symbol =>
        fetch(`/api/yahoo/v8/finance/chart/${symbol}?period1=0&period2=9999999999&interval=${intervalMap[interval]}&range=${periodMap[period]}`)
          .then(response => response.json())
      )
    );

    const data: MarketDataPoint[] = [];
    const summary: SummaryStats[] = [];

    symbols.forEach((symbol, index) => {
      const result = responses[index];
      if (!result.quoteResponse || !result.quoteResponse.result || result.quoteResponse.result.length === 0) {
        return;
      }

      const quote = result.quoteResponse.result[0];
      const historicalData = result.chart.result[0].indicators.quote[0];

      const firstClose = historicalData.close[0];
      const lastClose = historicalData.close[historicalData.close.length - 1];
      const percentChange = ((lastClose - firstClose) / firstClose) * 100;

      summary.push({
        symbol,
        name: quote.longName || symbol,
        lastPrice: lastClose,
        percentChange: parseFloat(percentChange.toFixed(2)),
        color: TICKERS.find(t => t.symbol === symbol)?.color ?? '#64748b'
      });

      const timestamps = new Set<string>();
      historicalData.timestamp.forEach(ts => timestamps.add(new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })));

      timestamps.forEach(timestamp => {
        const point: MarketDataPoint = { timestamp };
        symbols.forEach(sym => {
          const symbolData = responses.find(res => res.quoteResponse.result[0].symbol === sym);
          if (symbolData && symbolData.chart.result[0].indicators.quote[0]) {
            const quoteData = symbolData.chart.result[0].indicators.quote[0];
            const index = quoteData.timestamp.indexOf(timestamp);
            point[sym] = index !== -1 ? parseFloat(quoteData.close[index].toFixed(2)) : null;
          } else {
            point[sym] = null;
          }
        });
        data.push(point);
      });
    });

    return { data, summary };
  } catch (error) {
    console.error("Failed to fetch market data", error);
    return { data: [], summary: [] };
  }
};
