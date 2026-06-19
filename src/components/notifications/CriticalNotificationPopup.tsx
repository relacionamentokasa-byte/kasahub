import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AtSign, AlertCircle, CheckCircle2, Bell, UserPlus } from "lucide-react";
import {
  criticalBus,
  stopTitleFlash,
  type CriticalNotif,
} from "@/lib/critical-notification-bus";
import { marcarComoLida } from "@/lib/notifications-api";

function iconFor(tipo: string) {
  if (tipo === "mention" || tipo === "at")
    return { Icon: AtSign, color: "text-sky-500", bg: "bg-sky-500/10", label: "Menção" };
  if (tipo === "critical")
    return { Icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10", label: "Alerta crítico" };
  if (tipo === "approval")
    return { Icon: CheckCircle2, color: "text-amber-500", bg: "bg-amber-500/10", label: "Aprovação pendente" };
  if (tipo === "assignment")
    return { Icon: UserPlus, color: "text-violet-500", bg: "bg-violet-500/10", label: "Nova responsabilidade" };
  return { Icon: Bell, color: "text-primary", bg: "bg-primary/10", label: "Notificação" };
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

  const { Icon, color, bg, label } = iconFor(current.tipo);

  const handleClose = () => {
    criticalBus.shift();
  };

  const handleGo = () => {
    readMut.mutate(current.id);
    if (current.link) navigate({ to: current.link as any });
    criticalBus.shift();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-2 border-primary/20">
        <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
          <div className={`size-20 rounded-full ${bg} flex items-center justify-center animate-in zoom-in duration-300`}>
            <Icon className={`size-10 ${color}`} />
          </div>

          <div className="space-y-1">
            <p className={`text-[10px] uppercase tracking-widest font-bold ${color}`}>
              {label}
            </p>
            <h2 className="text-xl font-display font-bold text-foreground leading-tight">
              {current.titulo}
            </h2>
          </div>

          <p className="text-sm text-foreground/70 leading-relaxed max-w-sm">
            {current.mensagem}
          </p>

          {queue.length > 1 && (
            <p className="text-[10px] uppercase tracking-wider text-foreground/40 font-mono">
              +{queue.length - 1} aguardando
            </p>
          )}

          <div className="flex gap-2 w-full mt-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Depois
            </Button>
            {current.link && (
              <Button className="flex-1" onClick={handleGo}>
                Ver agora
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
