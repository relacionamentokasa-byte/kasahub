import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, Star, Building2, User, Users as UsersIcon, GripVertical, Copy } from "lucide-react";
import {
  fetchOnboardingTemplates,
  fetchTemplateSteps,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  upsertTemplateStep,
  deleteTemplateStep,
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
      if (editing.id) return updateTemplate(editing.id, editing);
      return createTemplate({
        name: editing.name || "Novo modelo",
        description: editing.description ?? null,
        is_default: editing.is_default ?? false,
        is_active: editing.is_active ?? true,
      });
    },
    onSuccess: () => {
      toast.success("Modelo salvo");
      qc.invalidateQueries({ queryKey: ["onboarding-templates"] });
      setEditOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      toast.success("Modelo removido");
      qc.invalidateQueries({ queryKey: ["onboarding-templates"] });
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => duplicateTemplate(id),
    onSuccess: (newTpl) => {
      toast.success("Modelo duplicado");
      qc.invalidateQueries({ queryKey: ["onboarding-templates"] });
      setSelected(newTpl.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <Loader2 className="size-5 animate-spin mx-auto" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/50">
            Modelos
          </h3>
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing({ name: "", description: "", is_default: false, is_active: true });
                setEditOpen(true);
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          )}
        </div>
        {templates.length === 0 && (
          <p className="text-xs text-foreground/40 px-2">Nenhum modelo ainda.</p>
        )}
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg border transition",
              (selectedTpl?.id === t.id)
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted",
            )}
          >
            <div className="flex items-center gap-2">
              {t.is_default && <Star className="size-3 text-primary fill-primary" />}
              <span className="text-sm font-semibold truncate">{t.name}</span>
            </div>
            {t.description && (
              <p className="text-[10px] text-foreground/40 mt-0.5 truncate">{t.description}</p>
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
            onDelete={() => {
              if (confirm(`Remover o modelo "${selectedTpl.name}"?`)) deleteMut.mutate(selectedTpl.id);
            }}
          />
        ) : (
          <div className="text-center py-20 text-foreground/40 text-sm">
            Selecione ou crie um modelo.
          </div>
        )}
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar modelo" : "Novo modelo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={editing?.name ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={editing?.description ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">Modelo padrão</p>
                <p className="text-xs text-foreground/40">
                  Usado automaticamente ao aceitar uma proposta.
                </p>
              </div>
              <Switch
                checked={editing?.is_default ?? false}
                onCheckedChange={(v) => setEditing((p) => ({ ...p, is_default: v }))}
              />
            </div>
            <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">Ativo</p>
              </div>
              <Switch
                checked={editing?.is_active ?? true}
                onCheckedChange={(v) => setEditing((p) => ({ ...p, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Salvar
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
  onDelete,
}: {
  template: OnboardingTemplate;
  canEdit: boolean;
  onEdit: () => void;
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
    mutationFn: () =>
      upsertTemplateStep({
        ...stepDraft,
        template_id: template.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-template-steps", template.id] });
      setStepOpen(false);
      setStepDraft(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteStep = useMutation({
    mutationFn: (id: string) => deleteTemplateStep(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["onboarding-template-steps", template.id] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-bold flex items-center gap-2">
            {template.name}
            {template.is_default && (
              <span className="text-[10px] font-mono-kasa uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                Padrão
              </span>
            )}
          </h3>
          {template.description && (
            <p className="text-sm text-foreground/60 mt-1">{template.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="size-3.5 text-rose-500" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40">
          Etapas ({steps.length})
        </h4>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
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
            className="gap-2"
          >
            <Plus className="size-3.5" /> Etapa
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
              className="flex items-start gap-3 border border-border rounded-lg p-3 bg-surface"
            >
              <GripVertical className="size-4 text-foreground/20 mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <span className="text-[10px] font-mono-kasa uppercase tracking-wider bg-muted text-foreground/60 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                    <RIcon className="size-2.5" />
                    {s.responsible_type === "agency"
                      ? "Agência"
                      : s.responsible_type === "client"
                        ? "Cliente"
                        : "Ambos"}
                  </span>
                  <span className="text-[10px] text-foreground/40">+{s.days_after_start}d</span>
                </div>
                {s.description && (
                  <p className="text-xs text-foreground/50 mt-1">{s.description}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
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
                    className="size-7"
                    onClick={() => deleteStep.mutate(s.id)}
                  >
                    <Trash2 className="size-3 text-rose-500" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={stepOpen} onOpenChange={setStepOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{stepDraft?.id ? "Editar etapa" : "Nova etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={stepDraft?.title ?? ""}
                onChange={(e) => setStepDraft((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={stepDraft?.description ?? ""}
                onChange={(e) => setStepDraft((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select
                  value={stepDraft?.responsible_type ?? "agency"}
                  onValueChange={(v) =>
                    setStepDraft((p) => ({ ...p, responsible_type: v as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agency">Agência</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dias após início</Label>
                <Input
                  type="number"
                  min={0}
                  value={stepDraft?.days_after_start ?? 0}
                  onChange={(e) =>
                    setStepDraft((p) => ({ ...p, days_after_start: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveStep.mutate()} disabled={saveStep.isPending}>
              {saveStep.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
