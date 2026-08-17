import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../integrations/supabase/safeClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Generic real-time collaboration room.
 * Any surface (canvas, mermaid studio, documents, library) can mount this hook
 * with a resource id and instantly get presence, live cursors, live selection
 * and an activity feed of what teammates are doing.
 */

export interface RoomPeer {
  id: string;
  name: string;
  color: string;
  /** Free-form label of what the peer is doing right now. */
  activity?: string;
  /** Identifier of the element/block the peer has selected. */
  selection?: string | null;
  cursor?: { x: number; y: number } | null;
  lastSeen: string;
}

const PALETTE = [
  "#e85d3a", "#f0a202", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e",
];

export function roomColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export interface UseLiveRoomOptions {
  roomId: string | null;
  userId?: string | null;
  userName?: string | null;
  /** What this user is doing — broadcast to teammates. */
  activity?: string;
  /** Receive collaborative operations sent by teammates in the same room. */
  onOp?: (payload: any) => void;
}

export function useLiveRoom({ roomId, userId, userName, activity, onOp }: UseLiveRoomOptions) {
  const [peers, setPeers] = useState<RoomPeer[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef<Map<string, RoomPeer>>(new Map());
  const pendingCursor = useRef<{ x: number; y: number } | null>(null);
  const activityRef = useRef<string | undefined>(activity);
  const selectionRef = useRef<string | null>(null);

  const onOpRef = useRef(onOp);
  activityRef.current = activity;
  onOpRef.current = onOp;

  const me = useMemo(
    () =>
      userId
        ? { id: userId, name: userName || "Anonymous", color: roomColor(userId) }
        : null,
    [userId, userName],
  );

  const flush = useCallback(() => {
    setPeers(Array.from(peersRef.current.values()));
  }, []);

  useEffect(() => {
    if (!roomId || !me) return;

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: me.id }, broadcast: { self: false } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, any[]>;
        const next = new Map<string, RoomPeer>();
        Object.values(state).forEach((entries) => {
          entries.forEach((entry: any) => {
            if (!entry?.id || entry.id === me.id) return;
            const existing = peersRef.current.get(entry.id);
            next.set(entry.id, {
              id: entry.id,
              name: entry.name || "Anonymous",
              color: entry.color || roomColor(entry.id),
              activity: entry.activity ?? existing?.activity,
              selection: entry.selection ?? existing?.selection ?? null,
              cursor: existing?.cursor ?? null,
              lastSeen: entry.lastSeen || new Date().toISOString(),
            });
          });
        });
        peersRef.current = next;
        flush();
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        (leftPresences as any[]).forEach((p) => p?.id && peersRef.current.delete(p.id));
        flush();
      })
      .on("broadcast", { event: "op" }, ({ payload }) => {
        if (!payload || payload.userId === me.id) return;
        onOpRef.current?.(payload);
      })
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        if (!payload?.userId || payload.userId === me.id) return;
        const existing = peersRef.current.get(payload.userId);
        peersRef.current.set(payload.userId, {
          id: payload.userId,
          name: payload.userName || existing?.name || "Anonymous",
          color: existing?.color || roomColor(payload.userId),
          activity: payload.activity ?? existing?.activity,
          selection: payload.selection ?? existing?.selection ?? null,
          cursor: payload.cursor ?? null,
          lastSeen: new Date().toISOString(),
        });
        flush();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          await channel.track({
            id: me.id,
            name: me.name,
            color: me.color,
            activity: activityRef.current,
            selection: selectionRef.current,
            lastSeen: new Date().toISOString(),
          });
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    const interval = setInterval(() => {
      if (!pendingCursor.current || !channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "cursor",
        payload: {
          userId: me.id,
          userName: me.name,
          cursor: pendingCursor.current,
          activity: activityRef.current,
          selection: selectionRef.current,
        },
      });
      pendingCursor.current = null;
    }, 66);

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
      channelRef.current = null;
      peersRef.current.clear();
      setPeers([]);
      setIsConnected(false);
    };
  }, [roomId, me, flush]);

  // Re-track presence when the activity label changes.
  useEffect(() => {
    if (!channelRef.current || !me || !isConnected) return;
    channelRef.current.track({
      id: me.id,
      name: me.name,
      color: me.color,
      activity,
      selection: selectionRef.current,
      lastSeen: new Date().toISOString(),
    });
  }, [activity, me, isConnected]);

  const updateCursor = useCallback((x: number, y: number) => {
    pendingCursor.current = { x, y };
  }, []);

  const setSelection = useCallback(
    (selection: string | null) => {
      selectionRef.current = selection;
      if (!channelRef.current || !me) return;
      channelRef.current.track({
        id: me.id,
        name: me.name,
        color: me.color,
        activity: activityRef.current,
        selection,
        lastSeen: new Date().toISOString(),
      });
    },
    [me],
  );

  /** Send a collaborative operation to everyone else in the room. */
  const sendOp = useCallback(
    (payload: Record<string, unknown>) => {
      if (!channelRef.current || !me) return;
      channelRef.current.send({
        type: "broadcast",
        event: "op",
        payload: { ...payload, userId: me.id, userName: me.name },
      });
    },
    [me],
  );

  return { peers, isConnected, updateCursor, setSelection, sendOp, me };
}
