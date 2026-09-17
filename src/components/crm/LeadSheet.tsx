import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProposal,
  deleteLead,
  formatCurrency,
  updateLead,
  markLeadAsWon,
  markLeadAsLost,
  convertLeadToClient,
  LEAD_SOURCES,
  type Lead,
  type Stage,
} from "@/lib/crm-api";
import {
  completeLeadTask,
  createLeadTask,
  deleteLeadTask,
  fetchLeadTasks,
  updateLeadTask,
  type LeadTask,
} from "@/lib/lead-tasks-api";
import { fetchProfiles } from "@/lib/profile-api";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail,
  Phone,
  Trash2,
  Sparkles,
  MessageCircle,
  MoreVertical,
  CheckSquare,
  Square,
  Plus,
  Trophy,
  XCircle,
  UserCheck,
  Check,
  Calendar,
  Building2,
  DollarSign,
  User,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LostLeadDialog } from "./LostLeadDialog";
import { toast } from "sonner";

export function LeadSheet({
  lead,
  stages,
  onClose,
}: {
  lead: Lead | null;
  stages: Stage[];
  onClose: () => void;
}) {
  if (!lead) return null;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-l border-border p-0 flex flex-col h-full shadow-2xl">
        <Inner lead={lead} stages={stages} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}

