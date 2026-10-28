export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";
export const THEME_EVENT = "learn-theme";

export const THEME_OPTIONS: {
  id: ThemePreference;
  label: string;
  description: string;
}[] = [
  { id: "light", label: "Light", description: "Always use the light theme." },
  { id: "dark", label: "Dark", description: "Always use the dark theme." },
  { id: "system", label: "System", description: "Match your device setting." },
];

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "system";
}

export function resolvedDark(preference: ThemePreference = readThemePreference()): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyThemePreference(preference: ThemePreference) {
  if (typeof document === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
  document.documentElement.classList.toggle("dark", resolvedDark(preference));
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: preference }));
}

export function subscribeTheme(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  function onMedia() {
    if (readThemePreference() === "system") {
      document.documentElement.classList.toggle("dark", media.matches);
    }
    onChange();
  }
  function onCustom() {
    onChange();
  }
  function onStorage(event: StorageEvent) {
    if (event.key === THEME_STORAGE_KEY) onChange();
  }

  media.addEventListener("change", onMedia);
  window.addEventListener(THEME_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    media.removeEventListener("change", onMedia);
    window.removeEventListener(THEME_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
