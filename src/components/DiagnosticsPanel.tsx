import { useState, useEffect, useCallback } from "react";
import { getResolvedBackendConfig, supabase } from "../integrations/supabase/safeClient";
import { 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  RefreshCw,
  Minimize2
} from "lucide-react";

type DiagnosticItem = {
  label: string;
  value: string | undefined;
  status: "ok" | "warning" | "error";
};

type ConnectionStatus = "checking" | "connected" | "disconnected" | "error";

function maskKey(key: string | undefined): string {
  if (!key) return "(not set)";
  if (key.length <= 20) return key;
  return `${key.slice(0, 10)}...${key.slice(-10)}`;
}

function getStoredTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  const body = document.body;
  
  if (theme === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
    body.classList.add("light");
    body.classList.remove("dark");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    body.classList.remove("light");
    body.classList.add("dark");
    root.style.colorScheme = "dark";
  }
  localStorage.setItem("theme", theme);
}

export function DiagnosticsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem("diagnostics-minimized") === "true";
  });
  const [theme, setTheme] = useState<"dark" | "light">(getStoredTheme);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("checking");
  const [connectionLatency, setConnectionLatency] = useState<number | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const cfg = getResolvedBackendConfig();
  const mode = import.meta.env.MODE;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  // Apply theme on mount and when changed
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Check connection health
  const checkConnection = useCallback(async () => {
    setIsCheckingConnection(true);
    setConnectionStatus("checking");
    
    const startTime = performance.now();
    
    try {
      // Simple health check - try to reach Supabase
      const { error } = await supabase.from("profiles").select("id").limit(1);
      
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      setConnectionLatency(latency);
      
      if (error) {
        // RLS error means we're connected but not authenticated - still counts as connected
        if (error.code === "PGRST301" || error.message.includes("JWT")) {
          setConnectionStatus("connected");
        } else {
          setConnectionStatus("error");
        }
      } else {
        setConnectionStatus("connected");
      }
    } catch {
      setConnectionStatus("disconnected");
      setConnectionLatency(null);
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  // Initial connection check
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Toggle theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Toggle minimized state
  const toggleMinimized = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    localStorage.setItem("diagnostics-minimized", String(newState));
    if (newState) setIsOpen(false);
  };

  const connectionStatusText = {
    checking: "Checking...",
    connected: `Connected${connectionLatency ? ` (${connectionLatency}ms)` : ""}`,
    disconnected: "Disconnected",
    error: "Auth Required",
  };

  const connectionStatusColor = {
    checking: "warning",
    connected: "ok",
    disconnected: "error",
    error: "warning",
  } as const;

  const diagnostics: DiagnosticItem[] = [
    {
      label: "Connection",
      value: connectionStatusText[connectionStatus],
      status: connectionStatusColor[connectionStatus],
    },
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
      label: "Theme",
      value: theme,
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

  // Minimized view - just a small icon
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleMinimized}
          className="flex items-center justify-center h-10 w-10 rounded-full border border-border bg-card shadow-lg hover:bg-accent transition-colors"
          title="Expand diagnostics"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2">
        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card shadow-lg hover:bg-accent transition-colors"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Moon className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Connection status indicator */}
        <button
          onClick={checkConnection}
          disabled={isCheckingConnection}
          className="flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card shadow-lg hover:bg-accent transition-colors disabled:opacity-50"
          title={`Connection: ${connectionStatusText[connectionStatus]}. Click to refresh.`}
        >
          {isCheckingConnection ? (
            <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : connectionStatus === "connected" ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : connectionStatus === "error" ? (
            <Wifi className="h-4 w-4 text-yellow-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </button>

        {/* Minimize button */}
        <button
          onClick={toggleMinimized}
          className="flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card shadow-lg hover:bg-accent transition-colors"
          title="Minimize diagnostics panel"
        >
          <Minimize2 className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Main diagnostics button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-lg hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>Diagnostics</span>
          <StatusIcon status={overallStatus} />
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 rounded-lg border border-border bg-card shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="font-semibold text-foreground">System Diagnostics</h3>
              <p className="text-xs text-muted-foreground">Environment & configuration status</p>
            </div>
            <button
              onClick={toggleMinimized}
              className="p-1 rounded hover:bg-accent transition-colors"
              title="Minimize"
            >
              <Minimize2 className="h-4 w-4 text-muted-foreground" />
            </button>
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

          <div className="border-t border-border px-4 py-3 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={checkConnection}
                disabled={isCheckingConnection}
                className="flex-1 flex items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isCheckingConnection ? "animate-spin" : ""}`} />
                Test Connection
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                {theme === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              </button>
            </div>
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
