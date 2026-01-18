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

// function readEnv(name: string) {
//   return (import.meta as any)?.env?.[name] as string | undefined;
// }

export function getResolvedBackendConfig(): ResolvedBackendConfig {
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    FALLBACK_URL;

  // Support both ANON_KEY and PUBLISHABLE_KEY env var names
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    FALLBACK_PUBLISHABLE_KEY;

  const hasEnv = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)
  );

  return {
    url,
    publishableKey,
    source: hasEnv ? "env" : "fallback",
  };
}


let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

function initializeSupabase() {
  if (supabaseInstance) return supabaseInstance;
  
  const cfg = getResolvedBackendConfig();
  if (!cfg.url || !cfg.publishableKey) {
    console.error("Supabase configuration missing - using fallbacks");
    // Use fallbacks instead of throwing
    supabaseInstance = createClient<Database>(FALLBACK_URL, FALLBACK_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } else {
    supabaseInstance = createClient<Database>(cfg.url, cfg.publishableKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  
  return supabaseInstance;
}

export const supabase = initializeSupabase();
