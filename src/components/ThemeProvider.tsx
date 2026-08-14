/**
 * Back-compat shim.
 * The real implementation now lives in AppearanceProvider, which supports
 * theme + font + scale + density + reduced motion.
 */
import React from "react";
import { AppearanceProvider, useAppearance } from "./AppearanceProvider";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <AppearanceProvider>{children}</AppearanceProvider>;
}

export function useTheme() {
  const { theme, setTheme, toggleTheme, isDarkMode } = useAppearance();
  return { theme, setTheme, toggleTheme, isDarkMode };
}

export { useAppearance };
