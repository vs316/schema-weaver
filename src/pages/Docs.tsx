import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { TRANSFORMERS } from "@lexical/markdown";
import { $getRoot, type EditorState, type LexicalEditor } from "lexical";
import { FileText, Plus, Search, Trash2, Users2, Cloud, CloudOff } from "lucide-react";
import { Navigate } from "react-router-dom";

import { AppShell } from "../components/shell/AppShell";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EmptyState, Skeleton, Badge } from "../ui/Surface";
import { cn } from "../ui/cn";
import { supabase } from "../integrations/supabase/safeClient";
import { useAuth } from "../hooks/useAuth";
import { useLiveRoom } from "../collab/useLiveRoom";
import { PresenceBar, LiveCursors, ActivityPanel } from "../collab/Collab";
import { logger } from "../utils/logger";

interface DocRow {
  id: string;
  title: string;
  icon: string;
  content: any;
  plain_text: string;
  updated_at: string;
  team_id: string | null;
}

const theme = {
  paragraph: "mb-3 leading-relaxed",
  quote: "border-l-2 border-primary/60 pl-4 italic text-muted-foreground my-3",
  heading: {
    h1: "text-3xl font-bold tracking-tight mt-6 mb-3",
    h2: "text-2xl font-semibold tracking-tight mt-5 mb-2",
    h3: "text-xl font-semibold mt-4 mb-2",
  },
  list: {
    ul: "list-disc pl-6 mb-3 space-y-1",
    ol: "list-decimal pl-6 mb-3 space-y-1",
    listitem: "leading-relaxed",
  },
  link: "text-primary underline underline-offset-2",
  text: {
    bold: "font-semibold",
    italic: "italic",
    code: "rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]",
    strikethrough: "line-through",
    underline: "underline underline-offset-2",
  },
  code: "block rounded-lg bg-muted p-3 font-mono text-sm my-3 overflow-x-auto",
};

/** Applies remote document state pushed by teammates. */
function RemoteStatePlugin({
  remote,
  isTypingRef,
}: {
  remote: { state: string; at: number } | null;
  isTypingRef: React.MutableRefObject<number>;
}) {
  const [editor] = useLexicalComposerContext();
  const appliedRef = useRef(0);

  useEffect(() => {
    if (!remote || remote.at <= appliedRef.current) return;
    if (Date.now() - isTypingRef.current < 1200) return; // don't stomp active typing
    try {
      const next = editor.parseEditorState(remote.state);
      editor.setEditorState(next);
      appliedRef.current = remote.at;
    } catch (e) {
      logger.warn("doc:remote-apply-failed", e);
    }
  }, [remote, editor, isTypingRef]);

  return null;
}

function EditorSurface({
  doc,
  onChange,
  remote,
  isTypingRef,
  editorRef,
}: {
  doc: DocRow;
  onChange: (state: EditorState, editor: LexicalEditor) => void;
  remote: { state: string; at: number } | null;
  isTypingRef: React.MutableRefObject<number>;
  editorRef: React.MutableRefObject<LexicalEditor | null>;
}) {
  const initialConfig = useMemo(
    () => ({
      namespace: "docs",
      theme,
      onError: (error: Error) => logger.error("lexical", error),
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        AutoLinkNode,
        CodeNode,
        CodeHighlightNode,
      ],
      editorState:
        doc.content && typeof doc.content === "object" && (doc.content as any).root
          ? JSON.stringify(doc.content)
          : undefined,
    }),
    [doc.id], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative mx-auto w-full max-w-3xl px-8 py-10">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="min-h-[60vh] outline-none text-[15px] text-foreground" />
          }
          placeholder={
            <p className="pointer-events-none absolute left-8 top-10 text-muted-foreground">
              Start writing… markdown shortcuts work (# heading, - list, &gt; quote, ```code).
            </p>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <OnChangePlugin onChange={onChange} ignoreSelectionChange />
        <RemoteStatePlugin remote={remote} isTypingRef={isTypingRef} />
        <CaptureEditor editorRef={editorRef} />
      </div>
    </LexicalComposer>
  );
}

function CaptureEditor({ editorRef }: { editorRef: React.MutableRefObject<LexicalEditor | null> }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editorRef.current = editor;
  }, [editor, editorRef]);
  return null;
}

