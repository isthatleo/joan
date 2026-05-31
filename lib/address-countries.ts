import { getCountries } from "react-phone-number-input";
import labels from "react-phone-number-input/locale/en";
import { inferCountryFromCity, normalizeCityLookup } from "@/lib/address-city-inference";

export type CountryOption = {
  code: string;
  name: string;
};

export type AddressValue = {
  address?: string;
  city?: string;
  country?: string;
};

function normalizeLookup(value: string) {
  return normalizeCityLookup(value);
}

export function getCountryOptions(): CountryOption[] {
  return getCountries()
    .map((code) => ({ code, name: (labels as Record<string, string>)[code] || code }))
    .filter((country) => country.name && country.name !== "ZZ")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function countryNameFromCode(code?: string | null) {
  if (!code) return "";
  return (labels as Record<string, string>)[code.toUpperCase()] || "";
}

export function countryCodeFromName(name?: string | null) {
  const normalized = normalizeLookup(String(name || ""));
  if (!normalized) return "";
  const match = getCountryOptions().find((country) => normalizeLookup(country.name) === normalized || country.code.toLowerCase() === normalized);
  return match?.code || "";
}

export { inferCountryFromCity };

export function normalizeAddressValue(value: AddressValue): Required<AddressValue> {
  const city = String(value.city || "").trim();
  const inferredCountry = inferCountryFromCity(city);
  return {
    address: String(value.address || "").trim(),
    city,
    country: String(value.country || inferredCountry || "").trim(),
  };
}
