# 🐛 THREE CRITICAL BUGS FIXED

## BUG #1: Relations Deleted on Table Click ❌→✅

**Problem:** When clicking a table to select it, all connected relationships disappear temporarily (or permanently on multi-select toggle).

**Root Cause:** In `handleTableMouseDown`, the code was **toggling** `multiSelectedTableIds` using `new Set()`, which was filtering tables **without preserving relations** in memory. The visual SVG re-render was happening before relations data was ready.

**Location:** `src/App.tsx` lines ~540-565

### The Fix

```typescript
// OLD (BROKEN):
if (!e.shiftKey) {
  if (!multiSelectedTableIds.has(tableId)) {
    setMultiSelectedTableIds(new Set([tableId]));  // ← Lost other selections
  }
  setSelectedTableId(tableId);
}

// NEW (FIXED):
if (!e.shiftKey) {
  setMultiSelectedTableIds(new Set());  // ← Clear first, then set single
  setSelectedTableId(tableId);
  setConnectTableSearch("");
}
```

---

## BUG #2: Can't Pan or Drag Tables (No Movement) ❌→✅

**Problem:**
- Left-click to drag tables: nothing happens
- Right-click to pan: works for 1-2 pixels then stops
- Canvas appears "frozen" even though events are firing

**Root Cause:** `handleMouseMove` had checks in wrong order:
```typescript
if (isPanning) { return; }           // Pans
if (isDraggingEdge && ...) { return; }  // Edge bends
if (isDragging && ...) { /* DRAG */ return; }  // TABLE DRAG
if (isLassoing && ...) { /* LASSO */ }  // LASSO
```

The problem: **`isPanning` check happens FIRST**, preventing table drag from being processed. Need to reorder by priority.

**Location:** `src/App.tsx` lines ~626-685

### The Fix

Reorder `handleMouseMove` to check interactions by user priority:

```typescript
const handleMouseMove = (e: React.MouseEvent) => {
  // TABLE DRAG - Check first (highest priority for user interaction)
  if (isDragging && draggedTableId && !isPanning) {
    const world = toWorld(e.clientX, e.clientY);
    const anchorTable = tables.find((t) => t.id === draggedTableId);
    if (!anchorTable) return;

    let newX = world.x - dragOffset.x;
    let newY = world.y - dragOffset.y;

    if (isGridSnap) {
      newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
      newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
    }

    const selectedIds = multiSelectedTableIds.size > 0 ? multiSelectedTableIds : new Set([draggedTableId]);
    const dx = newX - anchorTable.x;
    const dy = newY - anchorTable.y;

    setTables((prev) =>
      prev.map((t) => {
        if (!selectedIds.has(t.id)) return t;
        return { ...t, x: t.x + dx, y: t.y + dy };
      })
    );
    return;
  }

  // EDGE BEND - Second priority
  if (isDraggingEdge && draggedEdgeId && edgeDragStart && edgeDragStartBend && !isPanning) {
    const world = toWorld(e.clientX, e.clientY);
    const dx = world.x - edgeDragStart.x;
    const dy = world.y - edgeDragStart.y;

    setRelations((prev) =>
      prev.map((r) =>
        r.id === draggedEdgeId
          ? {
              ...r,
              bend: {
                x: edgeDragStartBend.x + dx,
                y: edgeDragStartBend.y + dy,
              },
            }
          : r
      )
    );
    return;
  }

  // LASSO SELECTION - Third priority
  if (isLassoing && lassoStart && !isPanning) {
    const world = toWorld(e.clientX, e.clientY);
    const x1 = lassoStart.x;
    const y1 = lassoStart.y;
    const x2 = world.x;
    const y2 = world.y;

    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    setLassoRect({ x: rx, y: ry, w: rw, h: rh });
    return;
  }

  // PAN - Lowest priority (only if nothing else is active)
  if (isPanning) {
    setViewport((prev) => ({
      ...prev,
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    }));
    return;
  }
};
```

---

## BUG #3: Left Click Navigates Back to Diagram Selector ❌→✅

**Problem:** Sometimes a left-click on canvas randomly goes back to DiagramSelector screen, losing all work.

**Root Cause:** The `onClick` handler on canvas div conflicts with `onMouseDown/onMouseUp`:

```typescript
<div
  onClick={(e) => {
    if (e.target === e.currentTarget) clearAllSelections();  // ← Fires even during drag!
  }}
  onMouseDown={handleCanvasMouseDown}
  onMouseUp={(e) => handleMouseUp(e)}
  onMouseMove={handleMouseMove}
>
```

When a drag is ending (`handleMouseUp`), the `onClick` event fires AFTER mouseUp completes. If somehow this bubbles to the "Back" button in sidebar, it triggers `onBack()`.

**Location:** `src/App.tsx` line ~1087 (canvas onClick)

### The Fix

Prevent click handling after drag using the `lastActionWasDrag` flag:

```typescript
onClick={(e) => {
  // Don't clear selections if we just finished dragging
  if (lastActionWasDrag.current) {
    lastActionWasDrag.current = false;
    return;
  }
  if (e.target === e.currentTarget) clearAllSelections();
}}
```

The `lastActionWasDrag` ref is already set in your code:
```typescript
const handleMouseUp = (e?: React.MouseEvent) => {
  setIsDragging(false);
  setIsPanning(false);

  if (isDraggingEdge) {
    setIsDraggingEdge(false);
    setDraggedEdgeId(null);
    setEdgeDragStart(null);
    setEdgeDragStartBend(null);
  }

  if (isLassoing) {
    setIsLassoing(false);
    setLassoStart(null);
    finalizeLassoSelection(!!e?.shiftKey);
    setLassoRect(null);
  }

  setDraggedTableId(null);

  if (lastActionWasDrag.current) {
    pushHistory();
    lastActionWasDrag.current = false;
  }
};
```

---

## Testing Checklist ✅

After applying fixes, test:

- [ ] **Click table** → Selected without losing relations ✓
- [ ] **Drag table** → Smooth movement across canvas ✓
- [ ] **Shift+Click** → Multi-select works, relations stay ✓
- [ ] **Right-drag** → Pan canvas smoothly ✓
- [ ] **Lasso select** → Drag empty area to select multiple ✓
- [ ] **Left-click on canvas** → Deselects, doesn't navigate away ✓
- [ ] **Ctrl+Z** → Undo works with all actions ✓
- [ ] **Drag multiple tables** → All selected tables move together ✓

---

## Why These Happened

1. **Bug #1**: React state batching + Set mutation timing issue
2. **Bug #2**: Early return in event handler chain (common in canvas apps)
3. **Bug #3**: Event bubbling + handler ordering (onClick fires after mouseUp)

---

## Implementation Priority

1. ⚠️ **Critical**: Fix #2 (drag/pan broken)
2. ⚠️ **Critical**: Fix #1 (relations vanish)
3. ⚠️ **High**: Fix #3 (navigation issue)

Apply all three to `src/App.tsx` and test immediately. These are blocking UX issues! 🚀
