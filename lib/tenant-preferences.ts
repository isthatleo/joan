import {
  USER_CALENDAR_START_STORAGE_KEY,
  USER_COMPACT_TABLES_STORAGE_KEY,
  USER_HIGH_CONTRAST_STORAGE_KEY,
  USER_LANGUAGE_SOURCE_STORAGE_KEY,
  USER_LANGUAGE_STORAGE_KEY,
  USER_TIMEZONE_STORAGE_KEY,
  USER_TIME_FORMAT_STORAGE_KEY,
} from "@/lib/user-preferences";

export const DEFAULT_TENANT_PREFERENCES = {
  timezone: "UTC",
  language: "en",
  currency: "USD",
  timeFormat: "12h",
  dateFormat: "YYYY-MM-DD",
  weekStartDay: "Monday",
  numberFormat: "us",
  compactMode: false,
  highContrast: false,
  autoSaveForms: true,
  showTooltips: true,
  keyboardShortcuts: true,
} as const;

export type TenantPreferences = typeof DEFAULT_TENANT_PREFERENCES;

export function normalizeTenantPreferences(value?: Partial<TenantPreferences> | Record<string, any> | null): TenantPreferences {
  const source = value || {};
  const allowedTimeFormat = source.timeFormat === "24h" || source.timeFormat === "12h" ? source.timeFormat : DEFAULT_TENANT_PREFERENCES.timeFormat;
  const allowedWeekStart = source.weekStartDay === "Sunday" || source.weekStartDay === "Monday" ? source.weekStartDay : DEFAULT_TENANT_PREFERENCES.weekStartDay;
  const allowedNumberFormat = ["us", "eu", "de"].includes(String(source.numberFormat)) ? String(source.numberFormat) : DEFAULT_TENANT_PREFERENCES.numberFormat;

  return {
    ...DEFAULT_TENANT_PREFERENCES,
    ...source,
    timezone: typeof source.timezone === "string" && source.timezone.trim() ? source.timezone.trim() : DEFAULT_TENANT_PREFERENCES.timezone,
    language: typeof source.language === "string" && source.language.trim() ? source.language.trim() : DEFAULT_TENANT_PREFERENCES.language,
    currency: typeof source.currency === "string" && source.currency.trim() ? source.currency.trim().toUpperCase() : DEFAULT_TENANT_PREFERENCES.currency,
    dateFormat: typeof source.dateFormat === "string" && source.dateFormat.trim() ? source.dateFormat.trim() : DEFAULT_TENANT_PREFERENCES.dateFormat,
    timeFormat: allowedTimeFormat,
    weekStartDay: allowedWeekStart,
    numberFormat: allowedNumberFormat as TenantPreferences["numberFormat"],
    compactMode: Boolean(source.compactMode),
    highContrast: Boolean(source.highContrast),
    autoSaveForms: source.autoSaveForms !== false,
    showTooltips: source.showTooltips !== false,
    keyboardShortcuts: source.keyboardShortcuts !== false,
  };
}

export function applyTenantPreferences(preferences: TenantPreferences) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const languageSource = window.localStorage.getItem(USER_LANGUAGE_SOURCE_STORAGE_KEY) || "tenant";

  document.documentElement.dataset.timezone = preferences.timezone;
  document.documentElement.dataset.timeFormat = preferences.timeFormat;
  document.documentElement.dataset.calendarStart = String(preferences.weekStartDay || "Monday").toLowerCase();
  document.documentElement.dataset.numberFormat = preferences.numberFormat;
  document.documentElement.dataset.preferredCurrency = preferences.currency;
  document.documentElement.dataset.tenantDateFormat = preferences.dateFormat;
  document.documentElement.dataset.tenantTooltips = String(preferences.showTooltips);
  document.documentElement.dataset.tenantKeyboardShortcuts = String(preferences.keyboardShortcuts);
  document.documentElement.dataset.tenantAutosave = String(preferences.autoSaveForms);
  document.documentElement.classList.toggle("high-contrast", Boolean(preferences.highContrast));
  document.documentElement.classList.toggle("compact-tables", Boolean(preferences.compactMode));

  window.localStorage.setItem(USER_TIMEZONE_STORAGE_KEY, preferences.timezone);
  window.localStorage.setItem(USER_TIME_FORMAT_STORAGE_KEY, preferences.timeFormat);
  window.localStorage.setItem(USER_CALENDAR_START_STORAGE_KEY, String(preferences.weekStartDay || "Monday").toLowerCase());
  window.localStorage.setItem(USER_HIGH_CONTRAST_STORAGE_KEY, String(Boolean(preferences.highContrast)));
  window.localStorage.setItem(USER_COMPACT_TABLES_STORAGE_KEY, String(Boolean(preferences.compactMode)));

  if (languageSource !== "user") {
    document.documentElement.lang = preferences.language;
    window.localStorage.setItem(USER_LANGUAGE_STORAGE_KEY, preferences.language);
    window.localStorage.setItem(USER_LANGUAGE_SOURCE_STORAGE_KEY, "tenant");
  }
}
