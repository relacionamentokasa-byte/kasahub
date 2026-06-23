import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { setMoneyHidden } from "@/lib/utils-format";

type Ctx = { hidden: boolean; toggle: () => void; setHidden: (v: boolean) => void };
const PrivacyCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "kasa:money-hidden";

export function PrivacyProvider({ children }: { children: ReactNode }) {
  // Default: oculto (modo reunião). Persistido em localStorage.
  const [hidden, setHiddenState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? true : raw === "1";
  });

  useEffect(() => {
    setMoneyHidden(hidden);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
    }
  }, [hidden]);

  const toggle = useCallback(() => setHiddenState((v) => !v), []);
  const setHidden = useCallback((v: boolean) => setHiddenState(v), []);

  return (
    <PrivacyCtx.Provider value={{ hidden, toggle, setHidden }}>
      {/* Remonta a árvore inteira ao alternar para que cada `brl()` chamado em render
          recalcule com o novo flag — sem precisar tocar em todo componente. */}
      <div key={hidden ? "h" : "v"} className="contents">
        {children}
      </div>
    </PrivacyCtx.Provider>
  );
}

export function usePrivacy() {
  const v = useContext(PrivacyCtx);
  if (!v) throw new Error("usePrivacy must be used within PrivacyProvider");
  return v;
}

export function PrivacyToggleButton({ className = "" }: { className?: string }) {
  const { hidden, toggle } = usePrivacy();
  return (
    <button
      onClick={toggle}
      aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
      title={hidden ? "Mostrar valores monetários" : "Ocultar valores monetários (modo reunião)"}
      className={`p-2 transition-colors ${hidden ? "text-primary" : "text-foreground/60 hover:text-foreground"} ${className}`}
    >
      {hidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </button>
  );
}
