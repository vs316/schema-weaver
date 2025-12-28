import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Palette, Link2, Unlink, Plus, Copy, Trash2, ChevronRight, Search } from "lucide-react";
import type { Table, Relation, Column } from "../../types";
import { COLUMN_TYPES, TABLE_COLORS } from "../../utils/constants";
interface RightPanelProps {
  isOpen: boolean;
  selectedTableId: string | null;
  selectedEdgeId: string | null;
  tables: Table[];
  relations: Relation[];
  connectTableSearch: string;
  onClose: () => void;
  onUpdateTable: (tableId: string, updates: Partial<Table>) => void;
  onUpdateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  onAddColumn: (tableId: string) => void;
  onDeleteColumn: (tableId: string, columnId: string) => void;
  onToggleRelation: (sourceId: string, targetId: string) => void;
  onDuplicateTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onUpdateRelation: (relationId: string, updates: Partial<Relation>) => void;
  onDeleteRelation: (relationId: string) => void;
  onSearchChange: (search: string) => void;
  onPushHistory: () => void;
}

export function RightPanel({
  isOpen,
  selectedTableId,
  selectedEdgeId,
  tables,
  relations,
  connectTableSearch,
  onClose,
  onUpdateTable,
  onUpdateColumn,
  onAddColumn,
  onDeleteColumn,
  onToggleRelation,
  onDuplicateTable,
  onDeleteTable,
  onUpdateRelation,
  onDeleteRelation,
  onSearchChange,
  onPushHistory,
}: RightPanelProps) {
  const selectedTable = selectedTableId ? tables.find((t) => t.id === selectedTableId) : null;
  const selectedRelation = selectedEdgeId ? relations.find((r) => r.id === selectedEdgeId) : null;

  const getActiveLinks = (tableId: string) => {
    return relations.filter(
      (r) => r.sourceTableId === tableId || r.targetTableId === tableId
    );
  };

  const getLinkedTableName = (relation: Relation, currentTableId: string) => {
    const linkedId = relation.sourceTableId === currentTableId 
      ? relation.targetTableId 
      : relation.sourceTableId;
    return tables.find((t) => t.id === linkedId)?.name || "Unknown";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="border-l border-sidebar-border bg-sidebar overflow-hidden flex flex-col z-20"
        >
          {/* Header */}
          <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedTable ? "Table Properties" : selectedRelation ? "Relation Properties" : "Properties"}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {selectedTable ? (
              <TableProperties
                table={selectedTable}
                tables={tables}
                relations={relations}
                connectTableSearch={connectTableSearch}
                activeLinks={getActiveLinks(selectedTable.id)}
                getLinkedTableName={(r) => getLinkedTableName(r, selectedTable.id)}
                onUpdateTable={onUpdateTable}
                onUpdateColumn={onUpdateColumn}
                onAddColumn={onAddColumn}
                onDeleteColumn={onDeleteColumn}
                onToggleRelation={onToggleRelation}
                onDuplicateTable={onDuplicateTable}
                onDeleteTable={onDeleteTable}
                onSearchChange={onSearchChange}
                onPushHistory={onPushHistory}
              />
            ) : selectedRelation ? (
              <RelationProperties
                relation={selectedRelation}
                tables={tables}
                onUpdateRelation={onUpdateRelation}
                onDeleteRelation={onDeleteRelation}
                onPushHistory={onPushHistory}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TableProperties({
  table,
  tables,
  relations,
  connectTableSearch,
  activeLinks,
  getLinkedTableName,
  onUpdateTable,
  onUpdateColumn,
  onAddColumn,
  onDeleteColumn,
  onToggleRelation,
  onDuplicateTable,
  onDeleteTable,
  onSearchChange,
  onPushHistory,
}: {
  table: Table;
  tables: Table[];
  relations: Relation[];
  connectTableSearch: string;
  activeLinks: Relation[];
  getLinkedTableName: (r: Relation) => string;
  onUpdateTable: (tableId: string, updates: Partial<Table>) => void;
  onUpdateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  onAddColumn: (tableId: string) => void;
  onDeleteColumn: (tableId: string, columnId: string) => void;
  onToggleRelation: (sourceId: string, targetId: string) => void;
  onDuplicateTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onSearchChange: (search: string) => void;
  onPushHistory: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Table Name */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">
          Table Name
        </label>
        <input
          className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-input focus:ring-2 focus:ring-ring outline-none transition-all"
          value={table.name}
          onChange={(e) => onUpdateTable(table.id, { name: e.target.value })}
          onBlur={onPushHistory}
        />
      </div>

      {/* Color */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
          <Palette size={12} />
          Color
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {TABLE_COLORS.map((color) => (
            <button
              key={color}
              className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                table.color === color ? "border-foreground shadow-md" : "border-transparent"
              }`}
              style={{ background: color }}
              onClick={() => {
                onUpdateTable(table.id, { color });
                onPushHistory();
              }}
            />
          ))}
        </div>
      </div>

      {/* Columns */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">
            Columns
          </label>
          <button
            onClick={() => onAddColumn(table.id)}
            className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1"
          >
            <Plus size={12} />
            Add Column
          </button>
        </div>

        <div className="space-y-2">
          {table.columns.map((col) => (
            <div
              key={col.id}
              className="p-3 rounded-lg border border-border bg-card/50 space-y-2"
            >
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-transparent text-xs font-medium outline-none"
                  value={col.name}
                  onChange={(e) => onUpdateColumn(table.id, col.id, { name: e.target.value })}
                  onBlur={onPushHistory}
                />
                <button
                  onClick={() => onDeleteColumn(table.id, col.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center gap-3 text-[10px]">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={col.isPk}
                    onChange={(e) => onUpdateColumn(table.id, col.id, { isPk: e.target.checked })}
                    className="w-3 h-3 rounded"
                  />
                  PK
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={col.isFk}
                    onChange={(e) => onUpdateColumn(table.id, col.id, { isFk: e.target.checked })}
                    className="w-3 h-3 rounded"
                  />
                  FK
                </label>
                <select
                  value={col.type}
                  onChange={(e) => onUpdateColumn(table.id, col.id, { type: e.target.value })}
                  className="ml-auto bg-transparent text-[10px] text-muted-foreground outline-none"
                >
                  {COLUMN_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Links */}
      {activeLinks.length > 0 && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Link2 size={12} />
            Active Links ({activeLinks.length})
          </label>
          <div className="space-y-1">
            {activeLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 border border-primary/20"
              >
                <span className="text-xs text-primary font-medium">
                  {getLinkedTableName(link)}
                </span>
                <button
                  onClick={() => {
                    const targetId = link.sourceTableId === table.id ? link.targetTableId : link.sourceTableId;
                    onToggleRelation(table.id, targetId);
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Unlink"
                >
                  <Unlink size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connect to Table */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">
          Connect to Table
        </label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tables..."
            value={connectTableSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-background border border-input outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {tables
            .filter((t) => t.id !== table.id && t.name.toLowerCase().includes(connectTableSearch.toLowerCase()))
            .map((target) => {
              const isLinked = relations.some(
                (r) =>
                  (r.sourceTableId === table.id && r.targetTableId === target.id) ||
                  (r.sourceTableId === target.id && r.targetTableId === table.id)
              );
              return (
                <button
                  key={target.id}
                  onClick={() => onToggleRelation(table.id, target.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                    isLinked
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border hover:bg-muted hover:border-muted-foreground/20"
                  }`}
                >
                  {isLinked ? "✓ " : ""}
                  {target.name}
                </button>
              );
            })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onDuplicateTable(table.id)}
          className="flex-1 py-2 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2"
        >
          <Copy size={14} />
          Duplicate
        </button>
        <button
          onClick={() => onDeleteTable(table.id)}
          className="flex-1 py-2 bg-destructive/10 text-destructive text-xs font-medium rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-all flex items-center justify-center gap-2"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </motion.div>
  );
}

function RelationProperties({
  relation,
  tables,
  onUpdateRelation,
  onDeleteRelation,
  onPushHistory,
}: {
  relation: Relation;
  tables: Table[];
  onUpdateRelation: (relationId: string, updates: Partial<Relation>) => void;
  onDeleteRelation: (relationId: string) => void;
  onPushHistory: () => void;
}) {
  const sourceTable = tables.find((t) => t.id === relation.sourceTableId);
  const targetTable = tables.find((t) => t.id === relation.targetTableId);

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Connection Info */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{sourceTable?.name}</span>
          {" → "}
          <span className="font-medium text-foreground">{targetTable?.name}</span>
        </p>
      </div>

      {/* Label */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">
          Edge Label
        </label>
        <input
          className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-input focus:ring-2 focus:ring-ring outline-none"
          placeholder="e.g. user_id"
          value={relation.label || ""}
          onChange={(e) => onUpdateRelation(relation.id, { label: e.target.value })}
          onBlur={onPushHistory}
        />
      </div>

      {/* Line Style */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase text-muted-foreground">
          Line Style
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onUpdateRelation(relation.id, { isDashed: !relation.isDashed });
              onPushHistory();
            }}
            className={`flex-1 py-2 rounded-lg text-xs border transition-all ${
              relation.isDashed
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            Dashed
          </button>
          <button
            onClick={() => {
              onUpdateRelation(relation.id, { lineType: relation.lineType === "curved" ? "straight" : "curved" });
              onPushHistory();
            }}
            className={`flex-1 py-2 rounded-lg text-xs border transition-all ${
              relation.lineType === "straight"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            Straight
          </button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Tip: Drag the handle on the edge to bend/route it.
      </p>

      {/* Delete */}
      <button
        onClick={() => onDeleteRelation(relation.id)}
        className="w-full py-2 bg-destructive/10 text-destructive text-xs font-medium rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-all flex items-center justify-center gap-2"
      >
        <Trash2 size={14} />
        Delete Relation
      </button>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Settings size={20} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No Selection</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Select a table or relation to view properties
      </p>
    </div>
  );
}
