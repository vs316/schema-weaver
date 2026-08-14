import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Home,
  Settings as SettingsIcon,
  Users,
  Sun,
  Moon,
  Monitor,
  Contrast,
  Rows3,
  Type,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "../../ui/cn";
import { useAppearance } from "../AppearanceProvider";

export interface Command {
  id: string;
  label: string;
  group: string;
  icon?: React.ReactNode;
  keywords?: string;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  extraCommands = [],
}: {
  open: boolean;
  onClose: () => void;
  extraCommands?: Command[];
}) {
  const navigate = useNavigate();
  const { appearance, update } = useAppearance();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const base: Command[] = [
      { id: "go-home", group: "Navigate", label: "Go to Home", icon: <Home size={15} />, run: () => navigate("/diagrams") },
      { id: "go-team", group: "Navigate", label: "Go to Team", icon: <Users size={15} />, run: () => navigate("/team") },
      { id: "go-settings", group: "Navigate", label: "Open Settings", icon: <SettingsIcon size={15} />, run: () => navigate("/settings") },

      { id: "theme-dark", group: "Appearance", label: "Theme: Dark", icon: <Moon size={15} />, run: () => update({ theme: "dark" }) },
      { id: "theme-light", group: "Appearance", label: "Theme: Light", icon: <Sun size={15} />, run: () => update({ theme: "light" }) },
      { id: "theme-system", group: "Appearance", label: "Theme: System", icon: <Monitor size={15} />, run: () => update({ theme: "system" }) },
      { id: "theme-contrast", group: "Appearance", label: "Theme: High contrast", icon: <Contrast size={15} />, run: () => update({ theme: "contrast" }) },

      { id: "density-compact", group: "Appearance", label: "Density: Compact", icon: <Rows3 size={15} />, run: () => update({ density: "compact" }) },
      { id: "density-cozy", group: "Appearance", label: "Density: Cozy", icon: <Rows3 size={15} />, run: () => update({ density: "cozy" }) },
      { id: "density-comfortable", group: "Appearance", label: "Density: Comfortable", icon: <Rows3 size={15} />, run: () => update({ density: "comfortable" }) },

      { id: "font-sans", group: "Appearance", label: "Font: Sans", icon: <Type size={15} />, run: () => update({ font: "sans" }) },
      { id: "font-serif", group: "Appearance", label: "Font: Serif", icon: <Type size={15} />, run: () => update({ font: "serif" }) },
      { id: "font-mono", group: "Appearance", label: "Font: Mono", icon: <Type size={15} />, run: () => update({ font: "mono" }) },

      {
        id: "motion",
        group: "Appearance",
        label: appearance.reducedMotion ? "Enable animations" : "Reduce motion",
        run: () => update({ reducedMotion: !appearance.reducedMotion }),
      },
    ];
    return [...extraCommands, ...base];
  }, [navigate, update, appearance.reducedMotion, extraCommands]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  if (!open) return null;

  const runAt = (i: number) => {
    const cmd = filtered[i];
    if (!cmd) return;
    cmd.run();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(index);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  let lastGroup = "";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-xl animate-scale-in"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search size={16} className="text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, diagrams, settings…"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">esc</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No matching commands</p>
          )}
          {filtered.map((cmd, i) => {
            const showGroup = cmd.group !== lastGroup;
            lastGroup = cmd.group;
            return (
              <React.Fragment key={cmd.id}>
                {showGroup && (
                  <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {cmd.group}
                  </p>
                )}
                <button
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => runAt(i)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-smooth",
                    i === index ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="text-muted-foreground">{cmd.icon}</span>
                  <span className="flex-1 truncate">{cmd.label}</span>
                  {i === index && <CornerDownLeft size={13} className="text-muted-foreground" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
