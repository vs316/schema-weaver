import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type ResolvedBackendConfig = {
  url: string;
  publishableKey: string;
  source: "env" | "fallback";
};

// Fallbacks are safe to embed: URL + publishable/anon key are public identifiers.
// They ensure the app can boot even when the frontend runtime is missing injected env vars.
const FALLBACK_URL = "https://ekafxpolsdhlktmsgexd.supabase.co";
const FALLBACK_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrYWZ4cG9sc2RobGt0bXNnZXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDc1ODUsImV4cCI6MjA4MjU4MzU4NX0.pWorY9v_1CG3R8DsxuYPU5nUEh9ceOO-cMhd3V4U_WA";

function readEnv(name: string) {
  return (import.meta as any)?.env?.[name] as string | undefined;
}

export function getResolvedBackendConfig(): ResolvedBackendConfig {
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    readEnv("SUPABASE_URL") ||
    FALLBACK_URL;

  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    readEnv("SUPABASE_PUBLISHABLE_KEY") ||
    readEnv("SUPABASE_ANON_KEY") ||
    FALLBACK_PUBLISHABLE_KEY;

  const hasEnv = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );

  return {
    url,
    publishableKey,
    source: hasEnv ? "env" : "fallback",
  };
}

const cfg = getResolvedBackendConfig();

export const supabase = createClient<Database>(cfg.url, cfg.publishableKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
