import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertOctagon,
  PlayCircle,
  Rocket,
  User,
  Building2,
  Users as UsersIcon,
  Plus,
  Trash2,
  Loader2,
  CalendarIcon,
  Presentation,
  RefreshCw,
} from "lucide-react";

import {
  fetchOnboardings,
  fetchOnboardingSteps,
  fetchOnboardingTemplates,
  createOnboardingFromTemplate,
  updateOnboardingStep,
  deleteOnboarding,
  syncOnboardingWithTemplate,
  updateOnboardingStartDate,
  type OnboardingStep,
} from "@/lib/onboarding-api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_META: Record<OnboardingStep["status"], { label: string; color: string; Icon: any }> = {
  pending: { label: "Pendente", color: "text-foreground/40", Icon: Circle },
  in_progress: { label: "Em andamento", color: "text-amber-500", Icon: Clock },
  done: { label: "Concluída", color: "text-emerald-500", Icon: CheckCircle2 },
  blocked: { label: "Bloqueada", color: "text-rose-500", Icon: AlertOctagon },
  skipped: { label: "Pulada", color: "text-foreground/30", Icon: Circle },
};

const RESPONSIBLE_META: Record<string, { label: string; Icon: any; color: string }> = {
  agency: { label: "Agência", Icon: Building2, color: "bg-primary/10 text-primary" },
  client: { label: "Cliente", Icon: User, color: "bg-blue-500/10 text-blue-500" },
  both: { label: "Ambos", Icon: UsersIcon, color: "bg-purple-500/10 text-purple-500" },
};

