import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePresence } from "@/hooks/use-presence";

interface PresenceContextValue {
  onlineUsers: string[];
  onlineSet: Set<string>;
  isOnline: (userId?: string | null) => boolean;
}

const PresenceContext = createContext<PresenceContextValue>({
  onlineUsers: [],
  onlineSet: new Set(),
  isOnline: () => false,
});

interface PresenceProviderProps {
  userId: string | null | undefined;
  children: ReactNode;
}

export function PresenceProvider({ userId, children }: PresenceProviderProps) {
  const onlineSet = usePresence(userId);

  const value = useMemo<PresenceContextValue>(() => {
    const arr = Array.from(onlineSet);
    return {
      onlineUsers: arr,
      onlineSet,
      isOnline: (id) => !!id && onlineSet.has(id),
    };
  }, [onlineSet]);

  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  return useContext(PresenceContext);
}
