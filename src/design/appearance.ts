/**
 * Appearance model — user-configurable design system settings.
 * Everything here maps to CSS classes / variables declared in index.css.
 */

export type ThemeSetting = "dark" | "light" | "system" | "contrast";
export type FontSetting = "sans" | "serif" | "mono" | "system";
export type ScaleSetting = "sm" | "md" | "lg";
export type DensitySetting = "compact" | "cozy" | "comfortable";

export interface Appearance {
  theme: ThemeSetting;
  font: FontSetting;
  scale: ScaleSetting;
  density: DensitySetting;
  reducedMotion: boolean;
  sidebarCollapsed: boolean;
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "dark",
  font: "sans",
  scale: "md",
  density: "cozy",
  reducedMotion: false,
  sidebarCollapsed: false,
};

export const APPEARANCE_STORAGE_KEY = "ds-appearance";

export const THEME_OPTIONS: { value: ThemeSetting; label: string; hint: string }[] = [
  { value: "dark", label: "Dark", hint: "Charcoal & Ember" },
  { value: "light", label: "Light", hint: "Warm paper" },
  { value: "system", label: "System", hint: "Match your OS" },
  { value: "contrast", label: "High contrast", hint: "Maximum legibility" },
];

export const FONT_OPTIONS: { value: FontSetting; label: string; sample: string }[] = [
  { value: "sans", label: "Sans", sample: "Manrope" },
  { value: "serif", label: "Serif", sample: "Source Serif" },
  { value: "mono", label: "Mono", sample: "JetBrains Mono" },
  { value: "system", label: "System", sample: "System UI" },
];

export const SCALE_OPTIONS: { value: ScaleSetting; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

export const DENSITY_OPTIONS: { value: DensitySetting; label: string; hint: string }[] = [
  { value: "compact", label: "Compact", hint: "Maximum information density" },
  { value: "cozy", label: "Cozy", hint: "Balanced default" },
  { value: "comfortable", label: "Comfortable", hint: "Roomy and relaxed" },
];

/** Resolve "system" to a concrete theme class. */
export function resolveTheme(theme: ThemeSetting): "dark" | "light" | "contrast" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** Apply an appearance object to <html>. */
export function applyAppearance(a: Appearance) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved = resolveTheme(a.theme);

  root.classList.remove("light", "dark", "contrast");
  root.classList.add(resolved);
  root.style.colorScheme = resolved === "light" ? "light" : "dark";

  root.classList.remove("density-compact", "density-cozy", "density-comfortable");
  root.classList.add(`density-${a.density}`);

  root.classList.remove("scale-sm", "scale-md", "scale-lg");
  root.classList.add(`scale-${a.scale}`);

  root.classList.remove("font-app-sans", "font-app-serif", "font-app-mono", "font-app-system");
  root.classList.add(`font-app-${a.font}`);

  root.classList.toggle("reduce-motion", a.reducedMotion);
}

export function readStoredAppearance(): Appearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) {
      // Migrate the legacy dark/light-only preference.
      const legacy = window.localStorage.getItem("erd-theme") || window.localStorage.getItem("theme");
      if (legacy === "light" || legacy === "dark") {
        return { ...DEFAULT_APPEARANCE, theme: legacy };
      }
      return DEFAULT_APPEARANCE;
    }
    return { ...DEFAULT_APPEARANCE, ...(JSON.parse(raw) as Partial<Appearance>) };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function writeStoredAppearance(a: Appearance) {
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(a));
  } catch {
    /* storage unavailable — in-memory only */
  }
}
