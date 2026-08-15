import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";
import { Download, Copy, Check, FileCode2, Image as ImageIcon, RefreshCw, Waypoints } from "lucide-react";
import { AppShell } from "../components/shell/AppShell";
import { Button } from "../ui/Button";
import { Card } from "../ui/Surface";
import { useAppearance } from "../components/AppearanceProvider";
import { cn } from "../ui/cn";

const TEMPLATES: { id: string; label: string; code: string }[] = [
  {
    id: "flowchart",
    label: "Flowchart",
    code: `flowchart TD
  A[Client] --> B{Authenticated?}
  B -- yes --> C[Dashboard]
  B -- no --> D[Sign in]
  D --> B`,
  },
  {
    id: "sequence",
    label: "Sequence",
    code: `sequenceDiagram
  participant U as User
  participant A as API
  participant D as Database
  U->>A: POST /orders
  A->>D: insert order
  D-->>A: order id
  A-->>U: 201 Created`,
  },
  {
    id: "erd",
    label: "ER diagram",
    code: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ ORDER_ITEM : contains
  PRODUCT ||--o{ ORDER_ITEM : "listed in"`,
  },
  {
    id: "class",
    label: "Class",
    code: `classDiagram
  class Account {
    +String id
    +String email
    +login()
  }
  class Team {
    +String name
  }
  Account "*" --> "1" Team : belongs to`,
  },
  {
    id: "state",
    label: "State",
    code: `stateDiagram-v2
  [*] --> Draft
  Draft --> Review: submit
  Review --> Published: approve
  Review --> Draft: request changes
  Published --> [*]`,
  },
  {
    id: "gantt",
    label: "Gantt",
    code: `gantt
  title Release plan
  dateFormat YYYY-MM-DD
  section Build
  Design system   :done, a1, 2026-08-01, 10d
  Canvas engine   :active, a2, after a1, 14d
  section Ship
  Mermaid support : a3, after a2, 7d`,
  },
  {
    id: "mindmap",
    label: "Mindmap",
    code: `mindmap
  root((Diagram Studio))
    Data
      ERD
      SQL export
    Flows
      Flowchart
      Sequence
    Mermaid
      Import
      Export`,
  },
  {
    id: "pie",
    label: "Pie",
    code: `pie title Diagram types in use
  "ERD" : 42
  "Flowchart" : 27
  "Sequence" : 18
  "Class" : 13`,
  },
];

const STORAGE_KEY = "mermaid-studio-code";

export default function MermaidStudio() {
  const { appearance } = useAppearance();
  const [code, setCode] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? TEMPLATES[0].code,
  );
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rendering, setRendering] = useState(false);
  const idRef = useRef(0);

  const isDark = useMemo(() => {
    if (appearance.theme === "light") return false;
    if (appearance.theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  }, [appearance.theme]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: isDark ? "dark" : "default",
      fontFamily: "var(--font-sans, ui-sans-serif)",
      themeVariables: {
        primaryColor: isDark ? "#2d2d2d" : "#f5f2ef",
        primaryTextColor: isDark ? "#f2efec" : "#1a1a1a",
        primaryBorderColor: "#e85d3a",
        lineColor: isDark ? "#6b6b6b" : "#8a8a8a",
        tertiaryColor: isDark ? "#232323" : "#ffffff",
      },
    });
  }, [isDark]);

  const render = useCallback(
    async (source: string) => {
      setRendering(true);
      try {
        const id = `mmd-${++idRef.current}`;
        const { svg: out } = await mermaid.render(id, source);
        setSvg(out);
        setError(null);
      } catch (e: any) {
        setError(String(e?.message ?? e).split("\n").slice(0, 6).join("\n"));
      } finally {
        setRendering(false);
      }
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, code);
    const t = setTimeout(() => {
      if (code.trim()) render(code);
      else {
        setSvg("");
        setError(null);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [code, render, isDark]);

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMmd = () => download(new Blob([code], { type: "text/plain" }), "diagram.mmd");
  const exportSvg = () => svg && download(new Blob([svg], { type: "image/svg+xml" }), "diagram.svg");

  const exportPng = () => {
    if (!svg) return;
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement as unknown as SVGSVGElement;
    const box = parsed.viewBox?.baseVal;
    const width = (box?.width || parsed.width?.baseVal?.value || 1200) * 2;
    const height = (box?.height || parsed.height?.baseVal?.value || 800) * 2;
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = isDark ? "#1a1a1a" : "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((b) => b && download(b, "diagram.png"));
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sidebar = (
    <div className="space-y-1">
      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Templates</p>
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => setCode(t.code)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-smooth hover:bg-accent/60 hover:text-foreground"
        >
          <Waypoints size={14} /> {t.label}
        </button>
      ))}
    </div>
  );

  const header = (
    <div className="flex w-full items-center gap-2">
      <span className="text-sm font-semibold text-foreground">Mermaid studio</span>
      {rendering && <RefreshCw size={13} className="animate-spin text-muted-foreground" />}
      <div className="ml-auto flex items-center gap-1.5">
        <Button size="sm" variant="ghost" iconLeft={copied ? <Check size={14} /> : <Copy size={14} />} onClick={copyCode}>
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" variant="outline" iconLeft={<FileCode2 size={14} />} onClick={exportMmd}>
          .mmd
        </Button>
        <Button size="sm" variant="outline" iconLeft={<Download size={14} />} onClick={exportSvg} disabled={!svg}>
          SVG
        </Button>
        <Button size="sm" variant="primary" iconLeft={<ImageIcon size={14} />} onClick={exportPng} disabled={!svg}>
          PNG
        </Button>
      </div>
    </div>
  );

  return (
    <AppShell sidebar={sidebar} sidebarTitle="Mermaid" header={header}>
      <div className="grid h-full grid-cols-1 lg:grid-cols-2">
        <div className="flex min-h-[40vh] flex-col border-b border-border lg:border-b-0 lg:border-r">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            aria-label="Mermaid source"
            className="h-full w-full flex-1 resize-none bg-surface p-4 font-mono text-[13px] leading-relaxed text-foreground outline-none"
          />
          {error && (
            <Card className="m-3 border-destructive/40 bg-destructive/8 p-3">
              <p className="whitespace-pre-wrap font-mono text-xs text-destructive">{error}</p>
            </Card>
          )}
        </div>
        <div className={cn("relative min-h-[40vh] overflow-auto bg-canvas p-6")}>
          {svg ? (
            <div
              className="mermaid-preview flex min-h-full items-center justify-center [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <p className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
              Start typing Mermaid on the left to see it render here.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
