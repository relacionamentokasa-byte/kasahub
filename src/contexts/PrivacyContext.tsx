import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { setMoneyHidden } from "@/lib/utils-format";
import { Button } from "@/components/ui/button";

type Ctx = { hidden: boolean; toggle: () => void; setHidden: (v: boolean) => void };
const PrivacyCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "kasa:money-hidden";

export function PrivacyProvider({ children }: { children: ReactNode }) {
  // Default: oculto (modo reunião). Persistido em localStorage.
  const [hidden, setHiddenState] = useState<boolean>(() => {
    const initialHidden = typeof window === "undefined"
      ? true
      : window.localStorage.getItem(STORAGE_KEY) !== "0";
    setMoneyHidden(initialHidden);
    return initialHidden;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
      document.documentElement.dataset.moneyHidden = hidden ? "true" : "false";
    }

    return () => {
      if (typeof document !== "undefined") {
        delete document.documentElement.dataset.moneyHidden;
      }
    };
  }, [hidden]);

  const setHidden = useCallback((value: boolean) => {
    setMoneyHidden(value);
    setHiddenState(value);
  }, []);

  const toggle = useCallback(() => {
    setHiddenState((current) => {
      const next = !current;
      setMoneyHidden(next);
      return next;
    });
  }, []);

  return (
    <PrivacyCtx.Provider value={{ hidden, toggle, setHidden }}>
      {children}
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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-pressed={!hidden}
      aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
      title={hidden ? "Mostrar todos os números" : "Ocultar todos os números"}
      className={`size-8 transition-colors cursor-pointer ${hidden ? "text-amber-400 bg-amber-400/10" : "text-zinc-400 hover:text-white hover:bg-white/10"} ${className}`}
    >
      {hidden ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
    </Button>
  );
}
