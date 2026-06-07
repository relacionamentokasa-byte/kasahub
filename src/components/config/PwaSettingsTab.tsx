import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAgencySettings, type AgencySettings } from "@/lib/settings-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import { Bell, BellOff, Download, Loader2, Save, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { APP_VERSION } from "@/lib/version";
import {
  getCurrentPushSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";
import { sendTestPush } from "@/lib/push.functions";

export function PwaSettingsTab({
  form,
  set,
  canEdit,
}: {
  form: Partial<AgencySettings>;
  set: <K extends keyof AgencySettings>(k: K, v: AgencySettings[K]) => void;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const [installed] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      Boolean((window.navigator as any).standalone)
    );
  });

  const saveMut = useMutation({
    mutationFn: () => updateAgencySettings(form.id as string, form),
    onSuccess: () => {
      toast.success("Configurações do aplicativo salvas");
      qc.invalidateQueries({ queryKey: ["agency-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const supported = typeof window !== "undefined" && isPushSupported();

  useEffect(() => {
    if (!supported) return;
    getCurrentPushSubscription().then((s) => setPushEnabled(Boolean(s))).catch(() => {});
  }, [supported]);

  async function enablePush() {
    setPushBusy(true);
    try {
      await subscribeToPush();
      setPushEnabled(true);
      toast.success("Notificações push ativadas neste dispositivo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao ativar push");
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    try {
      await unsubscribeFromPush();
      setPushEnabled(false);
      toast.success("Notificações push desativadas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao desativar push");
    } finally {
      setPushBusy(false);
    }
  }

  async function sendTestNotification() {
    try {
      if (pushEnabled) {
        const res = await sendTestPush({});
        toast.success(`Push enviado para ${res.sent} dispositivo(s)`);
        return;
      }
      if (!("Notification" in window)) {
        toast.error("Notificações não suportadas neste navegador");
        return;
      }
      let perm = Notification.permission;
      if (perm === "default") perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Permissão de notificações negada");
        return;
      }
      new Notification(form.pwa_name || "KASA HUB", {
        body: "🔔 Notificação de teste local (ative o Push para envio remoto).",
        icon: form.pwa_icon_512_url || "/icon-512.png",
      });
      toast.success("Notificação local enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
        <header>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Smartphone className="size-4 text-primary" /> Identidade do Aplicativo
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Configure como o KASA HUB aparece quando instalado em desktops e celulares.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nome do Aplicativo</Label>
            <Input
              value={form.pwa_name ?? ""}
              onChange={(e) => set("pwa_name", e.target.value)}
              placeholder="KASA HUB"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nome Curto</Label>
            <Input
              value={form.pwa_short_name ?? ""}
              onChange={(e) => set("pwa_short_name", e.target.value)}
              placeholder="KASA"
              disabled={!canEdit}
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={form.pwa_description ?? ""}
              onChange={(e) => set("pwa_description", e.target.value)}
              placeholder="Plataforma de gestão operacional, comercial e financeira da KASA."
              rows={2}
              disabled={!canEdit}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
        <header>
          <h3 className="font-display text-lg font-semibold">Cores</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Cores usadas na splash screen e barra do sistema.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <ColorField
            label="Cor principal (theme)"
            value={form.pwa_theme_color ?? ""}
            onChange={(v) => set("pwa_theme_color", v)}
            placeholder="#F4B544"
            disabled={!canEdit}
          />
          <ColorField
            label="Cor de fundo (splash)"
            value={form.pwa_background_color ?? ""}
            onChange={(v) => set("pwa_background_color", v)}
            placeholder="#0C1618"
            disabled={!canEdit}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
        <header>
          <h3 className="font-display text-lg font-semibold italic opacity-50">Identidade Visual</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Ícones e Splash Screen agora são gerenciados na aba <span className="font-bold text-primary">Identidade Visual</span>.
          </p>
        </header>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 space-y-3">
        <header>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Bell className="size-4 text-primary" /> Notificações
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Ative as notificações push (VAPID) neste dispositivo para receber avisos mesmo
            com o app fechado. O push real só funciona na versão publicada.
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          {pushEnabled ? (
            <Button variant="outline" onClick={disablePush} disabled={pushBusy || !supported}>
              {pushBusy ? <Loader2 className="size-4 animate-spin" /> : <BellOff className="size-4" />}
              Desativar Push
            </Button>
          ) : (
            <Button onClick={enablePush} disabled={pushBusy || !supported}>
              {pushBusy ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
              Ativar Notificações Push
            </Button>
          )}
          <Button variant="outline" onClick={sendTestNotification}>
            <Bell className="size-4" /> Enviar Notificação de Teste
          </Button>
        </div>
        {!supported && (
          <p className="text-[11px] text-muted-foreground">
            Este navegador não suporta Web Push. Use Chrome, Edge, Firefox ou Safari recente.
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Status: {pushEnabled ? "🟢 Inscrito neste dispositivo" : "⚪ Não inscrito"}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 space-y-3">
        <header>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Download className="size-4 text-primary" /> Instalação
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {installed
              ? "✅ Aplicativo já está instalado neste dispositivo."
              : "Use o navegador (Chrome/Edge no desktop ou Android) para instalar. No iPhone, abra no Safari e use “Adicionar à Tela de Início”."}
          </p>
        </header>
        <p className="text-[11px] text-muted-foreground">
          Versão atual: <strong>KASA HUB v{APP_VERSION}</strong>
        </p>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => saveMut.mutate()} disabled={!canEdit || saveMut.isPending}>
          {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 w-12 rounded-md border border-input bg-transparent cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
