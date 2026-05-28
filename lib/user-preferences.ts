export const USER_THEME_STORAGE_KEY = "joan-theme";
export const USER_LANGUAGE_STORAGE_KEY = "joan-language";
export const USER_LANGUAGE_SOURCE_STORAGE_KEY = "joan-language-source";
export const USER_TIMEZONE_STORAGE_KEY = "joan-timezone";
export const USER_TIME_FORMAT_STORAGE_KEY = "joan-time-format";
export const USER_FONT_SCALE_STORAGE_KEY = "joan-font-scale";
export const USER_DENSITY_STORAGE_KEY = "joan-density";
export const USER_CALENDAR_START_STORAGE_KEY = "joan-calendar-start";
export const USER_REDUCE_MOTION_STORAGE_KEY = "joan-reduce-motion";
export const USER_HIGH_CONTRAST_STORAGE_KEY = "joan-high-contrast";
export const USER_EXPORT_FORMAT_STORAGE_KEY = "joan-export-format";
export const USER_COMPACT_TABLES_STORAGE_KEY = "joan-compact-tables";
export const USER_READ_RECEIPTS_STORAGE_KEY = "joan-read-receipts";
export const USER_ACTIVITY_STATUS_STORAGE_KEY = "joan-activity-status";
export const USER_DEFAULT_CHANNEL_STORAGE_KEY = "joan-default-channel";
export const USER_DEFAULT_LANDING_PAGE_STORAGE_KEY = "joan-default-landing-page";

export type ThemePreference = "light" | "dark" | "system";

export type UserPreferenceSettings = {
  appearance?: {
    theme?: ThemePreference;
    language?: string;
    languageSource?: string;
    timezone?: string;
    timeFormat?: string;
    density?: string;
    calendarStart?: string;
    reduceMotion?: boolean;
    highContrast?: boolean;
    fontScale?: string;
  };
  privacy?: {
    readReceipts?: boolean;
    activityStatus?: boolean;
  };
  communication?: {
    messageSettings?: {
      defaultChannel?: string;
    };
  };
  workflow?: {
    defaultLandingPage?: string;
    preferredExportFormat?: string;
    compactTables?: boolean;
  };
};

function resolveFontSize(fontScale?: string) {
  switch (fontScale) {
    case "small":
      return "14px";
    case "large":
      return "18px";
    default:
      return "16px";
  }
}

function resolveSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemePreference(theme: ThemePreference = "system") {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const resolved = theme === "system" ? resolveSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  window.localStorage.setItem(USER_THEME_STORAGE_KEY, theme);
}

export function applyUserPreferences(settings: UserPreferenceSettings | null | undefined) {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const appearance = settings?.appearance || {};
  const theme = (appearance.theme as ThemePreference | undefined) || "system";
  const language = appearance.language || "en";
  const languageSource = appearance.languageSource || "tenant";
  const timezone = appearance.timezone || "UTC";
  const timeFormat = appearance.timeFormat || "12h";
  const density = appearance.density || "comfortable";
  const calendarStart = appearance.calendarStart || "monday";
  const fontScale = appearance.fontScale || "default";
  const reduceMotion = Boolean(appearance.reduceMotion);
  const highContrast = Boolean(appearance.highContrast);
  const readReceipts = settings?.privacy?.readReceipts ?? true;
  const activityStatus = settings?.privacy?.activityStatus ?? true;
  const defaultChannel = settings?.communication?.messageSettings?.defaultChannel || "inbox";
  const defaultLandingPage = settings?.workflow?.defaultLandingPage || "dashboard";
  const preferredExportFormat = settings?.workflow?.preferredExportFormat || "pdf";
  const compactTables = Boolean(settings?.workflow?.compactTables);

  applyThemePreference(theme);
  document.documentElement.lang = language;
  document.documentElement.dataset.timezone = timezone;
  document.documentElement.dataset.timeFormat = timeFormat;
  document.documentElement.dataset.density = density;
  document.documentElement.dataset.calendarStart = calendarStart;
  document.documentElement.dataset.fontScale = fontScale;
  document.documentElement.dataset.defaultChannel = defaultChannel;
  document.documentElement.dataset.defaultLandingPage = defaultLandingPage;
  document.documentElement.dataset.preferredExportFormat = preferredExportFormat;
  document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  document.documentElement.classList.toggle("high-contrast", highContrast);
  document.documentElement.classList.toggle("compact-tables", compactTables);
  document.documentElement.style.fontSize = resolveFontSize(fontScale);

  window.localStorage.setItem(USER_LANGUAGE_STORAGE_KEY, language);
  window.localStorage.setItem(USER_LANGUAGE_SOURCE_STORAGE_KEY, languageSource);
  window.localStorage.setItem(USER_TIMEZONE_STORAGE_KEY, timezone);
  window.localStorage.setItem(USER_TIME_FORMAT_STORAGE_KEY, timeFormat);
  window.localStorage.setItem(USER_FONT_SCALE_STORAGE_KEY, fontScale);
  window.localStorage.setItem(USER_DENSITY_STORAGE_KEY, density);
  window.localStorage.setItem(USER_CALENDAR_START_STORAGE_KEY, calendarStart);
  window.localStorage.setItem(USER_REDUCE_MOTION_STORAGE_KEY, String(reduceMotion));
  window.localStorage.setItem(USER_HIGH_CONTRAST_STORAGE_KEY, String(highContrast));
  window.localStorage.setItem(USER_EXPORT_FORMAT_STORAGE_KEY, preferredExportFormat);
  window.localStorage.setItem(USER_COMPACT_TABLES_STORAGE_KEY, String(compactTables));
  window.localStorage.setItem(USER_READ_RECEIPTS_STORAGE_KEY, String(readReceipts));
  window.localStorage.setItem(USER_ACTIVITY_STATUS_STORAGE_KEY, String(activityStatus));
  window.localStorage.setItem(USER_DEFAULT_CHANNEL_STORAGE_KEY, defaultChannel);
  window.localStorage.setItem(USER_DEFAULT_LANDING_PAGE_STORAGE_KEY, defaultLandingPage);
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(USER_THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}
