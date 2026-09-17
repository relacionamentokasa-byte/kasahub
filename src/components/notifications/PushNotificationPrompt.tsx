import { useState, useEffect } from "react";
import { BellRing, X, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isPushSupported,
  getCurrentPushSubscription,
  subscribeToPush,
} from "@/lib/push-client";
import { toast } from "sonner";

const DISMISSED_KEY = "kasa_push_prompt_dismissed_until";

export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isPushSupported()) return;

    // Se o usuário bloqueou expressamente no navegador, não adianta perguntar
    if ("Notification" in window && Notification.permission === "denied") return;

    // Se já tiver permissão concedida, apenas sincroniza a inscrição se necessário
    if ("Notification" in window && Notification.permission === "granted") {
      getCurrentPushSubscription().then((sub) => {
        if (!sub) {
          subscribeToPush().catch(() => {});
        }
      });
      return;
    }

    // Verifica se o usuário adiou o aviso recentemente (ex: nas últimas 48 horas)
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // Verifica se já existe inscrição ativa
    getCurrentPushSubscription().then((sub) => {
      if (!sub) {
        // Exibe o prompt suavemente após 2 segundos de navegação
        const timer = setTimeout(() => setVisible(true), 2000);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      await subscribeToPush();
      toast.success("Notificações no celular ativadas com sucesso!");
      setVisible(false);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível ativar as notificações.");
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    // Relembra em 3 dias
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-[390px] z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-surface/95 backdrop-blur-md border border-primary/30 p-5 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-12 -right-12 size-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <BellRing className="size-5 animate-pulse" />
          </div>

          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-foreground">Ativar Notificações</h4>
              <Sparkles className="size-3 text-amber-500" />
            </div>
            <p className="text-xs text-foreground/60 mt-1 leading-relaxed">
              Receba o <strong>Resumo Matinal</strong>, novos leads e aprovações de clientes direto na tela do seu celular.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-foreground/60 hover:text-foreground h-8 px-3"
            onClick={handleDismiss}
            disabled={loading}
          >
            Depois
          </Button>
          <Button
            size="sm"
            variant="default"
            className="text-xs font-semibold h-8 px-4 gap-1.5 shadow-md shadow-primary/20"
            onClick={handleEnable}
            disabled={loading}
          >
            <Smartphone className="size-3.5" />
            {loading ? "Ativando..." : "Ativar no Celular"}
          </Button>
        </div>
      </div>
    </div>
  );
}
