import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform() {
  if (typeof navigator === "undefined") return "other" as const;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  if (isIOS) return isSafari ? ("ios-safari" as const) : ("ios-other" as const);
  if (isAndroid) return "android" as const;
  return "desktop" as const;
}

export function InstallPWAButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [platform, setPlatform] = useState<ReturnType<typeof detectPlatform>>("other" as any);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPlatform(detectPlatform());
    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    const mql = window.matchMedia("(display-mode: standalone)");
    if (mql.matches || (window.navigator as any).standalone) setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  // iOS Safari: no beforeinstallprompt — show a help dialog
  const isIosSafari = platform === "ios-safari";

  if (!evt && !isIosSafari) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-2"
        onClick={async () => {
          if (evt) {
            try {
              await evt.prompt();
              await evt.userChoice;
            } finally {
              setEvt(null);
            }
            return;
          }
          if (isIosSafari) setShowIosHelp(true);
        }}
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">Instalar KASA HUB</span>
        <span className="sm:hidden">Instalar</span>
      </Button>

      <Dialog open={showIosHelp} onOpenChange={setShowIosHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar no iPhone / iPad</DialogTitle>
            <DialogDescription>
              O Safari não permite instalação automática. Siga os 3 passos:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground/80 list-decimal pl-5">
            <li>
              Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para
              cima) na barra do Safari.
            </li>
            <li>
              Role e selecione <strong>“Adicionar à Tela de Início”</strong>.
            </li>
            <li>
              Toque em <strong>Adicionar</strong> no canto superior direito. O KASA HUB
              aparece como um app no seu iPhone.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
