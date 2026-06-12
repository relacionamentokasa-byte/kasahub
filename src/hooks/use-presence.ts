import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Shared presence store.
 *
 * Multiple components (chat page + global chat widget) use this hook at the
 * same time. Subscribing twice to the same Realtime topic from one client
 * breaks the subscription, so we keep ONE shared channel and fan out the
 * online list to every hook instance.
 */
type Listener = (ids: string[]) => void;

let sharedChannel: RealtimeChannel | null = null;
let sharedUserId: string | null = null;
let refCount = 0;
let currentOnline: string[] = [];
const listeners = new Set<Listener>();

function notify(ids: string[]) {
  currentOnline = ids;
  listeners.forEach((l) => l(ids));
}

function ensureChannel(userId: string) {
  if (sharedChannel && sharedUserId === userId) return;

  // User changed (login/logout) — tear down the old channel first.
  if (sharedChannel) {
    supabase.removeChannel(sharedChannel);
    sharedChannel = null;
  }

  sharedUserId = userId;

  const channel = supabase.channel("online-users", {
    config: { presence: { key: userId } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const presenceState = channel.presenceState<{ user_id?: string }>();
      const onlineIds: string[] = [];

      // Extrai os user_ids de dentro da estrutura do Presence
      for (const id in presenceState) {
        presenceState[id].forEach((presence) => {
          if (presence.user_id) {
            onlineIds.push(presence.user_id);
          }
        });
      }

      // Remove duplicatas (ex: usuário com duas abas abertas)
      notify([...new Set(onlineIds)]);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // Só rastreia DEPOIS da inscrição confirmada
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });

  sharedChannel = channel;
}

function releaseChannel() {
  if (refCount <= 0 && sharedChannel) {
    supabase.removeChannel(sharedChannel);
    sharedChannel = null;
    sharedUserId = null;
    notify([]);
  }
}

/**
 * Subscribes the current user to the global presence channel and returns
 * the set of user IDs currently online.
 */
export function usePresence(userId: string | null | undefined) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(
    () => new Set(currentOnline),
  );

  useEffect(() => {
    if (!userId) return;

    const listener: Listener = (ids) => setOnlineIds(new Set(ids));
    listeners.add(listener);
    refCount++;

    ensureChannel(userId);
    // Sync immediately with whatever the shared channel already knows.
    setOnlineIds(new Set(currentOnline));

    return () => {
      listeners.delete(listener);
      refCount--;
      releaseChannel();
    };
  }, [userId]);

  return onlineIds;
}
