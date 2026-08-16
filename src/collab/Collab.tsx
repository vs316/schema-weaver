import { AnimatePresence, motion } from "framer-motion";
import { Radio, Users } from "lucide-react";
import { cn } from "../ui/cn";
import type { RoomPeer } from "./useLiveRoom";

function initials(name: string) {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Avatar stack + live indicator, usable on any surface. */
export function PresenceBar({
  peers,
  isConnected,
  className,
  max = 5,
}: {
  peers: RoomPeer[];
  isConnected: boolean;
  className?: string;
  max?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
          isConnected
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-muted text-muted-foreground",
        )}
      >
        <Radio size={11} className={isConnected ? "animate-pulse" : undefined} />
        {isConnected ? "Live" : "Offline"}
      </span>

      {peers.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <AnimatePresence mode="popLayout">
              {peers.slice(0, max).map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="group relative"
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-background transition-transform hover:scale-110"
                    style={{ backgroundColor: p.color }}
                    title={p.activity ? `${p.name} — ${p.activity}` : p.name}
                  >
                    {initials(p.name)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {peers.length > max && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-background">
                +{peers.length - max}
              </div>
            )}
          </div>
          <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
            <Users size={11} />
            {peers.length} here
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Live teammate cursors. Coordinates are already in container space
 * (callers convert world → screen when needed).
 */
export function LiveCursors({ peers }: { peers: RoomPeer[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {peers
          .filter((p) => p.cursor)
          .map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1, x: p.cursor!.x, y: p.cursor!.y }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", damping: 32, stiffness: 480, mass: 0.4 }}
              className="absolute left-0 top-0"
              style={{ willChange: "transform" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.38 2.79a.5.5 0 0 0-.88.42Z"
                  fill={p.color}
                  stroke="white"
                  strokeWidth="1.5"
                />
              </svg>
              <div
                className="absolute left-4 top-4 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-md"
                style={{ backgroundColor: p.color }}
              >
                {p.name}
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}

/** Full view of who is here and exactly what they're editing. */
export function ActivityPanel({
  peers,
  isConnected,
  className,
}: {
  peers: RoomPeer[];
  isConnected: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live activity
        </span>
        <PresenceBar peers={[]} isConnected={isConnected} />
      </div>
      {peers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
          No teammates here right now. Share the link — cursors and edits appear instantly.
        </p>
      ) : (
        <ul className="space-y-1">
          {peers.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: p.color }}
              >
                {initials(p.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">{p.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {p.activity || "Viewing"}
                </span>
              </span>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
