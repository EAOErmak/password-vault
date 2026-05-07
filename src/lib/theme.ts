export type AppTheme = "light" | "dark";

const THEME_STORAGE_KEY = "password-vault:theme";

function isValidTheme(value: string | null): value is AppTheme {
  return value === "light" || value === "dark";
}

export function readStoredTheme(): AppTheme | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isValidTheme(storedTheme) ? storedTheme : null;
}

export function resolveInitialTheme(): AppTheme {
  const storedTheme = readStoredTheme();
  if (storedTheme) {
    return storedTheme;
  }

  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function storeTheme(theme: AppTheme): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function applyTheme(theme: AppTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
}
