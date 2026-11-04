// Illustrative figures for the concept page. Not financial advice, not a real rate feed.
export const RATE = 58.42; // PHP per 1 USD
export const FEE_PCT = 0.35;
export const APY = { USD: 0.038, PHP: 0.052 };

const round2 = (n) => Math.round(n * 100) / 100;

/** Swap `amount` of one side into the other. `rate` is "to" units per "from" unit. */
export function swap(amount, rate = RATE, feePct = FEE_PCT) {
  const fee = round2((amount * feePct) / 100);
  return { fee, received: round2((amount - fee) * rate) };
}

/** APY is effective-annual, interest paid daily. Returns 12 monthly interest amounts too. */
export function earn(balance, apy) {
  const at = (years) => balance * Math.pow(1 + apy, years);
  const months = Array.from({ length: 12 }, (_, i) => at((i + 1) / 12) - at(i / 12));
  return {
    year: round2(at(1) - balance),
    total: round2(at(1)),
    daily: at(1 / 365) - balance,
    months,
  };
}

const SYM = { USD: '$', PHP: '₱' };
export function fmt(n, cur = 'USD', dp = 2) {
  return SYM[cur] + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
