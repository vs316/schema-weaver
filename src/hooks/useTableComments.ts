// src/hooks/useTableComments.ts
// Feature 4: Manage table comments stored within diagram's table data (local state)
// Comments are persisted as part of the table's data structure in erd_diagrams

import { useState, useCallback } from "react";
import type { TableComment } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

export function useTableComments(
  diagramId: string | null,
  tableId: string | null,
  userId: string | null
) {
  // For now, comments are stored within table data itself, not a separate table
  // This avoids needing a table_comments table in the database
  const [comments, setComments] = useState<TableComment[]>([]);
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Since comments are now stored in table.comments array (in App.tsx state),
  // this hook provides utility functions that work with local state
  
  const addComment = useCallback(
    async (content: string): Promise<TableComment | null> => {
      if (!diagramId || !tableId || !userId) {
        setError("Missing required information");
        return null;
      }

      const newComment: TableComment = {
        id: generateId(),
        diagram_id: diagramId,
        table_id: tableId,
        author_id: userId,
        author_email: "current-user",
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setComments(prev => [newComment, ...prev]);
      return newComment;
    },
    [diagramId, tableId, userId]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      setComments(prev => prev.filter(c => c.id !== commentId));
    },
    []
  );

  const updateComment = useCallback(
    async (commentId: string, content: string) => {
      setComments(prev =>
        prev.map(c =>
          c.id === commentId
            ? { ...c, content, updated_at: new Date().toISOString() }
            : c
        )
      );
    },
    []
  );

  // Sync comments from table data
  const setCommentsFromTable = useCallback((tableComments: TableComment[]) => {
    setComments(tableComments || []);
  }, []);

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    updateComment,
    setCommentsFromTable,
  };
}
