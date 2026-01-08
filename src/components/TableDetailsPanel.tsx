import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Trash2, FileText, Table2 } from 'lucide-react';
import type { Table, Column } from '../types/index';

interface TableDetailsPanelProps {
  table: Table;
  isDarkMode: boolean;
  userId: string;
  userName: string;
  isLocked: boolean;
  onUpdateDescription: (description: string) => void;
  onAddComment: (text: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export function TableDetailsPanel({
  table,
  isDarkMode,
  userId,
  userName: _userName,
  isLocked,
  onUpdateDescription,
  onAddComment,
  onDeleteComment,
}: TableDetailsPanelProps) {
  const [description, setDescription] = useState(table.description || '');
  const [newComment, setNewComment] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const handleSaveDescription = () => {
    onUpdateDescription(description);
    setIsEditingDesc(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment('');
  };

  // Generate sample data based on columns
  const generateSampleData = (columns: Column[]) => {
    const sampleValues: Record<string, string[]> = {
      INT: ['1', '2', '3'],
      UUID: ['a1b2c3...', 'd4e5f6...', 'g7h8i9...'],
      VARCHAR: ['John', 'Jane', 'Bob'],
      TEXT: ['Lorem ipsum...', 'Dolor sit...', 'Amet cons...'],
      BOOL: ['true', 'false', 'true'],
    };

    return [0, 1, 2].map((rowIndex) => {
      const row: Record<string, string> = {};
      columns.forEach((col) => {
        const values = sampleValues[col.type] || ['value'];
        if (col.name.toLowerCase().includes('id') && col.isPk) {
          row[col.name] = String(rowIndex + 1);
        } else if (col.name.toLowerCase().includes('email')) {
          row[col.name] = `user${rowIndex + 1}@example.com`;
        } else if (col.name.toLowerCase().includes('name')) {
          row[col.name] = ['Alice', 'Bob', 'Charlie'][rowIndex];
        } else if (col.name.toLowerCase().includes('date') || col.name.toLowerCase().includes('_at')) {
          row[col.name] = new Date(Date.now() - rowIndex * 86400000).toLocaleDateString();
        } else {
          row[col.name] = values[rowIndex % values.length];
        }
      });
      return row;
    });
  };

  const sampleData = generateSampleData(table.columns);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 mt-4"
    >
      {/* Table Description */}
      <div
        className="p-3 rounded-xl border space-y-2"
        style={{
          background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(210 40% 96%)',
          borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)',
        }}
      >
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase flex items-center gap-1.5" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 20% 45%)' }}>
            <FileText size={12} />
            Description
          </label>
          {!isLocked && !isEditingDesc && (
            <button
              onClick={() => setIsEditingDesc(true)}
              className="text-[10px] font-bold hover:underline"
              style={{ color: 'hsl(239 84% 67%)' }}
            >
              Edit
            </button>
          )}
        </div>

        {isEditingDesc ? (
          <div className="space-y-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this table's purpose..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-xs border outline-none resize-none"
              style={{
                background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
                borderColor: isDarkMode ? 'hsl(217 33% 20%)' : 'hsl(214 32% 85%)',
                color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)',
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingDesc(false)}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold"
                style={{
                  background: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)',
                  color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDescription}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold"
                style={{
                  background: 'hsl(239 84% 67%)',
                  color: 'hsl(0 0% 100%)',
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p
            className="text-xs"
            style={{ color: description ? (isDarkMode ? 'hsl(210 40% 80%)' : 'hsl(222 47% 30%)') : (isDarkMode ? 'hsl(215 20% 45%)' : 'hsl(215 20% 65%)') }}
          >
            {description || 'No description provided'}
          </p>
        )}
      </div>

      {/* Sample Table Preview */}
      <div
        className="p-3 rounded-xl border space-y-2"
        style={{
          background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(210 40% 96%)',
          borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)',
        }}
      >
        <label className="text-[10px] font-bold uppercase flex items-center gap-1.5" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 20% 45%)' }}>
          <Table2 size={12} />
          Sample Data Preview
        </label>

        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${isDarkMode ? 'hsl(217 33% 20%)' : 'hsl(214 32% 85%)'}` }}>
                {table.columns.slice(0, 4).map((col) => (
                  <th
                    key={col.id}
                    className="text-left py-1.5 px-2 font-bold"
                    style={{ color: isDarkMode ? 'hsl(210 40% 80%)' : 'hsl(222 47% 30%)' }}
                  >
                    {col.name}
                    {col.isPk && <span className="ml-1 text-amber-500">🔑</span>}
                  </th>
                ))}
                {table.columns.length > 4 && (
                  <th className="text-left py-1.5 px-2" style={{ color: isDarkMode ? 'hsl(215 20% 45%)' : 'hsl(215 20% 65%)' }}>
                    ...
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sampleData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  style={{ borderBottom: rowIndex < 2 ? `1px solid ${isDarkMode ? 'hsl(217 33% 15%)' : 'hsl(214 32% 90%)'}` : undefined }}
                >
                  {table.columns.slice(0, 4).map((col) => (
                    <td
                      key={col.id}
                      className="py-1.5 px-2"
                      style={{ color: isDarkMode ? 'hsl(210 40% 70%)' : 'hsl(222 47% 40%)' }}
                    >
                      {row[col.name]}
                    </td>
                  ))}
                  {table.columns.length > 4 && (
                    <td className="py-1.5 px-2" style={{ color: isDarkMode ? 'hsl(215 20% 45%)' : 'hsl(215 20% 65%)' }}>
                      ...
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comments Section */}
      <div
        className="p-3 rounded-xl border space-y-3"
        style={{
          background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(210 40% 96%)',
          borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)',
        }}
      >
        <label className="text-[10px] font-bold uppercase flex items-center gap-1.5" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 20% 45%)' }}>
          <MessageSquare size={12} />
          Comments ({table.comments?.length || 0})
        </label>

        {/* Existing comments */}
        {table.comments && table.comments.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {table.comments.map((comment) => (
              <div
                key={comment.id}
                className="p-2 rounded-lg"
                style={{
                  background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: isDarkMode ? 'hsl(239 84% 67%)' : 'hsl(239 84% 50%)' }}
                  >
                    {comment.userName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px]"
                      style={{ color: isDarkMode ? 'hsl(215 20% 45%)' : 'hsl(215 20% 65%)' }}
                    >
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                    {comment.userId === userId && !isLocked && (
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="p-0.5 rounded hover:bg-red-500/20"
                      >
                        <Trash2 size={10} style={{ color: 'hsl(0 84% 60%)' }} />
                      </button>
                    )}
                  </div>
                </div>
                <p
                  className="text-[11px]"
                  style={{ color: isDarkMode ? 'hsl(210 40% 80%)' : 'hsl(222 47% 30%)' }}
                >
                  {comment.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add new comment */}
        {!isLocked && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 rounded-lg text-xs border outline-none"
              style={{
                background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
                borderColor: isDarkMode ? 'hsl(217 33% 20%)' : 'hsl(214 32% 85%)',
                color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddComment();
              }}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: newComment.trim() ? 'hsl(239 84% 67%)' : (isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)'),
                color: newComment.trim() ? 'hsl(0 0% 100%)' : (isDarkMode ? 'hsl(215 20% 45%)' : 'hsl(215 20% 65%)'),
              }}
            >
              <Send size={14} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
