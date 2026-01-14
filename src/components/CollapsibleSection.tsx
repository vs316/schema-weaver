import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number | string;
  isDarkMode?: boolean;
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
  isDarkMode = true,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(210 40% 96%)',
        borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <span style={{ color: isDarkMode ? 'hsl(239 84% 67%)' : 'hsl(239 84% 50%)' }}>
            {icon}
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 20% 45%)' }}
          >
            {title}
          </span>
          {badge !== undefined && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold"
              style={{
                background: isDarkMode ? 'hsl(239 84% 67% / 0.2)' : 'hsl(239 84% 67% / 0.1)',
                color: isDarkMode ? 'hsl(239 84% 67%)' : 'hsl(239 84% 50%)',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown
            size={14}
            style={{ color: isDarkMode ? 'hsl(215 20% 45%)' : 'hsl(215 20% 65%)' }}
          />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div
              className="p-3 border-t"
              style={{
                borderColor: isDarkMode ? 'hsl(217 33% 15%)' : 'hsl(214 32% 90%)',
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}