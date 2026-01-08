// src/hooks/useTableComments.ts
// Feature 4: Manage table comments with real-time Supabase sync

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";
import type { TableComment } from "../types";

export function useTableComments(
  diagramId: string | null,
  tableId: string | null,
  userId: string | null
) {
  const [comments, setComments] = useState<TableComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load comments for the selected table
  useEffect(() => {
    if (!diagramId || !tableId) {
      setComments([]);
      return;
    }

    const loadComments = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("table_comments")
          .select("*")
          .eq("diagram_id", diagramId)
          .eq("table_id", tableId)
          .order("created_at", { ascending: false });

        if (err) throw err;
        setComments((data as TableComment[]) || []);
      } catch (err) {
        console.error("Failed to load comments:", err);
        setError("Failed to load comments");
      } finally {
        setLoading(false);
      }
    };

    loadComments();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`comments:${diagramId}:${tableId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_comments",
          filter: `diagram_id=eq.${diagramId}`,
        },
        (payload: any) => {
          if (payload.new?.table_id === tableId) {
            if (payload.eventType === "DELETE") {
              setComments((prev) =>
                prev.filter((c) => c.id !== payload.old.id)
              );
            } else {
              setComments((prev) => {
                const exists = prev.find((c) => c.id === payload.new.id);
                if (exists) {
                  return prev.map((c) => (c.id === payload.new.id ? payload.new : c));
                }
                return [payload.new, ...prev];
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [diagramId, tableId]);

  const addComment = useCallback(
    async (content: string) => {
      if (!diagramId || !tableId || !userId) {
        setError("Missing required information");
        return;
      }

      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const { error: err } = await supabase.from("table_comments").insert({
          diagram_id: diagramId,
          table_id: tableId,
          author_id: userId,
          author_email: userData.user?.email || "unknown",
          content,
        });

        if (err) throw err;
      } catch (err) {
        console.error("Failed to add comment:", err);
        setError("Failed to add comment");
        throw err;
      }
    },
    [diagramId, tableId, userId]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      try {
        const { error: err } = await supabase
          .from("table_comments")
          .delete()
          .eq("id", commentId)
          .eq("author_id", userId); // Ensure user can only delete their own

        if (err) throw err;
      } catch (err) {
        console.error("Failed to delete comment:", err);
        setError("Failed to delete comment");
        throw err;
      }
    },
    [userId]
  );

  const updateComment = useCallback(
    async (commentId: string, content: string) => {
      try {
        const { error: err } = await supabase
          .from("table_comments")
          .update({ content, updated_at: new Date().toISOString() })
          .eq("id", commentId)
          .eq("author_id", userId);

        if (err) throw err;
      } catch (err) {
        console.error("Failed to update comment:", err);
        setError("Failed to update comment");
        throw err;
      }
    },
    [userId]
  );

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    updateComment,
  };
}