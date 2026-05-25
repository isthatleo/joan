import currencyCodesModule from "currency-codes";

type CurrencyRecord = {
  code: string;
  number: string;
  digits: number;
  currency: string;
  countries?: string[];
};

const currencyCodes = currencyCodesModule as unknown as { data: CurrencyRecord[] };

export const currencyOptions = (currencyCodes.data || [])
  .map((entry) => ({
    code: entry.code,
    name: entry.currency,
    label: `${entry.code} - ${entry.currency}`,
  }))
  .sort((left, right) => left.code.localeCompare(right.code));

export function getCurrencyOption(code?: string | null) {
  return currencyOptions.find((entry) => entry.code === String(code || "").toUpperCase()) || null;
}
