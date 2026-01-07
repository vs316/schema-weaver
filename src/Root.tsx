import React, { Suspense, useMemo } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StartupErrorScreen } from "./components/StartupErrorScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel";
import { getResolvedBackendConfig } from "./integrations/supabase/safeClient";
import ResetPassword from "./pages/ResetPassword";

const App = React.lazy(() => import("./App"));
const AuthPage = React.lazy(async () => {
  const mod = await import("./pages/Auth");
  return { default: mod.AuthPage };
});

type StartupCfg = {
  url: string;
  key: string;
  source: "env" | "fallback";
  mode?: string;
  ok: boolean;
};

function useStartupConfig(): StartupCfg {
  return useMemo(() => {
    const resolved = getResolvedBackendConfig();
    const mode = (import.meta as any).env?.MODE as string | undefined;

    return {
      url: resolved.url,
      key: resolved.publishableKey,
      source: resolved.source,
      mode,
      ok: Boolean(resolved.url && resolved.publishableKey),
    };
  }, []);
}

export function Root() {
  const cfg = useStartupConfig();

  const configItems = [
    { label: "Backend URL", value: cfg.url },
    { label: "Publishable key", value: cfg.key },
    { label: "Config source", value: cfg.source },
    { label: "MODE", value: cfg.mode },
  ];

  if (!cfg.ok) {
    return (
      <StartupErrorScreen
        title="Missing backend configuration"
        description="The app cannot start because backend configuration isn't available."
        items={configItems}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <BrowserRouter>
      <ErrorBoundary
        fallback={(error: unknown) => (
          <StartupErrorScreen
            title="Startup failure"
            description="The app crashed during initialization."
            items={configItems}
            error={error}
            onRetry={() => window.location.reload()}
          />
        )}
      >
        <Suspense
          fallback={
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Loading…
              </div>
            </div>
          }
        >
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<App />} />

          </Routes>
          {/* <DiagnosticsPanel /> */}
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
