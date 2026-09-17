import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, Star, Building2, User, Users as UsersIcon, GripVertical, Copy, Rocket, Layers } from "lucide-react";
import {
  fetchOnboardingTemplates,
  fetchTemplateSteps,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  upsertTemplateStep,
  deleteTemplateStep,
  syncAllOnboardingsForTemplate,
  type OnboardingTemplate,
  type OnboardingTemplateStep,
} from "@/lib/onboarding-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function OnboardingTemplatesManager({ canEdit = true }: { canEdit?: boolean }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<OnboardingTemplate> | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["onboarding-templates"],
    queryFn: fetchOnboardingTemplates,
  });

  const selectedTpl = templates.find((t) => t.id === selected) ?? templates[0];

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (editing.id) {
        const res = await updateTemplate(editing.id, editing);
        await syncAllOnboardingsForTemplate(editing.id).catch(() => null);
        return res;
      }
      return createTemplate({
        name: editing.name || "Novo modelo",
        description: editing.description ?? null,
        is_default: editing.is_default ?? false,
        is_active: editing.is_active ?? true,
      });
    },
    onSuccess: () => {
      toast.success("Modelo salvo com sucesso!");
      qc.invalidateQueries({ queryKey: ["onboarding-templates"] });
      qc.invalidateQueries({ queryKey: ["onboarding-steps"] });
      qc.invalidateQueries({ queryKey: ["onboardings"] });
      setEditOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      toast.success("Modelo removido com sucesso!");
      qc.invalidateQueries({ queryKey: ["onboarding-templates"] });
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => duplicateTemplate(id),
    onSuccess: (newTpl) => {
      toast.success("Modelo duplicado com sucesso!");
      qc.invalidateQueries({ queryKey: ["onboarding-templates"] });
      setSelected(newTpl.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
            Modelos Disponíveis
          </h3>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 text-xs gap-1"
              onClick={() => {
                setEditing({ name: "", description: "", is_default: false, is_active: true });
                setEditOpen(true);
              }}
            >
              <Plus className="size-3.5" /> Novo
            </Button>
          )}
        </div>
        {templates.length === 0 && (
          <p className="text-xs text-muted-foreground px-2">Nenhum modelo cadastrado.</p>
        )}
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={cn(
              "w-full text-left p-3 rounded-xl border transition cursor-pointer",
              selectedTpl?.id === t.id
                ? "border-primary/60 bg-primary/5 shadow-xs"
                : "border-border/80 hover:bg-muted/30 bg-card"
            )}
          >
            <div className="flex items-center gap-2">
              {t.is_default && <Star className="size-3 text-primary fill-primary shrink-0" />}
              <span className="text-xs font-semibold truncate text-foreground">{t.name}</span>
            </div>
            {t.description && (
              <p className="text-[10px] text-muted-foreground mt-1 truncate">{t.description}</p>
            )}
          </button>
        ))}
      </aside>

      <section>
        {selectedTpl ? (
          <TemplateDetail
            template={selectedTpl}
            canEdit={canEdit}
            onEdit={() => {
              setEditing(selectedTpl);
              setEditOpen(true);
            }}
            onDuplicate={() => duplicateMut.mutate(selectedTpl.id)}
            duplicating={duplicateMut.isPending}
            onDelete={() => {
              if (confirm(`Remover o modelo "${selectedTpl.name}"?`)) deleteMut.mutate(selectedTpl.id);
            }}
          />
        ) : (
          <div className="text-center py-20 text-muted-foreground text-xs border border-dashed border-border/80 rounded-xl bg-muted/10">
            Selecione ou crie um modelo de onboarding.
          </div>
        )}
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
              <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Rocket className="size-5" />
              </div>
              <span>{editing?.id ? `Editar Modelo · ${editing.name}` : "Novo Modelo de Onboarding"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Defina as configurações do fluxo de boas-vindas do cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Nome do Modelo *
              </Label>
              <Input
                value={editing?.name ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Onboarding Padrão Agência ou E-commerce"
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Descrição do Fluxo
              </Label>
              <Textarea
                value={editing?.description ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
                placeholder="Detalhes dos objetivos deste fluxo de entrada…"
                className="text-xs resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between border border-border/80 rounded-xl p-3 bg-muted/20">
              <div>
                <p className="text-xs font-semibold text-foreground">Modelo Padrão da Agência</p>
                <p className="text-[10px] text-muted-foreground">
                  Iniciado automaticamente quando um contrato ou proposta for aprovado.
                </p>
              </div>
              <Switch
                checked={editing?.is_default ?? false}
                onCheckedChange={(v) => setEditing((p) => ({ ...p, is_default: v }))}
              />
            </div>

            <div className="flex items-center justify-between border border-border/80 rounded-xl p-3 bg-muted/20">
              <div>
                <p className="text-xs font-semibold text-foreground">Modelo Ativo</p>
                <p className="text-[10px] text-muted-foreground">
                  Disponível para seleção em novos clientes e projetos.
                </p>
              </div>
              <Switch
                checked={editing?.is_active ?? true}
                onCheckedChange={(v) => setEditing((p) => ({ ...p, is_active: v }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} className="h-9 text-xs">
              Cancelar
            </Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !editing?.name?.trim()}
              size="sm"
              className="h-9 text-xs font-medium gap-1.5"
            >
              {saveMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Rocket className="size-3.5" />}
              Salvar Modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateDetail({
  template,
  canEdit,
  onEdit,
  onDuplicate,
  duplicating,
  onDelete,
}: {
  template: OnboardingTemplate;
  canEdit: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  duplicating: boolean;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [stepDraft, setStepDraft] = useState<Partial<OnboardingTemplateStep> | null>(null);
  const [stepOpen, setStepOpen] = useState(false);

  const { data: steps = [] } = useQuery({
    queryKey: ["onboarding-template-steps", template.id],
    queryFn: () => fetchTemplateSteps(template.id),
  });

  const saveStep = useMutation({
    mutationFn: async () => {
      const res = await upsertTemplateStep({
        ...stepDraft,
        template_id: template.id,
      });
      await syncAllOnboardingsForTemplate(template.id).catch(() => null);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-template-steps", template.id] });
      qc.invalidateQueries({ queryKey: ["onboarding-steps"] });
      qc.invalidateQueries({ queryKey: ["onboardings"] });
      setStepOpen(false);
      setStepDraft(null);
      toast.success("Etapa salva com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteStep = useMutation({
    mutationFn: async (id: string) => {
      await deleteTemplateStep(id);
      await syncAllOnboardingsForTemplate(template.id).catch(() => null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-template-steps", template.id] });
      qc.invalidateQueries({ queryKey: ["onboarding-steps"] });
      qc.invalidateQueries({ queryKey: ["onboardings"] });
      toast.success("Etapa removida com sucesso!");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border/80 bg-card shadow-xs">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            {template.name}
            {template.is_default && (
              <span className="text-[10px] font-mono-kasa bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded">
                Padrão
              </span>
            )}
          </h3>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{template.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onDuplicate}
              disabled={duplicating}
              className="h-8 px-2.5 text-xs gap-1"
              title="Duplicar modelo"
            >
              {duplicating ? <Loader2 className="size-3 animate-spin" /> : <Copy className="size-3" />}
              <span className="hidden sm:inline">Duplicar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 px-2.5 text-xs gap-1"
            >
              <Pencil className="size-3" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
          Etapas do Fluxo ({steps.length})
        </h4>
        {canEdit && (
          <Button
            size="sm"
            onClick={() => {
              setStepDraft({
                title: "",
                description: "",
                responsible_type: "agency",
                days_after_start: steps.length > 0 ? steps[steps.length - 1].days_after_start + 2 : 0,
                order_index: steps.length,
              });
              setStepOpen(true);
            }}
            className="gap-1.5 h-8 text-xs font-medium"
          >
            <Plus className="size-3.5" /> Nova Etapa
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {steps.map((s) => {
          const RIcon =
            s.responsible_type === "agency" ? Building2 : s.responsible_type === "client" ? User : UsersIcon;
          return (
            <div
              key={s.id}
              className="flex items-start gap-3 border border-border/80 rounded-xl p-3.5 bg-card shadow-xs hover:border-primary/30 transition-colors"
            >
              <GripVertical className="size-4 text-muted-foreground/40 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-foreground">{s.title}</p>
                  <span className="text-[10px] font-mono-kasa bg-muted border border-border/60 text-muted-foreground px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                    <RIcon className="size-2.5" />
                    {s.responsible_type === "agency"
                      ? "Agência"
                      : s.responsible_type === "client"
                        ? "Cliente"
                        : "Ambos"}
                  </span>
                  <span className="text-[10px] font-mono-kasa text-muted-foreground">
                    +{s.days_after_start}d
                  </span>
                </div>
                {s.description && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setStepDraft(s);
                      setStepOpen(true);
                    }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteStep.mutate(s.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={stepOpen} onOpenChange={setStepOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
              <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Layers className="size-5" />
              </div>
              <span>{stepDraft?.id ? `Editar Etapa · ${stepDraft.title}` : "Nova Etapa de Onboarding"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure os detalhes e responsável por esta etapa de recepção do cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Título da Etapa *
              </Label>
              <Input
                value={stepDraft?.title ?? ""}
                onChange={(e) => setStepDraft((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Reunião de Kick-off ou Coleta de Acessos"
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Instruções / Descrição
              </Label>
              <Textarea
                value={stepDraft?.description ?? ""}
                onChange={(e) => setStepDraft((p) => ({ ...p, description: e.target.value }))}
                placeholder="Orientações detalhadas para a conclusão da etapa…"
                className="text-xs resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Responsável pela Execução
                </Label>
                <Select
                  value={stepDraft?.responsible_type ?? "agency"}
                  onValueChange={(v) =>
                    setStepDraft((p) => ({ ...p, responsible_type: v as any }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agency" className="text-xs">Agência</SelectItem>
                    <SelectItem value="client" className="text-xs">Cliente</SelectItem>
                    <SelectItem value="both" className="text-xs">Ambos em Conjunto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Prazo (Dias após início)
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={stepDraft?.days_after_start ?? 0}
                  onChange={(e) =>
                    setStepDraft((p) => ({ ...p, days_after_start: Number(e.target.value) }))
                  }
                  className="h-9 text-xs font-mono-kasa tabular-nums"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button variant="outline" size="sm" onClick={() => setStepOpen(false)} className="h-9 text-xs">
              Cancelar
            </Button>
            <Button
              onClick={() => saveStep.mutate()}
              disabled={saveStep.isPending || !stepDraft?.title?.trim()}
              size="sm"
              className="h-9 text-xs font-medium gap-1.5"
            >
              {saveStep.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Layers className="size-3.5" />}
              Salvar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
