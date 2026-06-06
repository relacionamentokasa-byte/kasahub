import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCalendarEvent, deleteCalendarEvent, type CalendarEvent } from "@/lib/approvals-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Calendar, Clock, AlignLeft, Info } from "lucide-react";

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
      toast.success("Evento atualizado");
      setIsEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteCalendarEvent(event!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Evento excluído");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!event) return null;

  const isGoogle = (event as any).source === 'google';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="font-display text-xl">
              {isEditing ? "Editar Evento" : "Detalhes do Evento"}
            </DialogTitle>
            {isGoogle && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono-kasa text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                Google Calendar
              </div>
            )}
          </div>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as CalendarEvent["kind"] })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="task">Job</SelectItem>
                    <SelectItem value="approval">Aprovação</SelectItem>
                    <SelectItem value="dme">Demanda Extra</SelectItem>
                    <SelectItem value="deadline">Financeiro/Prazo</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quando</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="bg-background" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="bg-background" />
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-primary/10 text-primary">
                <Info className="size-4" />
              </div>
              <div>
                <h3 className="text-lg font-medium leading-tight">{event.title}</h3>
                <p className="text-xs text-foreground/50 mt-1 capitalize">{event.kind}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-foreground/70">
                <Calendar className="size-4 text-foreground/40" />
                <span>{new Date(event.starts_at).toLocaleDateString('pt-BR', { dateStyle: 'long' })}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground/70">
                <Clock className="size-4 text-foreground/40" />
                <span>{new Date(event.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {event.description && (
                <div className="flex gap-3 text-sm text-foreground/70">
                  <AlignLeft className="size-4 text-foreground/40 mt-0.5" />
                  <p className="flex-1 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex w-full justify-between items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
              onClick={() => {
                if (confirm("Tem certeza que deseja excluir este evento?")) {
                  deleteMut.mutate();
                }
              }}
              disabled={deleteMut.isPending}
            >
              <Trash2 className="size-4" />
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => isEditing ? setIsEditing(false) : onOpenChange(false)}>
                {isEditing ? "Cancelar" : "Fechar"}
              </Button>
              <Button onClick={() => isEditing ? updateMut.mutate() : setIsEditing(true)} disabled={updateMut.isPending}>
                {isEditing ? "Salvar" : "Editar"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}