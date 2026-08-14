import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Appearance,
  DEFAULT_APPEARANCE,
  applyAppearance,
  readStoredAppearance,
  resolveTheme,
  writeStoredAppearance,
} from "../design/appearance";
import { supabase } from "../integrations/supabase/safeClient";
import { logger } from "../utils/logger";

interface AppearanceContextValue {
  appearance: Appearance;
  update: (patch: Partial<Appearance>) => void;
  reset: () => void;
  /** Back-compat surface used across the existing editor. */
  theme: "dark" | "light" | "contrast";
  isDarkMode: boolean;
  setTheme: (t: "dark" | "light") => void;
  toggleTheme: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(() => readStoredAppearance());
  const hydratedFromCloud = useRef(false);

  // Apply to <html> on every change and persist locally.
  useEffect(() => {
    applyAppearance(appearance);
    writeStoredAppearance(appearance);
  }, [appearance]);

  // Track OS theme changes when the user chose "system".
  useEffect(() => {
    if (appearance.theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyAppearance(appearance);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [appearance]);

  // Load the signed-in user's saved settings once, then keep the cloud in sync.
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user || cancelled) return;

      const { data: row, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        logger.error("Failed to load appearance settings", error);
        hydratedFromCloud.current = true;
        return;
      }

      if (row) {
        setAppearance({
          theme: row.theme as Appearance["theme"],
          font: row.font_family as Appearance["font"],
          scale: row.ui_scale as Appearance["scale"],
          density: row.density as Appearance["density"],
          reducedMotion: Boolean(row.reduced_motion),
          sidebarCollapsed: Boolean(row.sidebar_collapsed),
        });
      }
      hydratedFromCloud.current = true;
    };

    hydrate();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") hydrate();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const persistToCloud = useCallback(async (next: Appearance) => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        theme: next.theme,
        font_family: next.font,
        ui_scale: next.scale,
        density: next.density,
        reduced_motion: next.reducedMotion,
        sidebar_collapsed: next.sidebarCollapsed,
      },
      { onConflict: "user_id" },
    );
    if (error) logger.error("Failed to save appearance settings", error);
  }, []);

  const update = useCallback(
    (patch: Partial<Appearance>) => {
      setAppearance((prev) => {
        const next = { ...prev, ...patch };
        void persistToCloud(next);
        return next;
      });
    },
    [persistToCloud],
  );

  const reset = useCallback(() => {
    setAppearance(DEFAULT_APPEARANCE);
    void persistToCloud(DEFAULT_APPEARANCE);
  }, [persistToCloud]);

  const resolved = resolveTheme(appearance.theme);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      appearance,
      update,
      reset,
      theme: resolved,
      isDarkMode: resolved !== "light",
      setTheme: (t) => update({ theme: t }),
      toggleTheme: () => update({ theme: resolved === "light" ? "dark" : "light" }),
    }),
    [appearance, update, reset, resolved],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within an AppearanceProvider");
  return ctx;
}
