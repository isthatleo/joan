const CITY_COUNTRY_ALIASES: Record<string, string> = {
  abuja: "Nigeria",
  accra: "Ghana",
  addisababa: "Ethiopia",
  amsterdam: "Netherlands",
  bangkok: "Thailand",
  beijing: "China",
  berlin: "Germany",
  boston: "United States",
  brussels: "Belgium",
  cairo: "Egypt",
  capetown: "South Africa",
  chicago: "United States",
  daressalaam: "Tanzania",
  delhi: "India",
  doha: "Qatar",
  dubai: "United Arab Emirates",
  entebbe: "Uganda",
  gulu: "Uganda",
  hongkong: "Hong Kong",
  istanbul: "Turkey",
  jinja: "Uganda",
  johannesburg: "South Africa",
  kampala: "Uganda",
  kigali: "Rwanda",
  kisumu: "Kenya",
  lagos: "Nigeria",
  london: "United Kingdom",
  losangeles: "United States",
  lusaka: "Zambia",
  mbarara: "Uganda",
  mombasa: "Kenya",
  moscow: "Russia",
  mumbai: "India",
  nairobi: "Kenya",
  newyork: "United States",
  paris: "France",
  sanfrancisco: "United States",
  seoul: "South Korea",
  shanghai: "China",
  singapore: "Singapore",
  toronto: "Canada",
  washington: "United States",
};

export function normalizeCityLookup(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function inferCountryFromCity(city?: string | null) {
  const normalized = normalizeCityLookup(String(city || ""));
  if (!normalized) return "";
  return CITY_COUNTRY_ALIASES[normalized] || "";
}
