export const USER_THEME_STORAGE_KEY = "joan-theme";
export const USER_LANGUAGE_STORAGE_KEY = "joan-language";
export const USER_TIMEZONE_STORAGE_KEY = "joan-timezone";
export const USER_FONT_SCALE_STORAGE_KEY = "joan-font-scale";
export const USER_DENSITY_STORAGE_KEY = "joan-density";

export type ThemePreference = "light" | "dark" | "system";

export type UserPreferenceSettings = {
  appearance?: {
    theme?: ThemePreference;
    language?: string;
    timezone?: string;
    density?: string;
    reduceMotion?: boolean;
    highContrast?: boolean;
    fontScale?: string;
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
  const timezone = appearance.timezone || "UTC";
  const density = appearance.density || "comfortable";
  const fontScale = appearance.fontScale || "default";
  const reduceMotion = Boolean(appearance.reduceMotion);
  const highContrast = Boolean(appearance.highContrast);

  applyThemePreference(theme);
  document.documentElement.lang = language;
  document.documentElement.dataset.timezone = timezone;
  document.documentElement.dataset.density = density;
  document.documentElement.dataset.fontScale = fontScale;
  document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  document.documentElement.classList.toggle("high-contrast", highContrast);
  document.documentElement.style.fontSize = resolveFontSize(fontScale);

  window.localStorage.setItem(USER_LANGUAGE_STORAGE_KEY, language);
  window.localStorage.setItem(USER_TIMEZONE_STORAGE_KEY, timezone);
  window.localStorage.setItem(USER_FONT_SCALE_STORAGE_KEY, fontScale);
  window.localStorage.setItem(USER_DENSITY_STORAGE_KEY, density);
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(USER_THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}
