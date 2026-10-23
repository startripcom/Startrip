/**
 * Formats any cryptocurrency or fiat asset amount to strictly 2 decimal places with US comma separators.
 * Handles strings, numbers, null/undefined, and raw Stellar Horizon DecimalField strings (e.g. "25.0000000").
 * Example outputs:
 *  - "25.0000000" -> "25.00"
 *  - 12092        -> "12,092.00"
 *  - "1140.13"    -> "1,140.13"
 *  - null         -> "0.00"
 */
export function formatAssetAmount(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0.00';
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Calculates estimated USD value based on asset type and amount, formatted to 2 decimal places.
 */
export function formatUsdValue(amount: number | string | undefined | null, assetCode: string = 'USDC'): string {
  if (amount === undefined || amount === null || amount === '') return '$0.00';
  const n = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
  if (isNaN(n)) return '$0.00';
  const code = (assetCode || '').toUpperCase();
  const rate = code === 'USDC' || code === 'USDT' ? 1.0 : 0.12;
  const usd = n * rate;
  return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
