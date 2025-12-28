import { useEffect, useState } from "react";
import type { Table, Relation } from "../types";

const STORAGE_KEY = "erd-data";

interface SavedData {
  tables: Table[];
  relations: Relation[];
  isDarkMode: boolean;
  savedAt: string;
}

export function useAutoSave(
  tables: Table[],
  relations: Relation[],
  isDarkMode: boolean,
  onSaveComplete?: (time: string) => void
) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");

  // Load saved data
  const loadSavedData = (): SavedData | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { t, r, dark, time } = JSON.parse(saved);
        return {
          tables: t || [],
          relations: (r || []).map((rel: Relation) => ({
            ...rel,
            bend: rel.bend ?? { x: 0, y: 0 },
          })),
          isDarkMode: dark ?? true,
          savedAt: time || "",
        };
      }
    } catch (e) {
      console.error("Failed to load saved data:", e);
    }
    return null;
  };

  // Auto-save
  useEffect(() => {
    if (tables.length === 0 && relations.length === 0) return;

    const timeout = setTimeout(() => {
      setIsSaving(true);
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          t: tables,
          r: relations,
          dark: isDarkMode,
          time: now,
        })
      );

      setLastSaved(now);
      setIsSaving(false);
      onSaveComplete?.(now);
    }, 800);

    return () => clearTimeout(timeout);
  }, [tables, relations, isDarkMode, onSaveComplete]);

  return { isSaving, lastSaved, loadSavedData };
}
