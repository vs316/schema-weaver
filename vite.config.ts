import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { componentTagger } from 'lovable-tagger'

export default defineConfig(({ mode }) => {
  // Ensure publish builds get the backend-provisioned env vars (Vite only exposes VITE_* by default)
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    ''

  const supabasePublishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    ''

  return {
    plugins: [
      react(),
      tailwindcss(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
        supabasePublishableKey
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '::',
      port: 8080,
      strictPort: false,
    },
  }
})
