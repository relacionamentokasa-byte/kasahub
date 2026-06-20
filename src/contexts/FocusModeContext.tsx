import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type FocusModeContextValue = {
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toggleFocusMode: () => void;
};

const FocusModeContext = createContext<FocusModeContextValue | null>(null);

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusMode] = useState(false);
  const toggleFocusMode = useCallback(() => setFocusMode((v) => !v), []);
  return (
    <FocusModeContext.Provider value={{ focusMode, setFocusMode, toggleFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  const ctx = useContext(FocusModeContext);
  if (!ctx) {
    // Safe default outside provider
    return { focusMode: false, setFocusMode: () => {}, toggleFocusMode: () => {} };
  }
  return ctx;
}
