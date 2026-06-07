import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchContractTemplates } from "@/lib/contracts-api";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  archiveService,
  createChecklistItem,
  createService,
  createTemplateJob,
  deleteChecklistItem,
  deleteService,
  deleteTemplateJob,
  fetchServices,
  fetchServiceTemplate,
  fetchTemplateChecklist,
  updateService,
  updateTemplateJob,
  type Service,
  type ServiceJobTemplate,
} from "@/lib/services-api";
import { fetchJobStages } from "@/lib/ops-api";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  canEdit: boolean;
}

export function ServicesManager({ canEdit }: Props) {
  const qc = useQueryClient();
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services", "all"],
    queryFn: () => fetchServices(),
  });
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["services"] });
  }

  const archiveMut = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      archiveService(id, archive),
    onSuccess: () => {
      invalidate();
      toast.success("Serviço atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      invalidate();
      toast.success("Serviço excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold">Serviços e Templates Operacionais</p>
          <p className="text-xs text-foreground/50">
            Biblioteca central de serviços da agência e seus Jobs padrão.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={!canEdit} className="gap-2">
          <Plus className="size-4" /> Novo serviço
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {services.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-foreground/50">
            Nenhum serviço cadastrado ainda.
          </div>
        )}
        {services.map((s) => (
          <div key={s.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{s.name}</p>
                {s.category && (
                  <span className="text-[10px] font-mono-kasa capitalize text-foreground/50">
                    {s.category}
                  </span>
                )}
                {!s.is_active && (
                  <Badge variant="secondary" className="text-[10px]">
                    Inativo
                  </Badge>
                )}
                {s.archived_at && (
                  <Badge variant="outline" className="text-[10px]">
                    Arquivado
                  </Badge>
                )}
              </div>
              {s.description && (
                <p className="text-xs text-foreground/50 mt-0.5 line-clamp-1">
                  {s.description}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(s)}
              disabled={!canEdit}
              className="gap-1"
            >
              <Pencil className="size-3.5" /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                archiveMut.mutate({ id: s.id, archive: !s.archived_at })
              }
              disabled={!canEdit}
              className="gap-1"
            >
              {s.archived_at ? (
                <>
                  <ArchiveRestore className="size-3.5" /> Reativar
                </>
              ) : (
                <>
                  <Archive className="size-3.5" /> Arquivar
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Excluir o serviço "${s.name}"?`)) delMut.mutate(s.id);
              }}
              disabled={!canEdit}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {creating && (
        <ServiceFormDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            invalidate();
            setCreating(false);
          }}
        />
      )}
      {editing && (
        <ServiceFormDialog
          service={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            invalidate();
          }}
        />
      )}
    </div>
  );
}

// ============= Service Form Dialog =============
function ServiceFormDialog({
  service,
  onClose,
  onSaved,
}: {
  service?: Service;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: service?.name ?? "",
    category: service?.category ?? "",
    description: service?.description ?? "",
    is_active: service?.is_active ?? true,
    default_scope: (service?.default_scope as string[]) ?? [],
    contract_template_id: (service as any)?.contract_template_id ?? "",
    
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: fetchContractTemplates,
  });


  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        is_active: form.is_active,
        default_scope: form.default_scope,
        contract_template_id: form.contract_template_id || null,
        
      } as any;
      if (!payload.name) throw new Error("Nome obrigatório");
      if (service) return updateService(service.id, payload);
      return createService(payload);
    },
    onSuccess: () => {
      toast.success("Serviço salvo");
      qc.invalidateQueries({ queryKey: ["services"] });
      onSaved();
      if (!service) onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Editar serviço" : "Novo serviço"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="template" disabled={!service}>
              Template Operacional
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Nome do serviço *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Gestão de Redes Sociais"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Ex.: Social Media"
                />
              </div>
              <div className="space-y-1.5 flex items-end gap-2">
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <span className="text-sm">
                    {form.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Template Contratual Padrão</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.contract_template_id}
                  onChange={(e) => setForm({ ...form, contract_template_id: e.target.value })}
                >
                  <option value="">Sem contrato padrão</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição do Serviço</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Escopo Padrão (Etapas sugeridas para Jobs)</Label>
              <Textarea
                rows={5}
                value={form.default_scope.join("\n")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    default_scope: e.target.value.split("\n").filter((x) => x.trim()),
                  })
                }
                placeholder="Item 1&#10;Item 2&#10;Item 3"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </TabsContent>

          {service && (
            <TabsContent value="template" className="pt-4">
              <TemplateEditor serviceId={service.id} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============= Template Editor =============
function TemplateEditor({ serviceId }: { serviceId: string }) {
  const qc = useQueryClient();
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["service-template", serviceId],
    queryFn: () => fetchServiceTemplate(serviceId),
  });
  const { data: stages = [] } = useQuery({
    queryKey: ["job-stages"],
    queryFn: fetchJobStages,
  });
  const { data: opTemplates = [] } = useQuery({
    queryKey: ["operational-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("operational_templates").select("*").order("name");
      return data || [];
    },
  });

  const [newJobName, setNewJobName] = useState("");

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["service-template", serviceId] });
  }

  const addMut = useMutation({
    mutationFn: () => {
      if (!newJobName.trim()) throw new Error("Nome obrigatório");
      return createTemplateJob({
        service_id: serviceId,
        name: newJobName.trim(),
        order_index: jobs.length,
        default_duration_days: 3,
      });
    },
    onSuccess: () => {
      setNewJobName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveMut = useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: -1 | 1 }) => {
      const idx = jobs.findIndex((j) => j.id === id);
      const target = idx + dir;
      if (target < 0 || target >= jobs.length) return;
      const a = jobs[idx];
      const b = jobs[target];
      await updateTemplateJob(a.id, { order_index: b.order_index });
      await updateTemplateJob(b.id, { order_index: a.order_index });
    },
    onSuccess: invalidate,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-foreground/60">
        Cadastre os Jobs padrão deste serviço. Quando uma proposta for aprovada, esta
        estrutura será usada para gerar automaticamente os Jobs do projeto.
      </p>

      <div className="space-y-2">
        {jobs.map((j, idx) => (
          <TemplateJobRow
            key={j.id}
            job={j}
            stages={stages}
            opTemplates={opTemplates}
            isFirst={idx === 0}
            isLast={idx === jobs.length - 1}
            onMove={(dir) => moveMut.mutate({ id: j.id, dir })}
            onChanged={invalidate}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <Input
          value={newJobName}
          onChange={(e) => setNewJobName(e.target.value)}
          placeholder="Novo job (ex.: Planejamento)"
          onKeyDown={(e) => {
            if (e.key === "Enter") addMut.mutate();
          }}
        />
        <Button onClick={() => addMut.mutate()} disabled={addMut.isPending} className="gap-1">
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

function TemplateJobRow({
  job,
  stages,
  opTemplates,
  isFirst,
  isLast,
  onMove,
  onChanged,
}: {
  job: ServiceJobTemplate;
  stages: any[];
  opTemplates: any[];
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: -1 | 1) => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState({
    name: job.name,
    default_duration_days: job.default_duration_days,
    initial_stage_id: job.initial_stage_id || "",
    operational_template_id: (job as any).operational_template_id || "",
    custom_fields_schema: JSON.stringify(job.custom_fields_schema || [], null, 2),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      updateTemplateJob(job.id, {
        name: local.name,
        default_duration_days: local.default_duration_days,
        initial_stage_id: local.initial_stage_id || null,
        operational_template_id: local.operational_template_id || null,
        custom_fields_schema: JSON.parse(local.custom_fields_schema || "[]"),
      }),
    onSuccess: () => {
      toast.success("Job atualizado");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => deleteTemplateJob(job.id),
    onSuccess: () => {
      toast.success("Job removido");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["template-checklist", job.id],
    queryFn: () => fetchTemplateChecklist(job.id),
    enabled: expanded,
  });

  const [newItem, setNewItem] = useState("");
  const addItemMut = useMutation({
    mutationFn: () => {
      if (!newItem.trim()) throw new Error("Obrigatório");
      return createChecklistItem({
        template_job_id: job.id,
        content: newItem.trim(),
        order_index: checklist.length,
      });
    },
    onSuccess: () => {
      setNewItem("");
      qc.invalidateQueries({ queryKey: ["template-checklist", job.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delItemMut = useMutation({
    mutationFn: (id: string) => deleteChecklistItem(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["template-checklist", job.id] }),
  });

  return (
    <div className="rounded-lg border border-border bg-background/40">
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="flex flex-col">
          <Button
            size="icon"
            variant="ghost"
            className="size-5"
            disabled={isFirst}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="size-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-5"
            disabled={isLast}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="size-3" />
          </Button>
        </div>
        <Input
          value={local.name}
          onChange={(e) => setLocal({ ...local, name: e.target.value })}
          className="flex-1 h-8"
        />
        <div className="flex items-center gap-1">
          <select
            className="h-8 rounded-md border border-input bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
            value={local.initial_stage_id}
            onChange={(e) => setLocal({ ...local, initial_stage_id: e.target.value })}
          >
            <option value="">Estágio Inicial</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <select
            className="h-8 rounded-md border border-input bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
            value={local.operational_template_id}
            onChange={(e) => setLocal({ ...local, operational_template_id: e.target.value })}
          >
            <option value="">Template Etapas</option>
            {opTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            value={local.default_duration_days}
            onChange={(e) =>
              setLocal({ ...local, default_duration_days: Number(e.target.value) })
            }
            className="w-16 h-8"
          />
          <span className="text-[10px] text-foreground/50">dias</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => saveMut.mutate()}>
          Salvar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setExpanded((v) => !v)}
        >
          Checklist / Form
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-destructive"
          onClick={() => {
            if (confirm(`Remover job "${job.name}"?`)) delMut.mutate();
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
          {checklist.length === 0 && (
            <p className="text-xs text-foreground/40">Sem itens de checklist.</p>
          )}
          {checklist.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 text-sm bg-background/60 rounded px-2 py-1"
            >
              <span className="flex-1">□ {c.content}</span>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => delItemMut.mutate(c.id)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Novo item do checklist"
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") addItemMut.mutate();
              }}
            />
            <Button size="sm" onClick={() => addItemMut.mutate()}>
              Adicionar
            </Button>
          </div>
          <div className="pt-3 border-t border-border space-y-2">
            <Label className="text-[10px] uppercase font-bold text-primary">Esquema do Formulário Dinâmico (JSON)</Label>
            <p className="text-[10px] text-foreground/40 italic">Ex: {`[{"label": "Nome do Post", "type": "text", "required": true}]`}</p>
            <Textarea
              value={local.custom_fields_schema}
              onChange={(e) => setLocal({ ...local, custom_fields_schema: e.target.value })}
              className="font-mono text-[10px] h-32"
              placeholder='[{"label": "Exemplo", "type": "text"}]'
            />
          </div>
        </div>
      )}
    </div>
  );
}
