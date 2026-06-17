import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "kasa-install-promo-dismissed";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPromoCard() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");

    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const safari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
    setIsIosSafari(iOS && safari);

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      Boolean((window.navigator as any).standalone);
    setInstalled(standalone);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;
  if (!evt && !isIosSafari) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  }

  async function install() {
    if (!evt) return;
    try {
      await evt.prompt();
      await evt.userChoice;
    } finally {
      setEvt(null);
    }
  }

  return (
    <div className="relative rounded-2xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-foreground/40 hover:text-foreground transition-colors"
        aria-label="Dispensar"
      >
        <X className="size-4" />
      </button>
      <div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
        <Download className="size-5 text-primary" />
      </div>
      <div className="flex-1 pr-6">
        <p className="font-display font-semibold text-sm">Instale o KASA HUB como app</p>
        <p className="text-xs text-foreground/60 mt-0.5">
          Acesso rápido pelo ícone, em tela cheia, no celular ou no computador.
        </p>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        {evt ? (
          <Button onClick={install} size="sm" className="gap-2 w-full sm:w-auto">
            <Download className="size-4" /> Instalar
          </Button>
        ) : (
          <Link to="/config" search={{ tab: "install" }} className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="gap-2 w-full">
              Ver como instalar
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
