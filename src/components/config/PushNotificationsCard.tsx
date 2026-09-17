import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { BellRing, Smartphone, Loader2 } from "lucide-react";
import {
  isPushSupported,
  getCurrentPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";
import { sendTestPush } from "@/lib/push.functions";

export function PushNotificationsCard() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const s = isPushSupported();
    setSupported(s);
    if (typeof window !== "undefined") {
      setStandalone(
        window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as any).standalone === true,
      );
      if ("Notification" in window) setPermission(Notification.permission);
    }
    if (!s) {
      setLoading(false);
      return;
    }
    getCurrentPushSubscription()
      .then((sub) => setEnabled(!!sub))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(v: boolean) {
    setBusy(true);
    try {
      if (v) {
        await subscribeToPush();
        setEnabled(true);
        setPermission(Notification.permission);
        toast.success("Notificações push ativadas neste dispositivo!");
      } else {
        await unsubscribeFromPush();
        setEnabled(false);
        toast.success("Notificações push desativadas.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha ao alterar notificações push");
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    try {
      await subscribeToPush();
      setEnabled(true);
      setPermission(Notification.permission);
      const res = await sendTestPush({ data: undefined as any });
      toast.success(`Push enviado para ${res.sent} dispositivo(s).`);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar push de teste");
    } finally {
      setBusy(false);
    }
  }

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;
  const iosNeedsInstall = isIOS && !standalone;

  return (
    <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <BellRing className="size-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Notificações no Celular (Push)</h3>
            <p className="text-sm text-foreground/50 max-w-md">
              Receba alertas no celular mesmo com o KASA HUB fechado — novos leads, follow-ups, menções, aprovações.
            </p>
          </div>
        </div>
        {loading ? (
          <Loader2 className="size-5 animate-spin text-foreground/40" />
        ) : (
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={busy || !supported || iosNeedsInstall}
          />
        )}
      </div>

      {!supported && (
        <div className="text-xs text-foreground/60 bg-muted/30 p-4 rounded-xl">
          Este navegador não suporta notificações push. Use Chrome, Edge, Brave ou Safari 16.4+.
        </div>
      )}

      {iosNeedsInstall && (
        <div className="text-xs text-foreground/70 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex gap-3">
          <Smartphone className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">iPhone / iPad: instale o app primeiro</p>
            <p className="leading-relaxed">
              No iOS, push só funciona depois de "Adicionar à Tela de Início" pelo Safari. Vá na aba
              "Instalar o App" para o passo a passo.
            </p>
          </div>
        </div>
      )}

      {permission === "denied" && supported && (
        <div className="text-xs text-foreground/70 bg-destructive/10 border border-destructive/30 p-4 rounded-xl">
          Você bloqueou as notificações. Libere nas configurações do navegador (cadeado na barra de endereço) e recarregue a página.
        </div>
      )}

      {enabled && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-foreground/50">
            Push ativo neste dispositivo. Você pode ativar em vários celulares/computadores.
          </p>
          <Button size="sm" variant="outline" onClick={handleTest} disabled={busy}>
            Enviar push de teste
          </Button>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-border/50 text-[11px] text-foreground/40 leading-relaxed">
        Push só funciona na versão publicada do KASA HUB (não dentro do editor). Cada dispositivo precisa ativar separadamente.
      </div>
    </div>
  );
}
