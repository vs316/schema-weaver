import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  LayoutTemplate,
  Trash2,
  Settings as SettingsIcon,
  Users,
  PanelLeftClose,
  PanelLeft,
  Command,
  Waypoints,
} from "lucide-react";
import { cn } from "../../ui/cn";
import { Tooltip } from "../../ui/Tooltip";
import { useAppearance } from "../AppearanceProvider";
import { CommandPalette } from "./CommandPalette";

export interface RailItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  to?: string;
  onClick?: () => void;
  shortcut?: string;
}

export function AppShell({
  sidebar,
  sidebarTitle,
  header,
  children,
  onSearch,
}: {
  sidebar?: React.ReactNode;
  sidebarTitle?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  onSearch?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { appearance, update } = useAppearance();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const collapsed = appearance.sidebarCollapsed;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        update({ sidebarCollapsed: !collapsed });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed, update]);

  const items: RailItem[] = [
    { id: "home", label: "Home", icon: <Home size={18} />, to: "/diagrams" },
    { id: "search", label: "Search", icon: <Search size={18} />, onClick: () => (onSearch ? onSearch() : setPaletteOpen(true)), shortcut: "⌘K" },
    { id: "mermaid", label: "Mermaid studio", icon: <Waypoints size={18} />, to: "/mermaid" },
    { id: "templates", label: "Templates", icon: <LayoutTemplate size={18} />, to: "/templates" },
    { id: "team", label: "Team", icon: <Users size={18} />, to: "/team" },
    { id: "trash", label: "Trash", icon: <Trash2 size={18} />, to: "/trash" },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Left rail */}
      <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-rail py-3">
        <button
          onClick={() => navigate("/diagrams")}
          className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-smooth hover:brightness-110"
          aria-label="Diagram Studio home"
        >
          <span className="text-sm font-extrabold">D</span>
        </button>

        {items.map((item) => {
          const active = item.to ? location.pathname.startsWith(item.to) : false;
          return (
            <Tooltip key={item.id} label={item.label} shortcut={item.shortcut} side="right">
              <button
                onClick={() => (item.onClick ? item.onClick() : item.to && navigate(item.to))}
                aria-label={item.label}
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-lg transition-smooth",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute -left-[9px] h-5 w-[3px] rounded-r-full bg-primary" />
                )}
                {item.icon}
              </button>
            </Tooltip>
          );
        })}

        <div className="mt-auto flex flex-col items-center gap-1">
          <Tooltip label="Command palette" shortcut="⌘K" side="right">
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="Command palette"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
            >
              <Command size={18} />
            </button>
          </Tooltip>
          <Tooltip label="Settings" side="right">
            <button
              onClick={() => navigate("/settings")}
              aria-label="Settings"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-smooth",
                location.pathname.startsWith("/settings")
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <SettingsIcon size={18} />
            </button>
          </Tooltip>
        </div>
      </nav>

      {/* Collapsible sidebar */}
      {sidebar && (
        <aside
          className={cn(
            "flex shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar",
            "transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            collapsed ? "w-0" : "w-64",
          )}
        >
          <div className="flex h-12 items-center justify-between gap-2 border-b border-sidebar-border px-3">
            <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {sidebarTitle}
            </span>
            <Tooltip label="Collapse sidebar" shortcut="⌘\" side="bottom">
              <button
                onClick={() => update({ sidebarCollapsed: true })}
                className="rounded-md p-1 text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={16} />
              </button>
            </Tooltip>
          </div>
          <div className="flex-1 overflow-y-auto p-2">{sidebar}</div>
        </aside>
      )}

      {/* Main region */}
      <div className="flex min-w-0 flex-1 flex-col">
        {(header || (sidebar && collapsed)) && (
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface/60 px-3 backdrop-blur">
            {sidebar && collapsed && (
              <Tooltip label="Expand sidebar" shortcut="⌘\" side="bottom">
                <button
                  onClick={() => update({ sidebarCollapsed: false })}
                  className="rounded-md p-1.5 text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
                  aria-label="Expand sidebar"
                >
                  <PanelLeft size={16} />
                </button>
              </Tooltip>
            )}
            <div className="flex min-w-0 flex-1 items-center">{header}</div>
          </header>
        )}
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
