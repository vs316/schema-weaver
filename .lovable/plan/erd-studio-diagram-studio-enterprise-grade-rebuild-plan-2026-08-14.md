# ERD Studio → Diagram Studio: Enterprise-Grade Rebuild Plan

Goal: turn the current prototype into a daily-driver, org-wide diagramming product — any chart, graph, diagram, data model or sketch; created, generated, edited and collaborated on live; with a premium, distinctive, configurable design system and Mermaid support end to end.

## 1. Where it stands today (audit)

Strengths already in place: multi-type diagram storage (ERD / UML class / flowchart / sequence in one `erd_diagrams` row), team workspaces with roles, presence + cursors, autosave every 2s, PNG/SVG export, MySQL DDL generation, admin panel, feature flags, error boundary.

Gaps that keep it out of the Figma/Notion/Canva category:

**Product/functional**

- No Mermaid at all (no import, no live code↔canvas, no export).
- Only 4 hard-coded diagram types; no generic shape/sketch layer, no freehand, no text/sticky/frame primitives, no images, no connectors between arbitrary shapes.
- No version history / named versions / restore / diff — only a local in-memory undo stack that dies on refresh.
- No comments-on-canvas threads, mentions, or notifications inbox (comments exist only as table metadata).
- No search across diagrams, no folders/projects, no tags, no favourites, no recents, no templates gallery, no duplicate/move.
- No share links, no read-only public view, no embed, no per-diagram permissions (permissions are team-wide only).
- Export is PNG/SVG only — no PDF, no multi-page, no copy-as-Mermaid/JSON/SQL for Postgres, no clipboard image.
- No AI generation ("describe a system → get a diagram", "SQL → ERD", "text → flowchart").
- No auto-layout, no smart routing/orthogonal edges, no alignment guides/snapping/distribute, no grouping, no multi-select transforms.
- No keyboard-first command palette (⌘K), no quick-insert, no context menus.
- No presentation mode, no minimap parity across all types, no fullscreen focus mode.
- No onboarding, empty states are dead ends, no in-app help.
- No personal settings at all (theme, density, font, shortcuts, defaults).  
  
We need this as well to turn it into a true enteprise-org usable platform: (like Clickup/Notion):  
- Do full CRUD , and view, write, create, update, in proper formatting and styling all kinds of documents-- like pdfs, docs, docx, slides(pptx), excel sheets ,etc.. (e2e, premium , branded, styled, exhaustive)

**Engineering**

- Monolithic `App.tsx`-driven state; per-type components duplicate canvas logic instead of one shared engine.
- Realtime is last-write-wins on a whole JSONB blob — two editors overwrite each other; no conflict resolution, no operation log.
- Autosave writes the entire diagram document every 2s (cost + contention at scale); no dirty-field diffing, no offline queue.
- No tests, no error telemetry, no perf budget; 64-table ERDs already render every node as DOM.
- No pagination/virtualisation on the diagram list or canvas.
- Styling is a mix of `App.css` hex literals, Tailwind, and inline styles — no token layer, so theming/density/fonts are impossible today.

**Security/ops**

