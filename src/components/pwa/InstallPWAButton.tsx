import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPWAButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    // already running standalone?
    const mql = window.matchMedia("(display-mode: standalone)");
    if (mql.matches || (window.navigator as any).standalone) setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isPreview = typeof window !== "undefined" && (
    window.location.hostname.includes("lovable.app") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("beta.lovable.dev")
  );

  if (installed || (!evt && !isPreview)) return null;

  if (isPreview && !evt) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-2 opacity-50 cursor-not-allowed"
        title="A instalação só está disponível no domínio final (publicado). Use a URL .lovable.app para instalar."
        onClick={() => {
          toast.info("A opção de instalar como aplicativo só aparecerá quando você acessar o site através da URL pública publicada.", {
            description: "No ambiente de edição (preview) o navegador bloqueia a instalação por segurança."
          });
        }}
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">Instalar App</span>
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-2"
      onClick={async () => {
        try {
          await evt.prompt();
          await evt.userChoice;
        } finally {
          setEvt(null);
        }
      }}
    >
      <Download className="size-4" />
      <span className="hidden sm:inline">Instalar KASA HUB</span>
      <span className="sm:hidden">Instalar</span>
    </Button>
  );
}