function Inner({ lead, stages, onClose }: { lead: Lead; stages: Stage[]; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(lead);
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);

  useEffect(() => {
    setForm(lead);
  }, [lead]);

  const wonStage = stages.find((s) => s.is_won);
  const lostStage = stages.find((s) => s.is_lost);

  const { data: tasks = [] } = useQuery({
    queryKey: ["crm", "tasks", lead.id],
    queryFn: () => fetchLeadTasks(lead.id),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });

  const saveMut = useMutation({
    mutationFn: () =>
      updateLead(lead.id, {
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone,
        value: form.value,
        source: form.source,
        notes: form.notes,
        stage_id: form.stage_id,
        owner_id: form.owner_id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("Oportunidade salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const winMut = useMutation({
    mutationFn: () => {
      if (!wonStage) throw new Error("Nenhuma etapa de Ganho configurada");
      return markLeadAsWon(lead.id, wonStage.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("🎉 Oportunidade ganha!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loseMut = useMutation({
    mutationFn: (reason: string) => {
      if (!lostStage) throw new Error("Nenhuma etapa de Perda configurada");
      return markLeadAsLost(lead.id, lostStage.id, reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      setIsLostDialogOpen(false);
      toast.info("Oportunidade marcada como perdida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertClientMut = useMutation({
    mutationFn: () => convertLeadToClient(lead),
    onSuccess: ({ clientId, isNew }) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success(isNew ? "Cliente criado no Kasa Hub!" : "Cliente localizado.");
      navigate({ to: "/clientes/$clientId", params: { clientId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => deleteLead(lead.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("Oportunidade removida");
      onClose();
    },
  });

  const proposalMut = useMutation({
    mutationFn: () =>
      createProposal({
        title: `Proposta · ${lead.name}`,
        client_name: lead.company ?? lead.name,
        client_email: lead.email,
        lead_id: lead.id,
        intro: "Apresentação Kasa Marketing — escopo de serviços e investimento.",
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta gerada");
      navigate({ to: "/propostas/$proposalId", params: { proposalId: p.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isWon = lead.stage_id === wonStage?.id || !!lead.won_at;
  const isLost = lead.stage_id === lostStage?.id || !!lead.lost_reason;
  const cleanPhone = form.phone?.replace(/\D/g, "");

  return (
    <>
      {/* Top Banner: Name, Company & Quick Actions */}
      <div className="p-5 pb-4 border-b border-border bg-muted/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <SheetTitle className="font-display text-lg font-bold tracking-tight text-foreground truncate">
                {lead.name}
              </SheetTitle>
              {isWon && (
                <span className="text-[10px] uppercase font-mono-kasa bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/25">
                  <Trophy className="size-3" /> Ganho
                </span>
              )}
              {isLost && (
                <span className="text-[10px] uppercase font-mono-kasa bg-destructive/15 text-destructive font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-destructive/25">
                  <XCircle className="size-3" /> Perdido
                </span>
              )}
            </div>
            {lead.company && lead.company !== lead.name && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Building2 className="size-3 text-muted-foreground/70" /> {lead.company}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {cleanPhone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(
                    `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}`,
                    "_blank"
                  );
                }}
                className="h-8 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-1.5 font-medium"
              >
                <MessageCircle className="size-3.5" />
                WhatsApp
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isWon && wonStage && (
                  <DropdownMenuItem
                    onClick={() => winMut.mutate()}
                    className="text-emerald-600 dark:text-emerald-400 font-medium"
                  >
                    <Trophy className="size-3.5 mr-2" /> Marcar como Ganho
                  </DropdownMenuItem>
                )}
                {!isLost && lostStage && (
                  <DropdownMenuItem
                    onClick={() => setIsLostDialogOpen(true)}
                    className="text-destructive font-medium"
                  >
                    <XCircle className="size-3.5 mr-2" /> Marcar como Perdido
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => convertClientMut.mutate()}>
                  <UserCheck className="size-3.5 mr-2" /> Converter em Cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => proposalMut.mutate()}>
                  <Sparkles className="size-3.5 mr-2" /> Gerar Proposta
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm("Deseja realmente excluir esta oportunidade?")) delMut.mutate();
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="size-3.5 mr-2" /> Excluir Oportunidade
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {lead.lost_reason && (
          <div className="mt-3 p-2.5 bg-destructive/5 border border-destructive/20 rounded-lg text-xs">
            <span className="font-semibold text-destructive uppercase tracking-wider text-[10px] block mb-0.5">
              Motivo da perda:
            </span>
            <p className="text-foreground/80 leading-relaxed">{lead.lost_reason}</p>
          </div>
        )}
      </div>

      {/* Main Form Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Section 1: Deal Core */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="size-3" /> Valor Estimado (R$)
              </Label>
              <Input
                type="number"
                value={String(form.value ?? 0)}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                className="h-8 text-xs font-mono-kasa font-medium bg-background/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Etapa do Funil</Label>
              <Select
                value={form.stage_id ?? undefined}
                onValueChange={(v) => setForm({ ...form, stage_id: v })}
              >
                <SelectTrigger className="h-8 text-xs bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <User className="size-3" /> Responsável Comercial
              </Label>
              <Select
                value={form.owner_id ?? "unassigned"}
                onValueChange={(v) => setForm({ ...form, owner_id: v === "unassigned" ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                  {profiles.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name || p.full_name || "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Compass className="size-3" /> Origem
              </Label>
              <Select
                value={form.source ?? "unassigned"}
                onValueChange={(v) => setForm({ ...form, source: v === "unassigned" ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs bg-background/50">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Não informada</SelectItem>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Info */}
        <div className="space-y-3 pt-2 border-t border-border/60">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Phone className="size-3" /> WhatsApp / Telefone
              </Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(62) 99999-9999"
                className="h-8 text-xs bg-background/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="size-3" /> E-mail (opcional)
              </Label>
              <Input
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@empresa.com"
                className="h-8 text-xs bg-background/50"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Briefing / Notes */}
        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Briefing & Necessidade do Cliente
          </Label>
          <Textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Descreva o escopo desejado (ex: Gestão de tráfego, Redesign de Marca, Fee mensal)..."
            className="bg-background/50 resize-none text-xs leading-relaxed"
          />
        </div>

        {/* Section 4: Next Follow-ups / Tasks */}
        <div className="pt-2 border-t border-border/60">
          <TasksSection
            leadId={lead.id}
            tasks={tasks}
            leadName={lead.name}
            defaultAssignee={form.owner_id ?? null}
          />
        </div>
      </div>

      {/* Clean Footer */}
      <div className="p-4 border-t border-border bg-background/50 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => proposalMut.mutate()}
          disabled={proposalMut.isPending}
          className="h-8 text-xs font-medium gap-1.5"
        >
          <Sparkles className="size-3.5 text-foreground/80" /> Proposta
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs text-muted-foreground"
          >
            Fechar
          </Button>
          <Button
            size="sm"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="h-8 text-xs font-medium px-4 gap-1.5"
          >
            <Check className="size-3.5" />
            {saveMut.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

      <LostLeadDialog
        open={isLostDialogOpen}
        onOpenChange={setIsLostDialogOpen}
        leadName={lead.name}
        onConfirm={(reason) => loseMut.mutate(reason)}
        isLoading={loseMut.isPending}
      />
    </>
  );
}

function TasksSection({
  leadId,
  tasks,
  leadName,
  defaultAssignee,
}: {
  leadId: string;
  tasks: LeadTask[];
  leadName: string;
  defaultAssignee: string | null;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [dueIn, setDueIn] = useState<string>("3");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["crm", "tasks", leadId] });
    qc.invalidateQueries({ queryKey: ["crm", "task-counts"] });
    qc.invalidateQueries({ queryKey: ["crm", "next-tasks"] });
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const days = Number(dueIn);
      const due =
        Number.isFinite(days) && days >= 0
          ? new Date(Date.now() + days * 86400000).toISOString()
          : null;
      const { data } = await supabase.auth.getUser();
      return createLeadTask({
        lead_id: leadId,
        title: title.trim(),
        type: "follow_up",
        due_date: due,
        assigned_to: defaultAssignee || data.user?.id || null,
      });
    },
    onSuccess: () => {
      setTitle("");
      invalidate();
      toast.success("Follow-up adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => completeLeadTask(id),
    onSuccess: invalidate,
  });

  const reopenMut = useMutation({
    mutationFn: (id: string) =>
      updateLeadTask(id, { status: "pending", completed_at: null }),
    onSuccess: invalidate,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteLeadTask(id),
    onSuccess: invalidate,
  });

  const now = Date.now();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
          <Calendar className="size-3" /> Próximo Passo / Follow-up
        </Label>
      </div>

      {/* Compact Add Follow-up Row */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Ex: Cobrar resposta da proposta..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) createMut.mutate();
          }}
          className="flex-1 h-8 text-xs bg-background/50"
        />

        <div className="flex items-center gap-1 bg-background/50 border border-border/70 rounded-md px-2 h-8 shrink-0">
          <span className="text-[10px] text-muted-foreground">Em</span>
          <Input
            type="number"
            min={0}
            value={dueIn}
            onChange={(e) => setDueIn(e.target.value)}
            className="w-7 h-5 border-none bg-transparent p-0 text-center text-xs font-mono-kasa tabular-nums"
          />
          <span className="text-[10px] text-muted-foreground">dias</span>
        </div>

        <Button
          size="sm"
          onClick={() => title.trim() && createMut.mutate()}
          disabled={!title.trim() || createMut.isPending}
          className="h-8 text-xs px-2.5 gap-1 shrink-0"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Tasks List */}
      <div className="space-y-1.5 pt-1">
        {tasks.map((t) => {
          const isDone = t.status === "done";
          const overdue = !isDone && t.due_date && new Date(t.due_date).getTime() < now;
          const dueLabel = t.due_date
            ? new Date(t.due_date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })
            : null;

          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 border text-xs group/item transition-colors",
                isDone
                  ? "bg-muted/10 border-border/40 opacity-60"
                  : overdue
                  ? "bg-destructive/5 border-destructive/30"
                  : "bg-muted/20 border-border/60 hover:border-border"
              )}
            >
              <button
                onClick={() => (isDone ? reopenMut.mutate(t.id) : completeMut.mutate(t.id))}
                className="cursor-pointer text-muted-foreground hover:text-foreground transition"
              >
                {isDone ? (
                  <CheckSquare className="size-3.5 text-foreground" />
                ) : (
                  <Square className="size-3.5" />
                )}
              </button>

              <span
                className={cn(
                  "flex-1 min-w-0 truncate text-xs",
                  isDone && "line-through text-muted-foreground"
                )}
              >
                {t.title}
              </span>

              {dueLabel && (
                <span
                  className={cn(
                    "text-[10px] font-mono-kasa text-muted-foreground shrink-0",
                    overdue && !isDone && "text-destructive font-semibold"
                  )}
                >
                  {dueLabel}
                </span>
              )}

              <button
                onClick={() => delMut.mutate(t.id)}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover/item:opacity-100 transition cursor-pointer p-0.5"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