export function ClientOnboardingPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date());

  const { data: onboardings = [], isLoading } = useQuery({
    queryKey: ["onboardings", clientId],
    queryFn: () => fetchOnboardings({ clientId }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["onboarding-templates"],
    queryFn: fetchOnboardingTemplates,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createOnboardingFromTemplate({
        client_id: clientId,
        template_id: templateId,
        start_date: format(startDate, "yyyy-MM-dd"),
      }),
    onSuccess: () => {
      toast.success("Onboarding iniciado");
      qc.invalidateQueries({ queryKey: ["onboardings", clientId] });
      setCreateOpen(false);
      setTemplateId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOnboarding(id),
    onSuccess: () => {
      toast.success("Onboarding removido");
      qc.invalidateQueries({ queryKey: ["onboardings", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-10 text-center text-foreground/40 text-xs">
        <Loader2 className="size-5 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-bold">Processo de Onboarding</h3>
          <p className="text-xs text-foreground/50 mt-1">
            Acompanhe o passo a passo de ativação do cliente.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" /> Novo Onboarding
        </Button>
      </div>

      {onboardings.length === 0 && (
        <div className="border border-dashed border-border rounded-2xl py-16 text-center">
          <Rocket className="size-10 text-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-foreground/50">Nenhum onboarding ativo.</p>
          <p className="text-xs text-foreground/30 mt-1">
            Crie a partir de um modelo para começar.
          </p>
        </div>
      )}

      {onboardings.map((onb) => (
        <OnboardingCard
          key={onb.id}
          onboardingId={onb.id}
          title={onb.title}
          status={onb.status}
          progress={onb.progress_percentage}
          startDate={onb.start_date}
          expectedEnd={onb.expected_end_date}
          onDelete={() => {
            if (confirm("Remover este onboarding?")) deleteMut.mutate(onb.id);
          }}
        />
      ))}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar novo Onboarding</DialogTitle>
            <DialogDescription>
              Escolha um modelo. As etapas serão geradas automaticamente com os prazos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/60">Modelo</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {templates
                    .filter((t) => t.is_active)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_default && "(padrão)"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/60">Data de início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal gap-2">
                    <CalendarIcon className="size-4" />
                    {format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-[10px] text-foreground/40">
                Os prazos de cada etapa serão calculados a partir desta data.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!templateId || createMut.isPending}
              onClick={() => createMut.mutate()}
              className="gap-2"
            >
              {createMut.isPending && <Loader2 className="size-4 animate-spin" />}
              Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OnboardingCard({
  onboardingId,
  title,
  status,
  progress,
  startDate,
  expectedEnd,
  onDelete,
  readOnly = false,
}: {
  onboardingId: string;
  title: string;
  status: string;
  progress: number;
  startDate: string;
  expectedEnd: string | null;
  onDelete?: () => void;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const { data: steps = [], isLoading } = useQuery({
    queryKey: ["onboarding-steps", onboardingId],
    queryFn: () => fetchOnboardingSteps(onboardingId),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OnboardingStep["status"] }) =>
      updateOnboardingStep(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-steps", onboardingId] });
      qc.invalidateQueries({ queryKey: ["onboardings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dueMut = useMutation({
    mutationFn: ({ id, due_date }: { id: string; due_date: string | null }) =>
      updateOnboardingStep(id, { due_date }),
    onSuccess: () => {
      toast.success("Prazo atualizado");
      qc.invalidateQueries({ queryKey: ["onboarding-steps", onboardingId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMut = useMutation({
    mutationFn: () => syncOnboardingWithTemplate(onboardingId),
    onSuccess: (res) => {
      toast.success(
        `Sincronizado com o modelo (${res.inserted} nova(s), ${res.updated} atualizada(s)).`,
      );
      qc.invalidateQueries({ queryKey: ["onboarding-steps", onboardingId] });
      qc.invalidateQueries({ queryKey: ["onboardings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startDateMut = useMutation({
    mutationFn: (d: Date) => updateOnboardingStartDate(onboardingId, format(d, "yyyy-MM-dd")),
    onSuccess: () => {
      toast.success("Data de início atualizada — prazos recalculados.");
      qc.invalidateQueries({ queryKey: ["onboarding-steps", onboardingId] });
      qc.invalidateQueries({ queryKey: ["onboardings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-display text-lg font-bold">{title}</h4>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40 flex-wrap">
            <span>Início</span>
            {readOnly ? (
              <span>{format(new Date(startDate + "T00:00:00"), "dd/MM/yy", { locale: ptBR })}</span>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-foreground/5 hover:text-primary transition"
                    title="Alterar data de início — recalcula todos os prazos com base no modelo"
                  >
                    <CalendarIcon className="size-2.5" />
                    {format(new Date(startDate + "T00:00:00"), "dd/MM/yy", { locale: ptBR })}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(startDate + "T00:00:00")}
                    onSelect={(d) => d && startDateMut.mutate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
            {expectedEnd && (
              <span>
                · Previsão {format(new Date(expectedEnd + "T00:00:00"), "dd/MM/yy", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              status === "completed" && "border-emerald-500 text-emerald-500",
              status === "in_progress" && "border-amber-500 text-amber-500",
            )}
          >
            {status === "completed"
              ? "Concluído"
              : status === "in_progress"
                ? "Em andamento"
                : status === "paused"
                  ? "Pausado"
                  : "Cancelado"}
          </Badge>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              title="Sincronizar etapas com o modelo (aplica novas etapas e ajustes do template)"
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
            >
              {syncMut.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Sincronizar
            </Button>
          )}
          {!readOnly && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              title="Abrir modo apresentação (reunião de kickoff)"
            >
              <Link
                to="/onboarding/$onboardingId/apresentar"
                params={{ onboardingId }}
              >
                <Presentation className="size-3.5" />
                Apresentar
              </Link>
            </Button>
          )}
          {!readOnly && onDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} className="size-8">
              <Trash2 className="size-3.5 text-rose-500/70" />
            </Button>
          )}

        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40">
          <span>Progresso</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {isLoading ? (
        <Loader2 className="size-4 animate-spin mx-auto" />
      ) : (
        <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
          {steps.map((step) => {
            const meta = STATUS_META[step.status];
            const resp = RESPONSIBLE_META[step.responsible_type];
            const RIcon = resp.Icon;
            const SIcon = meta.Icon;
            return (
              <li key={step.id} className="relative flex gap-4 pl-0">
                <div className="size-8 rounded-full bg-background border border-border z-10 grid place-items-center shrink-0">
                  <SIcon className={cn("size-4", meta.color)} />
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            step.status === "done" && "line-through text-foreground/40",
                          )}
                        >
                          {step.title}
                        </p>
                        <span
                          className={cn(
                            "text-[9px] font-mono-kasa uppercase tracking-wider px-1.5 py-0.5 rounded gap-1 inline-flex items-center",
                            resp.color,
                          )}
                        >
                          <RIcon className="size-2.5" />
                          {resp.label}
                        </span>
                      </div>
                      {step.description && (
                        <p className="text-xs text-foreground/50 mt-1">{step.description}</p>
                      )}
                      {step.due_date && (
                        readOnly ? (
                          <p className="text-[10px] text-foreground/40 mt-1">
                            Prazo: {format(new Date(step.due_date + "T00:00:00"), "dd 'de' MMM", { locale: ptBR })}
                          </p>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-[10px] text-foreground/40 mt-1 inline-flex items-center gap-1 hover:text-primary transition">
                                <CalendarIcon className="size-2.5" />
                                Prazo: {format(new Date(step.due_date + "T00:00:00"), "dd 'de' MMM", { locale: ptBR })}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={new Date(step.due_date + "T00:00:00")}
                                onSelect={(d) =>
                                  d &&
                                  dueMut.mutate({
                                    id: step.id,
                                    due_date: format(d, "yyyy-MM-dd"),
                                  })
                                }
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        )
                      )}
                    </div>
                    {!readOnly && (
                      <Select
                        value={step.status}
                        onValueChange={(v) =>
                          updateMut.mutate({ id: step.id, status: v as OnboardingStep["status"] })
                        }
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_META).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// Read-only variant for the client portal
export function ClientOnboardingPortalView({ clientId }: { clientId: string }) {
  const { data: onboardings = [], isLoading } = useQuery({
    queryKey: ["onboardings", clientId],
    queryFn: () => fetchOnboardings({ clientId }),
  });

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="size-5 animate-spin mx-auto text-foreground/40" />
      </div>
    );
  }

  const active = onboardings.filter((o) => o.status !== "cancelled");
  if (active.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 grid place-items-center">
          <PlayCircle className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold">Seu Onboarding</h2>
          <p className="text-xs text-foreground/50">
            Acompanhe o passo a passo de ativação do seu projeto.
          </p>
        </div>
      </div>

      {active.map((onb) => (
        <OnboardingCard
          key={onb.id}
          onboardingId={onb.id}
          title={onb.title}
          status={onb.status}
          progress={onb.progress_percentage}
          startDate={onb.start_date}
          expectedEnd={onb.expected_end_date}
          readOnly
        />
      ))}
    </div>
  );
}
