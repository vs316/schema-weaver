import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Edit3, Plus, Trash2 } from 'lucide-react';

export type DiagramNotification = {
  id: string;
  type: 'update' | 'create' | 'delete';
  diagramName: string;
  userName: string;
  timestamp: Date;
  message?: string;
};

interface RealTimeNotificationProps {
  notifications: DiagramNotification[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  isDarkMode: boolean;
}

export function RealTimeNotification({
  notifications,
  onDismiss,
  onDismissAll,
  isDarkMode,
}: RealTimeNotificationProps) {
  const [showPanel, setShowPanel] = useState(false);
  const unreadCount = notifications.length;

  const getIcon = (type: DiagramNotification['type']) => {
    switch (type) {
      case 'create':
        return <Plus size={12} />;
      case 'delete':
        return <Trash2 size={12} />;
      default:
        return <Edit3 size={12} />;
    }
  };

  const getColor = (type: DiagramNotification['type']) => {
    switch (type) {
      case 'create':
        return 'hsl(142 76% 36%)';
      case 'delete':
        return 'hsl(0 84% 60%)';
      default:
        return 'hsl(239 84% 67%)';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg transition-all hover:bg-white/10"
        style={{
          background: showPanel
            ? isDarkMode
              ? 'hsl(217 33% 17%)'
              : 'hsl(214 32% 91%)'
            : 'transparent',
        }}
      >
        <Bell size={18} style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 20% 45%)' }} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{
              background: 'hsl(0 84% 60%)',
              color: 'white',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-80 rounded-xl border shadow-xl z-50"
            style={{
              background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
              borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-3 border-b"
              style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(214 32% 91%)' }}
            >
              <span
                className="text-xs font-bold"
                style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}
              >
                Team Activity
              </span>
              {notifications.length > 0 && (
                <button
                  onClick={onDismissAll}
                  className="text-[10px] font-medium transition-colors hover:underline"
                  style={{ color: 'hsl(239 84% 67%)' }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell
                    size={24}
                    className="mx-auto mb-2"
                    style={{ color: isDarkMode ? 'hsl(217 33% 25%)' : 'hsl(214 32% 85%)' }}
                  />
                  <p
                    className="text-xs"
                    style={{ color: isDarkMode ? 'hsl(215 20% 45%)' : 'hsl(215 20% 65%)' }}
                  >
                    No recent activity
                  </p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: isDarkMode ? 'hsl(217 33% 15%)' : 'hsl(214 32% 93%)' }}>
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 flex items-start gap-3 group"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${getColor(notification.type)}20`,
                          color: getColor(notification.type),
                        }}
                      >
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}
                        >
                          {notification.message || `${notification.userName} updated ${notification.diagramName}`}
                        </p>
                        <p
                          className="text-[10px] mt-0.5"
                          style={{ color: isDarkMode ? 'hsl(215 20% 45%)' : 'hsl(215 20% 65%)' }}
                        >
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={() => onDismiss(notification.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:bg-red-500/20"
                      >
                        <X size={12} style={{ color: 'hsl(0 84% 60%)' }} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}