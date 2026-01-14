import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  MessageSquare,
  StickyNote,
  HelpCircle,
  GitCommit,
  Wrench,
  Table2,
  Send,
  Trash2,
  Plus,
} from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import type { Table, Column, TableComment } from '../types/index';

interface TableNote {
  id: string;
  content: string;
  author_id: string;
  author_email: string;
  created_at: string;
}

interface TableQuestion {
  id: string;
  content: string;
  author_id: string;
  author_email: string;
  created_at: string;
  resolved?: boolean;
}

interface TableChange {
  id: string;
  content: string;
  author_id: string;
  author_email: string;
  created_at: string;
  type: 'added' | 'modified' | 'removed';
}

interface TableFix {
  id: string;
  content: string;
  author_id: string;
  author_email: string;
  created_at: string;
  priority: 'low' | 'medium' | 'high';
}

interface TableSidebarSectionsProps {
  table: Table;
  isDarkMode: boolean;
  userId: string;
  userEmail: string;
  isLocked: boolean;
  userRole: 'owner' | 'admin' | 'member' | 'dev' | 'reader';
  onUpdateTable: (updates: Partial<Table>) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

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

export function TableSidebarSections({
  table,
  isDarkMode,
  userId,
  userEmail,
  isLocked,
  userRole,
  onUpdateTable,
}: TableSidebarSectionsProps) {
  const [description, setDescription] = useState(table.description || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newChange, setNewChange] = useState('');
  const [newFix, setNewFix] = useState('');

  // Get extended data from table (stored in table metadata)
  const tableData = table as Table & {
    notes?: TableNote[];
    questions?: TableQuestion[];
    changes?: TableChange[];
    fixes?: TableFix[];
  };

  const notes = tableData.notes || [];
  const questions = tableData.questions || [];
  const changes = tableData.changes || [];
  const fixes = tableData.fixes || [];
  const comments = table.comments || [];
  const sampleData = generateSampleData(table.columns);

  const canEdit = !isLocked && userRole !== 'reader';
  const canComment = !isLocked; // Readers can add comments

  const handleSaveDescription = () => {
    onUpdateTable({ description });
    setIsEditingDesc(false);
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    const comment: TableComment = {
      id: generateId(),
      author_id: userId,
      author_email: userEmail,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
    };
    onUpdateTable({ comments: [...comments, comment] });
    setNewComment('');
  };

  const deleteComment = (commentId: string) => {
    onUpdateTable({ comments: comments.filter((c) => c.id !== commentId) });
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const note: TableNote = {
      id: generateId(),
      content: newNote.trim(),
      author_id: userId,
      author_email: userEmail,
      created_at: new Date().toISOString(),
    };
    onUpdateTable({ notes: [...notes, note] } as any);
    setNewNote('');
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    const question: TableQuestion = {
      id: generateId(),
      content: newQuestion.trim(),
      author_id: userId,
      author_email: userEmail,
      created_at: new Date().toISOString(),
      resolved: false,
    };
    onUpdateTable({ questions: [...questions, question] } as any);
    setNewQuestion('');
  };

  const addChange = () => {
    if (!newChange.trim()) return;
    const change: TableChange = {
      id: generateId(),
      content: newChange.trim(),
      author_id: userId,
      author_email: userEmail,
      created_at: new Date().toISOString(),
      type: 'modified',
    };
    onUpdateTable({ changes: [...changes, change] } as any);
    setNewChange('');
  };

  const addFix = () => {
    if (!newFix.trim()) return;
    const fix: TableFix = {
      id: generateId(),
      content: newFix.trim(),
      author_id: userId,
      author_email: userEmail,
      created_at: new Date().toISOString(),
      priority: 'medium',
    };
    onUpdateTable({ fixes: [...fixes, fix] } as any);
    setNewFix('');
  };

  const inputStyle = {
    background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
    borderColor: isDarkMode ? 'hsl(217 33% 20%)' : 'hsl(214 32% 85%)',
    color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)',
  };

