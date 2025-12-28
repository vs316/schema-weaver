import { useState, useCallback } from "react";
import type { Toast } from "../types";
import { generateId } from "../utils/helpers";

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((title: string, description?: string, type: Toast["type"] = "info") => {
    const toast: Toast = {
      id: generateId(),
      title,
      description,
      type,
    };
    
    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 2500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}
