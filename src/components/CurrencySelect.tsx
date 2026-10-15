import { Coins } from 'lucide-react';
import { CURRENCIES, setCurrency, useCurrency, convertSalary, type CurrencyCode } from '@/lib/currency';

export function CurrencySelect() {
  const { currency } = useCurrency();
  return (
    <label className="currency-select" title="Show salaries in your currency">
      <Coins size={15} aria-hidden />
      <select aria-label="Salary currency" value={currency} onChange={e => setCurrency(e.target.value as CurrencyCode)}>
        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
      </select>
    </label>
  );
}

/** Renders a USD salary band in the viewer's chosen currency. */
export function Salary({ band }: { band: string }) {
  const { currency, rates } = useCurrency();
  return <>{convertSalary(band, currency, rates)}</>;
}

export function useCurrencyLabel() {
  const { currency, live } = useCurrency();
  return currency === 'USD' ? 'USD' : `${currency}${live ? '' : ' (approx.)'}`;
}