export default function DocsPage() {
  const { user, loading: authLoading } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [remote, setRemote] = useState<{ state: string; at: number } | null>(null);
  const [showActivity, setShowActivity] = useState(true);

  const isTypingRef = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<LexicalEditor | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const activeDoc = docs.find((d) => d.id === activeId) || null;

  const userName =
    (user?.user_metadata as any)?.display_name || user?.email?.split("@")[0] || "Anonymous";

  const { peers, isConnected, updateCursor } = useLiveRoom({
    roomId: activeDoc ? `doc:${activeDoc.id}` : "docs:library",
    userId: user?.id ?? null,
    userName,
    activity: activeDoc ? `Editing “${activeDoc.title}”` : "Browsing documents",
  });

  // Load team + documents
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", user.id)
        .maybeSingle();
      const tid = (profile as any)?.team_id ?? null;
      const { data, error } = await supabase
        .from("documents")
        .select("id,title,icon,content,plain_text,updated_at,team_id")
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      if (error) logger.error("docs:load", error);
      setTeamId(tid);
      setDocs((data as DocRow[]) ?? []);
      setActiveId((prev) => prev ?? (data && data[0] ? (data[0] as DocRow).id : null));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Realtime: teammates' saved changes
  useEffect(() => {
    if (!activeDoc) return;
    const channel = supabase
      .channel(`documents:${activeDoc.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "documents", filter: `id=eq.${activeDoc.id}` },
        (payload) => {
          const row = payload.new as DocRow & { updated_by?: string };
          if (row.updated_by === user?.id) return;
          setDocs((prev) => prev.map((d) => (d.id === row.id ? { ...d, ...row } : d)));
          if (row.content && (row.content as any).root) {
            setRemote({ state: JSON.stringify(row.content), at: Date.now() });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeDoc?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    async (id: string, patch: Partial<DocRow>) => {
      setSaving("saving");
      const { error } = await supabase
        .from("documents")
        .update({ ...patch, updated_by: user?.id ?? null } as any)
        .eq("id", id);
      if (error) {
        logger.error("docs:save", error);
        setSaving("error");
        return;
      }
      setSaving("saved");
      setTimeout(() => setSaving((s) => (s === "saved" ? "idle" : s)), 1500);
    },
    [user?.id],
  );

  const handleChange = useCallback(
    (state: EditorState) => {
      if (!activeId) return;
      isTypingRef.current = Date.now();
      const json = state.toJSON();
      let text = "";
      state.read(() => {
        text = $getRoot().getTextContent().slice(0, 400);
      });
      setDocs((prev) =>
        prev.map((d) => (d.id === activeId ? { ...d, content: json, plain_text: text } : d)),
      );
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        persist(activeId, { content: json, plain_text: text } as Partial<DocRow>);
      }, 900);
    },
    [activeId, persist],
  );

  const createDoc = useCallback(async () => {
    if (!teamId) return;
    const { data, error } = await supabase
      .from("documents")
      .insert({ team_id: teamId, created_by: user?.id ?? null, updated_by: user?.id ?? null } as any)
      .select("id,title,icon,content,plain_text,updated_at,team_id")
      .single();
    if (error) {
      logger.error("docs:create", error);
      return;
    }
    setDocs((prev) => [data as DocRow, ...prev]);
    setActiveId((data as DocRow).id);
  }, [teamId, user?.id]);

  const deleteDoc = useCallback(
    async (id: string) => {
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setActiveId((prev) => (prev === id ? null : prev));
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) logger.error("docs:delete", error);
    },
    [],
  );

  const renameDoc = useCallback(
    (id: string, title: string) => {
      setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, title } : d)));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(id, { title }), 600);
    },
    [persist],
  );

  const filtered = docs.filter(
    (d) =>
      !query ||
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      d.plain_text.toLowerCase().includes(query.toLowerCase()),
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect) return;
      updateCursor(e.clientX - rect.left, e.clientY - rect.top);
    },
    [updateCursor],
  );

  const sidebar = (
    <div className="space-y-2">
      <Button className="w-full" onClick={createDoc} disabled={!teamId}>
        <Plus size={15} /> New document
      </Button>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents"
          className="pl-8"
        />
      </div>
      <div className="space-y-1 pt-1">
        {loading
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)
          : filtered.map((d) => (
              <div
                key={d.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-smooth",
                  d.id === activeId
                    ? "bg-primary/12 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => setActiveId(d.id)}
                >
                  <span className="shrink-0">{d.icon || "📄"}</span>
                  <span className="truncate">{d.title}</span>
                </button>
                <button
                  aria-label={`Delete ${d.title}`}
                  onClick={() => deleteDoc(d.id)}
                  className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
      </div>
    </div>
  );

  const header = activeDoc ? (
    <div className="flex w-full items-center gap-3">
      <FileText size={15} className="shrink-0 text-muted-foreground" />
      <input
        value={activeDoc.title}
        onChange={(e) => renameDoc(activeDoc.id, e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none"
        aria-label="Document title"
      />
      <Badge tone={saving === "error" ? "danger" : "neutral"}>
        {saving === "saving" ? (
          <>
            <Cloud size={11} /> Saving
          </>
        ) : saving === "error" ? (
          <>
            <CloudOff size={11} /> Save failed
          </>
        ) : (
          <>
            <Cloud size={11} /> Saved
          </>
        )}
      </Badge>
      <PresenceBar peers={peers} isConnected={isConnected} />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowActivity((v) => !v)}
        aria-label="Toggle live activity"
      >
        <Users2 size={15} />
      </Button>
    </div>
  ) : (
    <div className="flex w-full items-center justify-between">
      <span className="text-sm font-semibold">Documents</span>
      <PresenceBar peers={peers} isConnected={isConnected} />
    </div>
  );

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <AppShell sidebar={sidebar} sidebarTitle="Documents" header={header}>
      <div className="flex h-full min-h-0">
        <div ref={surfaceRef} className="relative min-w-0 flex-1 overflow-auto" onMouseMove={onMouseMove}>
          <LiveCursors peers={peers} />
          {loading ? (
            <div className="mx-auto max-w-3xl space-y-3 px-8 py-10">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : activeDoc ? (
            <EditorSurface
              key={activeDoc.id}
              doc={activeDoc}
              onChange={handleChange}
              remote={remote}
              isTypingRef={isTypingRef}
              editorRef={editorRef}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState
                icon={<FileText size={22} />}
                title="No documents yet"
                description="Write specs, RFCs and runbooks alongside your diagrams — with live teammate cursors."
                action={
                  <Button onClick={createDoc} disabled={!teamId}>
                    <Plus size={15} /> New document
                  </Button>
                }
              />
            </div>
          )}
        </div>

        {showActivity && (
          <aside className="hidden w-64 shrink-0 border-l border-border bg-sidebar p-3 lg:block">
            <ActivityPanel peers={peers} isConnected={isConnected} />
          </aside>
        )}
      </div>
    </AppShell>
  );
}