  const textColor = isDarkMode ? 'hsl(210 40% 80%)' : 'hsl(222 47% 30%)';
  const mutedColor = isDarkMode ? 'hsl(215 20% 45%)' : 'hsl(215 20% 65%)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Description Section */}
      <CollapsibleSection
        title="Description"
        icon={<FileText size={12} />}
        defaultOpen={true}
        isDarkMode={isDarkMode}
      >
        {isEditingDesc && canEdit ? (
          <div className="space-y-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this table's purpose..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-xs border outline-none resize-none"
              style={inputStyle}
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
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs" style={{ color: description ? textColor : mutedColor }}>
              {description || 'No description provided'}
            </p>
            {canEdit && (
              <button
                onClick={() => setIsEditingDesc(true)}
                className="text-[10px] font-bold hover:underline flex-shrink-0"
                style={{ color: 'hsl(239 84% 67%)' }}
              >
                Edit
              </button>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* Sample Data Preview */}
      <CollapsibleSection
        title="Sample Data"
        icon={<Table2 size={12} />}
        defaultOpen={false}
        isDarkMode={isDarkMode}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${isDarkMode ? 'hsl(217 33% 20%)' : 'hsl(214 32% 85%)'}` }}>
                {table.columns.slice(0, 4).map((col) => (
                  <th
                    key={col.id}
                    className="text-left py-1.5 px-2 font-bold"
                    style={{ color: textColor }}
                  >
                    {col.name}
                    {col.isPk && <span className="ml-1 text-amber-500">🔑</span>}
                  </th>
                ))}
                {table.columns.length > 4 && (
                  <th className="text-left py-1.5 px-2" style={{ color: mutedColor }}>
                    ...
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sampleData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  style={{
                    borderBottom:
                      rowIndex < 2
                        ? `1px solid ${isDarkMode ? 'hsl(217 33% 15%)' : 'hsl(214 32% 90%)'}`
                        : undefined,
                  }}
                >
                  {table.columns.slice(0, 4).map((col) => (
                    <td key={col.id} className="py-1.5 px-2" style={{ color: mutedColor }}>
                      {row[col.name]}
                    </td>
                  ))}
                  {table.columns.length > 4 && (
                    <td className="py-1.5 px-2" style={{ color: mutedColor }}>
                      ...
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Notes Section */}
      <CollapsibleSection
        title="Notes"
        icon={<StickyNote size={12} />}
        badge={notes.length || undefined}
        isDarkMode={isDarkMode}
      >
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-2 rounded-lg"
              style={{ background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)' }}
            >
              <p className="text-[11px]" style={{ color: textColor }}>
                {note.content}
              </p>
              <p className="text-[9px] mt-1" style={{ color: mutedColor }}>
                {note.author_email?.split('@')[0]} • {new Date(note.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
          {canEdit && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 rounded-lg text-xs border outline-none"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
              />
              <button
                onClick={addNote}
                disabled={!newNote.trim()}
                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: newNote.trim() ? 'hsl(239 84% 67%)' : isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)',
                  color: newNote.trim() ? 'white' : mutedColor,
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Questions Section */}
      <CollapsibleSection
        title="Questions"
        icon={<HelpCircle size={12} />}
        badge={questions.filter((q) => !q.resolved).length || undefined}
        isDarkMode={isDarkMode}
      >
        <div className="space-y-2">
          {questions.map((q) => (
            <div
              key={q.id}
              className="p-2 rounded-lg"
              style={{ background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)' }}
            >
              <p className="text-[11px]" style={{ color: textColor }}>
                {q.content}
              </p>
              <p className="text-[9px] mt-1" style={{ color: mutedColor }}>
                {q.author_email?.split('@')[0]} • {q.resolved ? '✓ Resolved' : 'Open'}
              </p>
            </div>
          ))}
          {canEdit && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 rounded-lg text-xs border outline-none"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
              />
              <button
                onClick={addQuestion}
                disabled={!newQuestion.trim()}
                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: newQuestion.trim() ? 'hsl(239 84% 67%)' : isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)',
                  color: newQuestion.trim() ? 'white' : mutedColor,
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Changes Section */}
      <CollapsibleSection
        title="Changes"
        icon={<GitCommit size={12} />}
        badge={changes.length || undefined}
        isDarkMode={isDarkMode}
      >
        <div className="space-y-2">
          {changes.map((change) => (
            <div
              key={change.id}
              className="p-2 rounded-lg"
              style={{ background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)' }}
            >
              <p className="text-[11px]" style={{ color: textColor }}>
                {change.content}
              </p>
              <p className="text-[9px] mt-1" style={{ color: mutedColor }}>
                {change.author_email?.split('@')[0]} • {change.type}
              </p>
            </div>
          ))}
          {canEdit && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newChange}
                onChange={(e) => setNewChange(e.target.value)}
                placeholder="Log a change..."
                className="flex-1 px-3 py-2 rounded-lg text-xs border outline-none"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && addChange()}
              />
              <button
                onClick={addChange}
                disabled={!newChange.trim()}
                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: newChange.trim() ? 'hsl(239 84% 67%)' : isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)',
                  color: newChange.trim() ? 'white' : mutedColor,
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Fixes Section */}
      <CollapsibleSection
        title="Fixes"
        icon={<Wrench size={12} />}
        badge={fixes.length || undefined}
        isDarkMode={isDarkMode}
      >
        <div className="space-y-2">
          {fixes.map((fix) => (
            <div
              key={fix.id}
              className="p-2 rounded-lg"
              style={{ background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                  style={{
                    background:
                      fix.priority === 'high'
                        ? 'hsl(0 84% 60% / 0.2)'
                        : fix.priority === 'medium'
                        ? 'hsl(38 92% 50% / 0.2)'
                        : 'hsl(142 76% 36% / 0.2)',
                    color:
                      fix.priority === 'high'
                        ? 'hsl(0 84% 60%)'
                        : fix.priority === 'medium'
                        ? 'hsl(38 92% 50%)'
                        : 'hsl(142 76% 36%)',
                  }}
                >
                  {fix.priority}
                </span>
                <p className="text-[11px] flex-1" style={{ color: textColor }}>
                  {fix.content}
                </p>
              </div>
              <p className="text-[9px] mt-1" style={{ color: mutedColor }}>
                {fix.author_email?.split('@')[0]}
              </p>
            </div>
          ))}
          {canEdit && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newFix}
                onChange={(e) => setNewFix(e.target.value)}
                placeholder="Add a fix to do..."
                className="flex-1 px-3 py-2 rounded-lg text-xs border outline-none"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && addFix()}
              />
              <button
                onClick={addFix}
                disabled={!newFix.trim()}
                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: newFix.trim() ? 'hsl(239 84% 67%)' : isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)',
                  color: newFix.trim() ? 'white' : mutedColor,
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Comments Section */}
      <CollapsibleSection
        title="Comments"
        icon={<MessageSquare size={12} />}
        badge={comments.length || undefined}
        defaultOpen={true}
        isDarkMode={isDarkMode}
      >
        <div className="space-y-2">
          {comments.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-2 rounded-lg"
                  style={{ background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: isDarkMode ? 'hsl(239 84% 67%)' : 'hsl(239 84% 50%)' }}
                    >
                      {comment.author_email?.split('@')[0] || 'User'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px]" style={{ color: mutedColor }}>
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                      {comment.author_id === userId && canComment && (
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="p-0.5 rounded hover:bg-red-500/20"
                        >
                          <Trash2 size={10} style={{ color: 'hsl(0 84% 60%)' }} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px]" style={{ color: textColor }}>
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {canComment && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 rounded-lg text-xs border outline-none"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && addComment()}
              />
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: newComment.trim() ? 'hsl(239 84% 67%)' : isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)',
                  color: newComment.trim() ? 'white' : mutedColor,
                }}
              >
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </motion.div>
  );
}