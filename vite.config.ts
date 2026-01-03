import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  // Use __dirname to avoid CI/preview environments where cwd isn't project root
  const env = loadEnv(mode, __dirname, "");

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";

  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    "";

  return {
    envDir: __dirname,
    // Expose both VITE_* (standard) and SUPABASE_* (Cloud-provisioned) vars to the client
    // so we can normalize them before importing the generated Supabase client.
    envPrefix: ["VITE_", "SUPABASE_"],
    plugins: [react(), tailwindcss(), mode === "development" && componentTagger()].filter(
      Boolean,
    ),
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        supabasePublishableKey,
      ),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "::",
      port: 8080,
      strictPort: false,
    },
  };
});