- Diagram RLS uses `get_user_team_id` (single team) while the app has multi-team membership → access rules and UI disagree.
- No audit trail on diagram changes, no soft delete/trash, no rate limits on writes.
- Email/domain not configured (password reset mail doesn't deliver).

## 2. Design direction

Locked palette — **Charcoal & Ember**: `#1a1a1a` base, `#2d2d2d` surface, `#4a4a4a` line, `#e85d3a` accent. Precision-instrument feel: near-black canvas, warm ember for anything active, selected, live, or destructive-adjacent. No purple/indigo gradients, no glassmorphism clichés.

Per your answer, typography and density are **user-configurable, not fixed**:

- Personal Settings → Appearance with: theme (dark / light / system / high-contrast), font family (sans, serif, mono, and a "system" option), UI scale (S/M/L), and density (**compact / cozy / comfortable**) driving all paddings, row heights and control sizes.
- All of it is CSS-variable driven, persisted per user in the backend and mirrored to localStorage so it applies before first paint.

App shell (my recommendation, chosen for long-term scale): **persistent left rail + collapsible sidebar + full-bleed canvas**. Rail = workspace switcher, Home, Search, Templates, Trash, Settings. Sidebar = project/folder tree and diagram list, collapsible to zero for focus mode. Canvas is edge-to-edge with floating, draggable tool clusters (Figma-style) instead of fixed chrome. Home is a bento-ish surface: Continue where you left off, Recents, Templates, Team activity.

Motion: 120–200ms micro-interactions, spring-based panel and node transforms, shared-element transitions from diagram card → canvas, animated presence avatars and cursor trails, skeleton→content crossfades. Motion respects `prefers-reduced-motion` and the density setting.

## 3. Delivery phases

**Phase 1 — Design system + app shell (first, per your priority)**
Token layer in CSS variables (color, spacing, radius, elevation, motion, type scale, density multipliers); remove all hardcoded hex/inline colors; component primitives (button, input, select, dialog, popover, tooltip, menu, toast, tabs, sheet, command palette); the new shell, Home surface, empty states, skeletons; Personal Settings (theme/font/scale/density); ⌘K command palette; full keyboard map.

**Phase 2 — Unified canvas engine**
One canvas core (viewport, selection, transform, snapping, alignment guides, grouping, marquee, copy/paste, nudge, z-order, context menus) with diagram types as plugins over a shared document model. Adds a generic shape/sketch layer: rectangles, ellipses, sticky notes, text, images, freehand ink, frames, and arbitrary connectors — so "any diagram" is possible, not just the four types. Canvas rendering moves to virtualised/culled rendering for large graphs.

**Phase 3 — Mermaid end to end**

- Split view: live Mermaid code editor (CodeMirror, syntax highlight, error markers) beside the rendered diagram, with debounce and error recovery.
- Import/paste Mermaid → parsed into the native document model, editable on canvas.
- Native diagram → Mermaid code generation, kept in sync bidirectionally (code edits update canvas, canvas edits regenerate code).
- Supported: flowchart, sequence, class, ER, state, gantt, journey, mindmap, pie, timeline.
- Export: `.mmd`, PNG, SVG, PDF, copy-to-clipboard; and view-only render of Mermaid embedded elsewhere.

**Phase 4 — Real-time collaboration, hardened**
Move from whole-blob last-write-wins to per-entity operations with a server-authoritative op log; presence with follow-mode ("follow Arya"), live selection highlights, canvas comment threads with mentions and resolve, notification inbox, offline queue with reconnect replay, and conflict-free merge on rejoin.

**Phase 5 — Content management + sharing**
Projects/folders, tags, favourites, search (name + content), templates gallery (ERD patterns, architecture, flows, org charts, etc.), duplicate/move, trash with restore, version history with named snapshots, visual diff and restore, share links (view/comment/edit), public read-only view, embed.

**Phase 6 — AI generation**
Text → diagram, SQL/DDL → ERD, code/schema paste → model, "explain this diagram", "clean up layout", "suggest missing relations". Streams into the canvas as reviewable proposals, never silent edits. Uses the built-in AI gateway; no extra keys.

**Phase 7 — Enterprise, security, resilience**
Per-diagram permissions layered over team roles; RLS rewritten to multi-team membership so policies match the app; audit log for diagram and permission changes; soft delete; write rate limits; email domain configured so password reset and invites deliver; telemetry + error reporting; test suite (unit for the document model and Mermaid round-trip, integration for collab, E2E for critical flows); performance budgets with large-diagram benchmarks.

## 4. Technical notes

- Document model: normalised `nodes` / `edges` / `layers` with a `kind` discriminator, replacing the parallel `tables`/`uml_classes`/`flowchart_nodes`/`sequence_*` JSONB columns. Migration keeps old columns and backfills the new model so existing diagrams survive.
- New tables: `projects`, `diagram_versions`, `diagram_ops`, `diagram_comments`, `diagram_permissions`, `user_settings`, `diagram_audit`. Every one ships with GRANTs + RLS in the same migration.
- Editor: CodeMirror 6 for Mermaid; `mermaid` for parse/render; a thin adapter maps Mermaid AST ↔ document model in both directions.
- Motion: Motion for React, single shared easing/duration token set.
- Rendering: SVG-based canvas with culling and layer batching; DOM only for editable overlays.
- Realtime: existing realtime channels carry ops; server function validates and appends to `diagram_ops`, clients apply and periodically compact into a materialised document.

## 5. What ships when

Each phase is independently usable and shipped in order, starting with Phase 1. Phase 3 (Mermaid) is the first big new capability after the foundation, since it depends on the unified document model from Phase 2.
## 6. Addendum — Lexical editor foundation + collaboration everywhere

**Build on open source instead of from scratch.** The document/rich-text layer is built on **Lexical** (Meta's open-source editor framework) rather than a bespoke editor:

- Lexical core + React bindings, with the official rich-text, list, link, table, markdown-shortcut, and history plugins.
- Custom Lovable nodes on top: `/` slash-command menu, callouts, code blocks with syntax highlight, embedded diagram nodes (an ERD/Mermaid diagram rendered inline and openable on canvas), file/attachment nodes, and mention nodes.
- Export pipeline from the Lexical document model: PDF, DOCX, Markdown, HTML; import from Markdown/DOCX. Slides (PPTX) and sheets (XLSX) reuse the same export service.
- Other open-source building blocks used the same way: `mermaid` (parse/render), CodeMirror 6 (code panes), `perfect-freehand` (ink), `elkjs`/`dagre` (auto-layout), `yjs` + `y-websocket`-style CRDT transport over the existing realtime channels, and `docx`/`pptx`/`xlsx` writers for document export.

**Real-time collaboration is a platform layer, not a per-surface feature.** Every surface — canvas, Mermaid studio, documents, sheets, slides, the diagram library, and settings-free read views — joins a shared "room":

- One reusable room layer (presence + broadcast + CRDT doc) keyed by resource id, so any new surface gets collaboration by mounting one hook.
- Live teammate cursors with name labels on every surface (canvas coordinates on diagrams, caret/selection positions in documents).
- Live selection highlights: see exactly which table, node, block, or text range each teammate has selected, in their colour.
- A "who's here" bar with avatars, follow-mode (jump to and track a teammate's viewport), and an activity view showing what each teammate is editing right now across the workspace.
- Presence-aware editing: soft locks/ghosting on the element a teammate is actively editing, typing indicators, and conflict-free merges via CRDT rather than last-write-wins.
- Comments, mentions and resolve threads anchored to blocks and canvas objects, with a notification inbox.
- Offline queue with replay on reconnect, so collaboration survives flaky networks.

Reference bar for the experience: Notion, Google Docs, Figma, draw.io and Excalidraw — cursors, selections, presence, and instant convergence.
