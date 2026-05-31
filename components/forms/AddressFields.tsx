"use client";

import { useMemo, useState } from "react";
import { getCountryOptions, inferCountryFromCity, type AddressValue } from "@/lib/address-countries";

type AddressFieldsProps = {
  value: AddressValue;
  onChange: (value: Required<AddressValue>) => void;
  addressLabel?: string;
  cityLabel?: string;
  countryLabel?: string;
  includeAddress?: boolean;
  includePostalCode?: boolean;
  postalCode?: string;
  onPostalCodeChange?: (value: string) => void;
  className?: string;
  inputClassName?: string;
};

function baseInput(className?: string) {
  return className || "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/20";
}

export function AddressFields({
  value,
  onChange,
  addressLabel = "Street Address",
  cityLabel = "Town / City",
  countryLabel = "Country",
  includeAddress = true,
  includePostalCode = false,
  postalCode = "",
  onPostalCodeChange,
  className = "grid grid-cols-1 gap-4 md:grid-cols-2",
  inputClassName,
}: AddressFieldsProps) {
  const countries = useMemo(() => getCountryOptions(), []);
  const [hint, setHint] = useState("");
  const inputClass = baseInput(inputClassName);

  const update = (patch: Partial<AddressValue>) => {
    const next = {
      address: value.address || "",
      city: value.city || "",
      country: value.country || "",
      ...patch,
    };
    onChange({
      address: String(next.address || ""),
      city: String(next.city || ""),
      country: String(next.country || ""),
    });
  };

  const handleCity = (city: string) => {
    const inferredCountry = inferCountryFromCity(city);
    const shouldAutofill = Boolean(inferredCountry && (!value.country || value.country === hint));
    setHint(inferredCountry);
    update({ city, country: shouldAutofill ? inferredCountry : value.country || "" });
  };

  return (
    <div className={className}>
      {includeAddress ? (
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">{addressLabel}</span>
          <input value={value.address || ""} onChange={(event) => update({ address: event.target.value })} className={`mt-1.5 ${inputClass}`} placeholder="123 Hospital Road" />
        </label>
      ) : null}
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">{cityLabel}</span>
        <input value={value.city || ""} onChange={(event) => handleCity(event.target.value)} className={`mt-1.5 ${inputClass}`} placeholder="Kampala" list="address-city-suggestions" />
        <datalist id="address-city-suggestions">
          {["Kampala", "Nairobi", "Mbarara", "Kigali", "Dar es Salaam", "Accra", "Lagos", "London", "New York"].map((city) => <option key={city} value={city} />)}
        </datalist>
        {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">Country suggestion: {hint}</span> : null}
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">{countryLabel}</span>
        <select value={value.country || ""} onChange={(event) => update({ country: event.target.value })} className={`mt-1.5 ${inputClass}`}>
          <option value="">Select country</option>
          {countries.map((country) => <option key={country.code} value={country.name}>{country.name}</option>)}
        </select>
      </label>
      {includePostalCode ? (
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Postal Code</span>
          <input value={postalCode} onChange={(event) => onPostalCodeChange?.(event.target.value)} className={`mt-1.5 ${inputClass}`} placeholder="00100" />
        </label>
      ) : null}
    </div>
  );
}
