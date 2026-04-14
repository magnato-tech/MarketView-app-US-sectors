/**
 * Formats a number as a percentage string with a sign and 2 decimal places.
 * Example: 2.45 -> "+2.45%", -1.2 -> "-1.20%"
 */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Returns a color class based on whether a value is positive or negative.
 * Defaults to emerald for positive and rose for negative.
 */
export function getTrendColorClass(value: number, type: 'text' | 'bg' = 'text'): string {
  if (type === 'text') {
    return value >= 0 ? 'text-emerald-400' : 'text-rose-400';
  }
  return value >= 0 ? 'bg-emerald-400' : 'bg-rose-400';
}

/**
 * Returns a more intense color class for tables/stronger UI elements.
 */
export function getStrongTrendColorClass(value: number): string {
  return value >= 0 ? 'text-emerald-500' : 'text-rose-500';
}
