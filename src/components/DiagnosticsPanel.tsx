import { useState } from "react";
import { getResolvedBackendConfig } from "../integrations/supabase/safeClient";
import { Settings, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle } from "lucide-react";

type DiagnosticItem = {
  label: string;
  value: string | undefined;
  status: "ok" | "warning" | "error";
};

function maskKey(key: string | undefined): string {
  if (!key) return "(not set)";
  if (key.length <= 20) return key;
  return `${key.slice(0, 10)}...${key.slice(-10)}`;
}

export function DiagnosticsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const cfg = getResolvedBackendConfig();

  const mode = import.meta.env.MODE;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const diagnostics: DiagnosticItem[] = [
    {
      label: "Backend URL",
      value: cfg.url,
      status: cfg.url ? "ok" : "error",
    },
    {
      label: "Publishable Key",
      value: maskKey(cfg.publishableKey),
      status: cfg.publishableKey ? "ok" : "error",
    },
    {
      label: "Config Source",
      value: cfg.source,
      status: cfg.source === "env" ? "ok" : "warning",
    },
    {
      label: "Project ID",
      value: projectId || "(not set)",
      status: projectId ? "ok" : "warning",
    },
    {
      label: "Build Mode",
      value: mode,
      status: mode ? "ok" : "warning",
    },
    {
      label: "User Agent",
      value: navigator.userAgent.slice(0, 50) + "...",
      status: "ok",
    },
    {
      label: "Window Size",
      value: `${window.innerWidth}x${window.innerHeight}`,
      status: "ok",
    },
    {
      label: "Timestamp",
      value: new Date().toISOString(),
      status: "ok",
    },
  ];

  const overallStatus = diagnostics.some((d) => d.status === "error")
    ? "error"
    : diagnostics.some((d) => d.status === "warning")
    ? "warning"
    : "ok";

  const StatusIcon = ({ status }: { status: "ok" | "warning" | "error" }) => {
    switch (status) {
      case "ok":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-lg hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Settings className="h-4 w-4" />
        <span>Diagnostics</span>
        <StatusIcon status={overallStatus} />
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 rounded-lg border border-border bg-card shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <h3 className="font-semibold text-foreground">System Diagnostics</h3>
            <p className="text-xs text-muted-foreground">Environment & configuration status</p>
          </div>

          <div className="max-h-80 overflow-y-auto p-4 space-y-3">
            {diagnostics.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={item.status} />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate pl-6">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border px-4 py-3">
            <button
              onClick={() => {
                const report = diagnostics
                  .map((d) => `${d.label}: ${d.value} [${d.status}]`)
                  .join("\n");
                navigator.clipboard.writeText(report);
              }}
              className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Copy Diagnostics Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
