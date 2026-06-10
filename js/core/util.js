// Formatting + math helpers (pure, no DOM)

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const log10 = (x) => Math.log10(x);

const NUM_SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];

export function fmtNum(x, dp = 2) {
  if (!isFinite(x)) return '∞';
  if (x < 0) return '-' + fmtNum(-x, dp);
  if (x < 1000) return x % 1 === 0 ? String(x) : x.toFixed(x < 10 ? dp : 1);
  let tier = Math.floor(Math.log10(x) / 3);
  if (tier >= NUM_SUF.length) return x.toExponential(2);
  const v = x / Math.pow(10, tier * 3);
  return v.toFixed(v < 10 ? dp : v < 100 ? 1 : 0) + NUM_SUF[tier];
}

export function fmtMoney(x, dp = 2) {
  if (!isFinite(x)) return '$∞';
  const neg = x < 0;
  const a = Math.abs(x);
  const s = a < 1000 ? a.toFixed(a < 100 && a % 1 !== 0 ? 2 : 0) : fmtNum(a, dp);
  return (neg ? '-$' : '$') + s;
}

// FLOP/s with metric suffixes (kilo..quetta)
const FLOPS_SUF = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y', 'R', 'Q'];
export function fmtFlops(x) {
  if (!isFinite(x) || x <= 0) return '0 FLOP/s';
  let tier = clamp(Math.floor(Math.log10(x) / 3), 0, FLOPS_SUF.length - 1);
  const v = x / Math.pow(10, tier * 3);
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + ' ' + FLOPS_SUF[tier] + 'FLOP/s';
}

// Total FLOPs in scientific notation, e.g. "3.1e23 FLOP"
export function fmtFlop(x) {
  if (!isFinite(x) || x <= 0) return '0 FLOP';
  const e = Math.floor(Math.log10(x));
  const m = x / Math.pow(10, e);
  return m.toFixed(1) + 'e' + e + ' FLOP';
}

export function fmtParams(n) {
  return fmtNum(n, 2).replace('K', 'K').replace(/(\d)$/, '$1') + ' params';
}
export const fmtP = (n) => fmtNum(n, 2);          // bare big-number, used for params/tokens
export const fmtTok = (n) => fmtNum(n, 2) + ' tokens';

export function fmtPower(watts) {
  if (watts >= 1e9) return (watts / 1e9).toFixed(2) + ' GW';
  if (watts >= 1e6) return (watts / 1e6).toFixed(2) + ' MW';
  if (watts >= 1e3) return (watts / 1e3).toFixed(1) + ' kW';
  return watts.toFixed(0) + ' W';
}

// Duration given in sim-hours
export function fmtDur(hours) {
  if (!isFinite(hours)) return '∞';
  if (hours < 1) return Math.max(1, Math.round(hours * 60)) + 'm';
  if (hours < 48) return hours.toFixed(hours < 10 ? 1 : 0) + 'h';
  const d = hours / 24;
  if (d < 60) return d.toFixed(1) + 'd';
  if (d < 730) return (d / 30.4).toFixed(1) + 'mo';
  return (d / 365).toFixed(1) + 'y';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Sim starts Mon Jan 6, 2025
export function fmtDate(simHours) {
  const ms = Date.UTC(2025, 0, 6) + simHours * 3600 * 1000;
  const d = new Date(ms);
  return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
}

export function fmtPct(x, dp = 0) { return (x * 100).toFixed(dp) + '%'; }

let _id = 0;
export const uid = () => (++_id) + '_' + Math.random().toString(36).slice(2, 7);
