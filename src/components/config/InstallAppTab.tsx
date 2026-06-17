import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  Monitor,
  Apple,
  Download,
  CheckCircle2,
  Share2,
  MoreVertical,
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform() {
  if (typeof navigator === "undefined") return "desktop" as const;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/i.test(ua);
  if (isIOS) return "ios" as const;
  if (isAndroid) return "android" as const;
  return "desktop" as const;
}

export function InstallAppTab() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPlatform(detectPlatform());

    const mql = window.matchMedia("(display-mode: standalone)");
    if (mql.matches || (window.navigator as any).standalone) setInstalled(true);

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

  async function triggerInstall() {
    if (!evt) return;
    try {
      await evt.prompt();
      await evt.userChoice;
    } finally {
      setEvt(null);
    }
  }

  return (
    <div className="space-y-8">
      {installed ? (
        <section className="rounded-2xl border border-success/30 bg-success/5 p-6 flex items-center gap-4">
          <CheckCircle2 className="size-8 text-success shrink-0" />
          <div>
            <h3 className="font-display text-lg font-semibold">App instalado neste dispositivo</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Você está acessando o KASA HUB pelo app instalado. Versão atual: v{APP_VERSION}.
            </p>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-4">
          <header className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Download className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold">
                Instalar o KASA HUB neste dispositivo
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Tenha o KASA HUB como um app, com ícone próprio e abertura em tela cheia. Sem
                passar por loja de aplicativos.
              </p>
            </div>
          </header>
          {evt && (
            <Button onClick={triggerInstall} className="gap-2">
              <Download className="size-4" /> Instalar agora
            </Button>
          )}
          {!evt && platform !== "ios" && (
            <p className="text-[11px] text-muted-foreground">
              Se o botão não aparecer, siga as instruções do seu sistema abaixo. Use Chrome, Edge
              ou Brave para a melhor experiência.
            </p>
          )}
        </section>
      )}

      <Guide
        icon={<Smartphone className="size-5 text-primary" />}
        title="Android (Chrome, Edge, Brave)"
        highlight={platform === "android"}
        steps={[
          <>Abra o KASA HUB no navegador (Chrome, Edge ou Brave).</>,
          <>
            Toque no menu <MoreVertical className="inline size-3.5" /> no canto superior direito.
          </>,
          <>
            Selecione <strong>“Instalar app”</strong> ou{" "}
            <strong>“Adicionar à tela inicial”</strong>.
          </>,
          <>Confirme. O ícone amarelo do KASA aparece junto com seus apps.</>,
        ]}
      />

      <Guide
        icon={<Apple className="size-5 text-primary" />}
        title="iPhone e iPad (Safari)"
        highlight={platform === "ios"}
        steps={[
          <>Abra o KASA HUB no <strong>Safari</strong> (não funciona em Chrome no iOS).</>,
          <>
            Toque no botão <Share2 className="inline size-3.5" />{" "}
            <strong>Compartilhar</strong> na barra inferior.
          </>,
          <>
            Role e selecione <strong>“Adicionar à Tela de Início”</strong>.
          </>,
          <>Toque em <strong>Adicionar</strong>. O app aparece na tela inicial.</>,
        ]}
      />

      <Guide
        icon={<Monitor className="size-5 text-primary" />}
        title="Windows, Mac e Linux (Chrome, Edge)"
        highlight={platform === "desktop"}
        steps={[
          <>Abra o KASA HUB no Chrome, Edge ou Brave.</>,
          <>
            Na barra de endereço, procure o ícone <Download className="inline size-3.5" />{" "}
            <strong>Instalar</strong> à direita da URL.
          </>,
          <>
            Ou abra o menu <MoreVertical className="inline size-3.5" /> →{" "}
            <strong>“Instalar KASA HUB...”</strong>.
          </>,
          <>
            O app abre em janela própria, fica no menu Iniciar / Launchpad e pode ser fixado na
            barra de tarefas / dock.
          </>,
        ]}
      />

      <p className="text-[11px] text-muted-foreground text-center">
        A instalação só funciona na versão publicada do KASA HUB, não dentro do editor.
      </p>
    </div>
  );
}

function Guide({
  icon,
  title,
  steps,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  steps: React.ReactNode[];
  highlight?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border p-6 space-y-3 ${
        highlight ? "border-primary/40 bg-surface" : "border-border bg-surface"
      }`}
    >
      <header className="flex items-center gap-3">
        {icon}
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {highlight && (
          <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-primary ml-auto">
            Seu dispositivo
          </span>
        )}
      </header>
      <ol className="space-y-2 text-sm text-foreground/80 list-decimal pl-5">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </section>
  );
}
