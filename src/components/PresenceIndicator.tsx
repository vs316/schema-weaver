import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import type { PresenceUser } from '../hooks/usePresence';

interface PresenceIndicatorProps {
  users: PresenceUser[];
  isConnected: boolean;
  isDarkMode: boolean;
}

export function PresenceIndicator({ users, isConnected, isDarkMode }: PresenceIndicatorProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Connection status */}
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
          isConnected
            ? isDarkMode
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-emerald-100 text-emerald-700'
            : isDarkMode
            ? 'bg-slate-700 text-slate-400'
            : 'bg-slate-200 text-slate-600'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
          }`}
        />
        {isConnected ? 'Live' : 'Offline'}
      </div>

      {/* Active users */}
      {users.length > 0 && (
        <div className="flex items-center">
          {/* Stacked avatars */}
          <div className="flex -space-x-2">
            <AnimatePresence mode="popLayout">
              {users.slice(0, 4).map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group"
                  style={{ zIndex: users.length - index }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 transition-transform duration-200 hover:scale-110 hover:z-50 cursor-pointer ${
                      isDarkMode ? 'ring-slate-900' : 'ring-white'
                    }`}
                    style={{
                      backgroundColor: user.color,
                    }}
                    title={user.name}
                  >
                    {getInitials(user.name)}
                  </div>

                  {/* Tooltip */}
                  <div
                    className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 ${
                      isDarkMode
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-900 shadow-lg'
                    }`}
                  >
                    {user.name}
                    <div
                      className={`absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent ${
                        isDarkMode ? 'border-b-slate-800' : 'border-b-white'
                      }`}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Overflow indicator */}
            {users.length > 4 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-offset-1 ${
                  isDarkMode
                    ? 'bg-slate-700 text-slate-300 ring-slate-900'
                    : 'bg-slate-200 text-slate-700 ring-white'
                }`}
                title={`${users.length - 4} more`}
              >
                +{users.length - 4}
              </motion.div>
            )}
          </div>

          {/* User count label */}
          <div
            className={`ml-2 flex items-center gap-1 text-xs font-medium ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <Users size={12} />
            {users.length} editing
          </div>
        </div>
      )}
    </div>
  );
}

// Live cursor component for showing other users' cursors on canvas
interface LiveCursorProps {
  user: PresenceUser;
  viewport: { x: number; y: number; zoom: number };
}

export function LiveCursor({ user, viewport }: LiveCursorProps) {
  if (!user.cursor) return null;

  const screenX = user.cursor.x * viewport.zoom + viewport.x;
  const screenY = user.cursor.y * viewport.zoom + viewport.y;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: screenX,
        y: screenY,
      }}
      transition={{ type: 'spring', damping: 30, stiffness: 500 }}
      className="absolute pointer-events-none z-50"
      style={{ left: 0, top: 0 }}
    >
      {/* Cursor arrow */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.38 2.79a.5.5 0 0 0-.88.42Z"
          fill={user.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* Name label */}
      <div
        className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
        style={{ backgroundColor: user.color }}
      >
        {user.name}
      </div>
    </motion.div>
  );
}
