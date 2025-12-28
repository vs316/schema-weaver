import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "info";

export type ToastMessage = {
  id: string;
  message: string;
  type: ToastType;
};

export function Toast({
  toasts,
  removeToast,
}: {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[999] space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`px-4 py-3 rounded-xl text-xs font-semibold shadow-xl backdrop-blur
              ${
                toast.type === "success"
                  ? "bg-emerald-500/90 text-white"
                  : toast.type === "error"
                  ? "bg-red-500/90 text-white"
                  : "bg-slate-800/90 text-slate-100"
              }
            `}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
