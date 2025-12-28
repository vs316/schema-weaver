import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import type { Toast as ToastType } from "../../types/index";

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const getIcon = (type: ToastType["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getBorderColor = (type: ToastType["type"]) => {
    switch (type) {
      case "success":
        return "border-l-success";
      case "error":
        return "border-l-destructive";
      default:
        return "border-l-primary";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`bg-card border border-border ${getBorderColor(toast.type)} border-l-4 rounded-lg shadow-lg p-3 min-w-[280px] max-w-[360px]`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(toast.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
