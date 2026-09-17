import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCalendarEvent, deleteCalendarEvent, type CalendarEvent } from "@/lib/approvals-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Calendar, Clock, AlignLeft, Info, Loader2, Edit2 } from "lucide-react";

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    kind: "other" as CalendarEvent["kind"],
    starts_at: "",
  });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        description: event.description || "",
        kind: event.kind as CalendarEvent["kind"],
        starts_at: event.starts_at ? new Date(event.starts_at).toISOString().slice(0, 16) : "",
      });
      setIsEditing(false);
    }
  }, [event]);

  const updateMut = useMutation({
    mutationFn: () => updateCalendarEvent(event!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Evento atualizado com sucesso!");
      setIsEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteCalendarEvent(event!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Evento excluído com sucesso!");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!event) return null;

  const isGoogle = (event as any).source === "google";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
              <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Calendar className="size-5" />
              </div>
              <span>{isEditing ? "Editar Evento" : "Detalhes do Evento"}</span>
            </DialogTitle>
            {isGoogle && (
              <span className="text-[10px] font-mono-kasa text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                Google Calendar
              </span>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing ? "Atualize as informações do agendamento." : "Visualize a pauta e horário marcado."}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Título do Evento *
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Tipo de Evento *
                </Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) => setForm({ ...form, kind: v as CalendarEvent["kind"] })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting" className="text-xs">Reunião</SelectItem>
                    <SelectItem value="task" className="text-xs">Job / Tarefa</SelectItem>
                    <SelectItem value="approval" className="text-xs">Aprovação</SelectItem>
                    <SelectItem value="dme" className="text-xs">Demanda Extra</SelectItem>
                    <SelectItem value="deadline" className="text-xs">Financeiro / Prazo</SelectItem>
                    <SelectItem value="other" className="text-xs">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Data e Horário *
                </Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  className="h-9 text-xs font-mono-kasa tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Descrição / Pauta
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex gap-3 items-start p-3 rounded-xl bg-muted/20 border border-border/60">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Info className="size-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold leading-tight text-foreground">{event.title}</h3>
                <p className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground capitalize">
                  Tipo: {event.kind}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/60 font-mono-kasa text-muted-foreground">
                <Calendar className="size-3.5 text-primary shrink-0" />
                <span>{new Date(event.starts_at).toLocaleDateString("pt-BR", { dateStyle: "medium" })}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/60 font-mono-kasa text-muted-foreground">
                <Clock className="size-3.5 text-primary shrink-0" />
                <span>{new Date(event.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            {event.description && (
              <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/60">
                <div className="flex items-center gap-1.5 text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  <AlignLeft className="size-3.5 text-primary" />
                  <span>Descrição / Pauta</span>
                </div>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{event.description}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60 flex flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
            onClick={() => {
              if (confirm("Tem certeza que deseja excluir este evento?")) {
                deleteMut.mutate();
              }
            }}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Excluir
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (isEditing ? setIsEditing(false) : onOpenChange(false))}
              className="h-9 text-xs"
            >
              {isEditing ? "Cancelar" : "Fechar"}
            </Button>
            <Button
              size="sm"
              onClick={() => (isEditing ? updateMut.mutate() : setIsEditing(true))}
              disabled={updateMut.isPending}
              className="h-9 text-xs font-medium gap-1.5"
            >
              {updateMut.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isEditing ? (
                <Calendar className="size-3.5" />
              ) : (
                <Edit2 className="size-3.5" />
              )}
              {isEditing ? "Salvar" : "Editar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
