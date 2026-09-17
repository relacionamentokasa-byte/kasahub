import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApproval, type ApprovalKind } from "@/lib/approvals-api";
import { fetchClients, fetchProjects } from "@/lib/ops-api";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

export function NewApprovalDialog({
  open,
  onOpenChange,
  defaultClientId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultClientId?: string;
}) {
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });

  const [form, setForm] = useState({
    title: "",
    caption: "",
    kind: "post" as ApprovalKind,
    client_id: defaultClientId ?? "",
    project_id: "",
    scheduled_for: "",
  });

  const mut = useMutation({
    mutationFn: () =>
      createApproval({
        title: form.title,
        caption: form.caption || undefined,
        kind: form.kind,
        client_id: form.client_id,
        project_id: form.project_id || null,
        scheduled_for: form.scheduled_for || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      toast.success("Peça criada com sucesso! Agora envie a mídia.");
      onOpenChange(false);
      setForm({
        title: "",
        caption: "",
        kind: "post",
        client_id: defaultClientId ?? "",
        project_id: "",
        scheduled_for: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredProjects = projects.filter((p) => !form.client_id || p.client_id === form.client_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
            <span>Nova Peça para Aprovação</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre uma peça ou criativo para envio e validação no portal do cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Cliente Responsável *
            </Label>
            <Select
              value={form.client_id || undefined}
              onValueChange={(v) => setForm({ ...form, client_id: v, project_id: "" })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer">
                    {c.company || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Formato da Peça *
              </Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v as ApprovalKind })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post" className="text-xs">Post (Feed)</SelectItem>
                  <SelectItem value="reel" className="text-xs">Reels / Shorts</SelectItem>
                  <SelectItem value="story" className="text-xs">Story</SelectItem>
                  <SelectItem value="carousel" className="text-xs">Carrossel</SelectItem>
                  <SelectItem value="video" className="text-xs">Vídeo</SelectItem>
                  <SelectItem value="art" className="text-xs">Arte Gráfica / Banner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Projeto Vinculado
              </Label>
              <Select
                value={form.project_id || undefined}
                onValueChange={(v) => setForm({ ...form, project_id: v })}
                disabled={!form.client_id}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Título da Peça *
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Post Promocional - Campanha de Páscoa"
              className="h-9 text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Legenda / Texto do Post
            </Label>
            <Textarea
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              rows={3}
              placeholder="Digite a legenda que acompanhará o criativo..."
              className="text-xs resize-none"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Agendamento Previsto
            </Label>
            <Input
              type="datetime-local"
              value={form.scheduled_for}
              onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
              className="h-9 text-xs font-mono-kasa tabular-nums"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => mut.mutate()}
            disabled={!form.title.trim() || !form.client_id || mut.isPending}
            className="h-9 text-xs font-medium gap-1.5"
          >
            {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Criar Peça
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
