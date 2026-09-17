import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AtSign, AlertCircle, CheckCircle2, Bell, UserPlus, ArrowRight, X, Clock } from "lucide-react";
import {
  criticalBus,
  stopTitleFlash,
  type CriticalNotif,
} from "@/lib/critical-notification-bus";
import { marcarComoLida } from "@/lib/notifications-api";
import { navigateToNotificationLink } from "@/lib/notification-navigation";

function iconFor(tipo: string) {
  if (tipo === "mention" || tipo === "at")
    return {
      Icon: AtSign,
      color: "text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20",
      badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      label: "Menção em conversa"
    };
  if (tipo === "critical")
    return {
      Icon: AlertCircle,
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
      badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      label: "Alerta Crítico"
    };
  if (tipo === "approval")
    return {
      Icon: CheckCircle2,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      label: "Aprovação Pendente"
    };
  if (tipo === "assignment")
    return {
      Icon: UserPlus,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      label: "Nova Atribuição"
    };
  return {
    Icon: Bell,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
    badge: "bg-primary/15 text-primary border-primary/30",
    label: "Notificação do Sistema"
  };
}

export function CriticalNotificationPopup() {
  const [queue, setQueue] = useState<CriticalNotif[]>([]);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const readMut = useMutation({
    mutationFn: marcarComoLida,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });

  useEffect(() => {
    const unsub = criticalBus.subscribe(setQueue);
    return () => { unsub(); };
  }, []);

  const current = queue[0];
  const open = !!current;

  useEffect(() => {
    if (queue.length === 0) stopTitleFlash();
  }, [queue.length]);

  if (!current) return null;

  const { Icon, color, bg, badge, label } = iconFor(current.tipo);

  const handleClose = () => {
    criticalBus.shift();
  };

  const handleGo = () => {
    readMut.mutate(current.id);
    navigateToNotificationLink(navigate, current.link);
    criticalBus.shift();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-[#121214] text-white border border-white/15 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200">
        {/* Header Superior com Tag Institucional e Ação de Fechar */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-mono-kasa uppercase tracking-widest text-zinc-400 font-semibold">
              KASA HUB • Alerta em Tempo Real
            </span>
          </div>

          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Corpo Principal do Popup */}
        <div className="p-6 sm:p-7 flex flex-col items-center text-center gap-4">
          {/* Badge Icon circular com efeito glow suave */}
          <div className={`size-16 rounded-2xl ${bg} border flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300`}>
            <Icon className={`size-8 ${color}`} />
          </div>

          <div className="space-y-2 max-w-sm">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono-kasa uppercase font-bold tracking-wider mx-auto">
              <span className={`inline-block size-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />
              <span className={color}>{label}</span>
            </div>

            <h2 className="text-lg sm:text-xl font-display font-bold text-white leading-tight tracking-tight">
              {current.titulo}
            </h2>
          </div>

          {/* Mensagem descritiva formatada em container card */}
          <div className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-zinc-300 leading-relaxed text-left font-sans">
            {current.mensagem}
          </div>

          {/* Fila de espera de notificações */}
          {queue.length > 1 && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono-kasa text-amber-400/90 font-medium">
              <Clock className="size-3.5" />
              <span>+{queue.length - 1} {queue.length - 1 === 1 ? 'notificação pendente' : 'notificações pendentes'} na fila</span>
            </div>
          )}

          {/* Botões de Ação do Design System KASA HUB */}
          <div className="flex items-center gap-3 w-full mt-2">
            <Button
              variant="outline"
              className="flex-1 h-10 text-xs font-mono-kasa font-semibold border-white/15 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/25 rounded-xl transition-all"
              onClick={handleClose}
            >
              Depois
            </Button>
            {current.link ? (
              <Button
                className="flex-1 h-10 text-xs font-mono-kasa font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md hover:shadow-amber-500/20 rounded-xl transition-all flex items-center justify-center gap-1.5"
                onClick={handleGo}
              >
                <span>Ver Agora</span>
                <ArrowRight className="size-3.5" />
              </Button>
            ) : (
              <Button
                className="flex-1 h-10 text-xs font-mono-kasa font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md hover:shadow-amber-500/20 rounded-xl transition-all"
                onClick={() => {
                  readMut.mutate(current.id);
                  handleClose();
                }}
              >
                Entendido
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
