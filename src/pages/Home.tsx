import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Database,
  BoxSelect,
  GitBranch,
  MessageSquare,
  Search,
  Trash2,
  Pencil,
  Clock,
  LogOut,
  Layers,
  Waypoints,
} from "lucide-react";
import type { ERDDiagram } from "../hooks/useCloudSync";
import type { DiagramType } from "../types/uml";
import { AppShell } from "../components/shell/AppShell";
import { useAuth } from "../hooks/useAuth";
import { useLiveRoom } from "../collab/useLiveRoom";
import { PresenceBar } from "../collab/Collab";
import { Card, Badge, EmptyState, Skeleton } from "../ui/Surface";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Dialog } from "../ui/Dialog";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../ui/cn";

export interface DiagramLibraryProps {
  diagrams: ERDDiagram[];
  loading: boolean;
  error?: string | null;
  teamId: string | null;
  onSelect: (diagram: ERDDiagram) => void;
  onCreate: (type?: DiagramType, name?: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onLogout: () => void;
}

const TYPES: { type: DiagramType; label: string; icon: React.ReactNode; hint: string }[] = [
  { type: "erd", label: "Entity Relationship", icon: <Database size={16} />, hint: "Tables, columns, relations" },
  { type: "uml-class", label: "UML Class", icon: <BoxSelect size={16} />, hint: "Classes, attributes, methods" },
  { type: "flowchart", label: "Flowchart", icon: <GitBranch size={16} />, hint: "Processes and decisions" },
  { type: "sequence", label: "Sequence", icon: <MessageSquare size={16} />, hint: "Actors and messages" },
];

function typeMeta(t: string) {
  return TYPES.find((x) => x.type === t) ?? TYPES[0];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function DiagramLibrary({
  diagrams,
  loading,
  error,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onLogout,
}: DiagramLibraryProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DiagramType | "all">("all");
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<DiagramType>("erd");
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<ERDDiagram | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ERDDiagram | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return diagrams.filter(
      (d) =>
        (filter === "all" || d.diagram_type === filter) &&
        (!q || d.name.toLowerCase().includes(q)),
    );
  }, [diagrams, query, filter]);

  const recents = useMemo(() => diagrams.slice(0, 3), [diagrams]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    diagrams.forEach((d) => (c[d.diagram_type] = (c[d.diagram_type] ?? 0) + 1));
    return c;
  }, [diagrams]);

  const sidebar = (
    <div className="space-y-4">
      <Button className="w-full" variant="primary" iconLeft={<Plus size={15} />} onClick={() => setCreating(true)}>
        New diagram
      </Button>

      <div className="space-y-0.5">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Library</p>
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-smooth",
            filter === "all" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          <Layers size={15} />
          <span className="flex-1 text-left">All diagrams</span>
          <span className="text-xs text-muted-foreground">{diagrams.length}</span>
        </button>
        {TYPES.map((t) => (
          <button
            key={t.type}
            onClick={() => setFilter(t.type)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-smooth",
              filter === t.type ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {t.icon}
            <span className="flex-1 truncate text-left">{t.label}</span>
            <span className="text-xs text-muted-foreground">{counts[t.type] ?? 0}</span>
          </button>
        ))}
        <button
          onClick={() => navigate("/mermaid")}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-smooth hover:bg-accent/60 hover:text-foreground"
        >
          <Waypoints size={15} />
          <span className="flex-1 text-left">Mermaid studio</span>
        </button>
      </div>

      <div className="pt-2">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-smooth hover:bg-accent/60 hover:text-foreground"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <AppShell sidebar={sidebar} sidebarTitle="Workspace">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 animate-fade-in">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Diagram Studio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Data models, flows, sequences and Mermaid — for your whole team.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search diagrams"
                className="w-56 pl-8"
              />
            </div>
            <Button variant="primary" iconLeft={<Plus size={15} />} onClick={() => setCreating(true)}>
              New
            </Button>
          </div>
        </header>

        {error && (
          <Card className="mb-5 border-destructive/40 bg-destructive/8 px-4 py-3 text-sm text-destructive">{error}</Card>
        )}

        {!loading && recents.length > 0 && !query && filter === "all" && (
          <section className="mb-8">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Continue where you left off
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recents.map((d) => {
                const meta = typeMeta(d.diagram_type);
                return (
                  <Card key={d.id} interactive onClick={() => onSelect(d)} className="p-4">
                    <div className="mb-3 flex items-center gap-2 text-primary">{meta.icon}
                      <span className="truncate text-sm font-medium text-foreground">{d.name}</span>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} /> {timeAgo(d.updated_at)}
                    </p>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {filter === "all" ? "All diagrams" : typeMeta(filter).label}
          </h2>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Layers size={20} />}
              title={query ? "No matching diagrams" : "Nothing here yet"}
              description={
                query ? "Try a different search term." : "Create your first diagram to get the workspace going."
              }
              action={
                <Button variant="primary" iconLeft={<Plus size={15} />} onClick={() => setCreating(true)}>
                  New diagram
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((d) => {
                const meta = typeMeta(d.diagram_type);
                return (
                  <Card key={d.id} interactive onClick={() => onSelect(d)} className="group p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-primary">{meta.icon}</span>
                        <span className="truncate text-sm font-medium text-foreground">{d.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-smooth group-hover:opacity-100">
                        <Tooltip label="Rename">
                          <button
                            aria-label="Rename diagram"
                            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenaming(d);
                              setRenameValue(d.name);
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <button
                            aria-label="Delete diagram"
                            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(d);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="neutral">{meta.label}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={12} /> {timeAgo(d.updated_at)}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Create */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New diagram"
        description="Pick a type and give it a name."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onCreate(newType, newName.trim() || "Untitled Diagram");
                setCreating(false);
                setNewName("");
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => setNewType(t.type)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-smooth",
                  newType === t.type
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-border-strong hover:bg-accent/50",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {t.icon} {t.label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{t.hint}</span>
              </button>
            ))}
          </div>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Diagram name"
          />
        </div>
      </Dialog>

      {/* Rename */}
      <Dialog
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title="Rename diagram"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (renaming && renameValue.trim()) onRename(renaming.id, renameValue.trim());
                setRenaming(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
      </Dialog>

      {/* Delete */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete diagram?"
        description={confirmDelete ? `"${confirmDelete.name}" will be permanently removed.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) onDelete(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </AppShell>
  );
}

export default DiagramLibrary;
