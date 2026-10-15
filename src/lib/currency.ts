import { useEffect, useSyncExternalStore } from 'react';

export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'SGD' | 'AED' | 'JPY' | 'CNY' | 'CHF' | 'SEK' | 'BRL' | 'ZAR' | 'KRW';

export const CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: 'CN¥', name: 'Chinese Yuan' },
  { code: 'CHF', symbol: 'CHF ', name: 'Swiss Franc' },
  { code: 'SEK', symbol: 'SEK ', name: 'Swedish Krona' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ZAR', symbol: 'R ', name: 'South African Rand' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
];

/** Approximate fallback rates (units per 1 USD), used until live rates load or if offline. */
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  USD: 1, INR: 84, EUR: 0.92, GBP: 0.78, CAD: 1.37, AUD: 1.52, SGD: 1.33, AED: 3.67,
  JPY: 150, CNY: 7.2, CHF: 0.88, SEK: 10.5, BRL: 5.5, ZAR: 18, KRW: 1350,
};

const CURRENCY_KEY = 'skillbridge:currency';
const RATES_KEY = 'skillbridge:rates';
const RATES_TTL = 12 * 60 * 60 * 1000;

type State = { currency: CurrencyCode; rates: Record<CurrencyCode, number>; live: boolean };
let state: State = { currency: 'USD', rates: FALLBACK_RATES, live: false };
const listeners = new Set<() => void>();
let started = false;

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach(l => l());
}

const isCode = (v: unknown): v is CurrencyCode => CURRENCIES.some(c => c.code === v);

function mergeRates(raw: Record<string, number>): Record<CurrencyCode, number> {
  const out = { ...FALLBACK_RATES };
  for (const c of CURRENCIES) if (typeof raw[c.code] === 'number' && raw[c.code] > 0) out[c.code] = raw[c.code];
  return out;
}

async function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  try {
    const saved = localStorage.getItem(CURRENCY_KEY);
    if (isCode(saved)) emit({ currency: saved });
    const cached = JSON.parse(localStorage.getItem(RATES_KEY) ?? 'null');
    if (cached?.rates) emit({ rates: mergeRates(cached.rates), live: true });
    if (cached && Date.now() - cached.at < RATES_TTL) return;
  } catch { /* storage unavailable */ }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) return;
    const data = await res.json();
    if (data?.rates) {
      emit({ rates: mergeRates(data.rates), live: true });
      try { localStorage.setItem(RATES_KEY, JSON.stringify({ at: Date.now(), rates: data.rates })); } catch { /* ignore */ }
    }
  } catch { /* offline: keep approximate rates */ }
}

export function setCurrency(code: CurrencyCode) {
  emit({ currency: code });
  try { localStorage.setItem(CURRENCY_KEY, code); } catch { /* ignore */ }
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const serverState: State = state;

export function useCurrency() {
  const s = useSyncExternalStore(subscribe, () => state, () => serverState);
  useEffect(() => { void start(); }, []);
  return s;
}

/** Compact amount, e.g. 85000 -> "85k", 2300000 -> "2.3M". INR uses lakh. */
function compact(amount: number, code: CurrencyCode): string {
  if (code === 'INR') {
    const lakh = amount / 100000;
    return lakh >= 100 ? `${(lakh / 100).toFixed(2).replace(/\.?0+$/, '')} Cr` : `${lakh >= 10 ? Math.round(lakh) : Math.round(lakh * 10) / 10}`;
  }
  if (amount >= 1_000_000) return `${(Math.round(amount / 100_000) / 10).toString()}M`;
  return `${Math.round(amount / 1000)}k`;
}

/** Converts a USD salary band like "$85–110k" into the chosen currency. */
export function convertSalary(band: string, code: CurrencyCode, rates: Record<CurrencyCode, number>): string {
  if (code === 'USD') return band;
  const m = band.match(/\$(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)k/);
  if (!m) return band;
  const low = parseFloat(m[1]) * 1000 * rates[code];
  const high = parseFloat(m[2]) * 1000 * rates[code];
  const symbol = CURRENCIES.find(c => c.code === code)!.symbol;
  if (code === 'INR') {
    const suffix = high / 100000 >= 100 ? '' : ' LPA';
    return `${symbol}${compact(low, code)}–${compact(high, code)}${suffix}`;
  }
  const lowC = compact(low, code), highC = compact(high, code);
  const unit = highC.endsWith('M') ? 'M' : 'k';
  return `${symbol}${lowC.replace(/[kM]$/, '')}–${highC.replace(/[kM]$/, '')}${unit}`;
}
