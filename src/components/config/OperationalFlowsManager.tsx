import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Settings2, 
  Trash2, 
  Copy, 
  MoreHorizontal, 
  GripVertical,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  CheckSquare,
  Loader2,
  FileText,
  ArrowDown,
  X
} from "lucide-react";
import { toast } from "sonner";
import { JOB_TYPES } from "@/lib/job-types";

import { 
  fetchOperationalFlows, 
  fetchOperationalFlowDetails,
  createOperationalFlow,
  updateOperationalFlow,
  deleteOperationalFlow,
  duplicateOperationalFlow,
  fetchJobDependencies,
  addJobDependency,
  removeJobDependency
} from "@/lib/operational-flows-api";
import { fetchCustomRoles } from "@/lib/permissions-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  canEdit: boolean;
}

export function OperationalFlowsManager({ canEdit }: Props) {
  const qc = useQueryClient();
  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["operational-flows"],
    queryFn: fetchOperationalFlows,
  });

  const [viewMode, setViewMode] = useState<'cards' | 'builder'>('cards');

  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["operational-flows"] });

  const delMut = useMutation({
    mutationFn: deleteOperationalFlow,
    onSuccess: () => {
      toast.success("Fluxo excluído");
      invalidate();
      if (selectedFlow) setSelectedFlow(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMut = useMutation({
    mutationFn: duplicateOperationalFlow,
    onSuccess: () => {
      toast.success("Fluxo duplicado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="size-5 animate-spin text-primary" /></div>;

  if (selectedFlow && viewMode === 'builder') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setViewMode('cards')}>
            <ChevronRight className="size-4 rotate-180 mr-2" /> Voltar para lista
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => duplicateMut.mutate(selectedFlow)}>
              <Copy className="size-4 mr-2" /> Duplicar Fluxo
            </Button>
            <Button size="sm" variant="destructive" onClick={() => {
              if (confirm("Excluir fluxo?")) delMut.mutate(selectedFlow);
            }}>
              <Trash2 className="size-4 mr-2" /> Excluir
            </Button>
          </div>
        </div>
        <FlowEditor flowId={selectedFlow} canEdit={canEdit} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display">Fluxos Operacionais</h2>
          <p className="text-sm text-foreground/50">Padronize a execução dos seus serviços.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={!canEdit} className="gap-2">
          <Plus className="size-4" /> Novo Fluxo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flows.map(flow => (
          <div 
            key={flow.id} 
            onClick={() => {
              setSelectedFlow(flow.id);
              setViewMode('builder');
            }}
            className="bg-surface border border-border rounded-2xl p-6 cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all group relative"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings2 className="size-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="size-8 text-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Excluir o fluxo "${flow.name}"?`)) delMut.mutate(flow.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
                <Badge variant={flow.status === 'active' ? 'default' : 'secondary'}>
                  {flow.status === 'active' ? 'Ativo' : 'Arquivado'}
                </Badge>
              </div>
            </div>
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{flow.name}</h3>
            <p className="text-xs text-foreground/50 mt-1 mb-4 line-clamp-2">{flow.description || "Sem descrição."}</p>
            
            <div className="flex items-center gap-4 text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40 border-t border-border pt-4">
              <span className="flex items-center gap-1.5"><ChevronRight className="size-3" /> Configurar Estrutura</span>
            </div>
          </div>
        ))}
        {flows.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-2xl text-foreground/40 italic">
            Nenhum fluxo cadastrado. Clique em "Novo Fluxo" para começar.
          </div>
        )}
      </div>

      {isCreating && (
        <FlowFormDialog 
          onClose={() => setIsCreating(false)} 
          onSaved={(id) => {
            setIsCreating(false);
            setSelectedFlow(id);
            invalidate();
          }} 
        />
      )}
    </div>
  );
}

function FlowFormDialog({ onClose, onSaved, flow }: { onClose: () => void, onSaved: (id: string) => void, flow?: any }) {
  const [form, setForm] = useState({
    name: flow?.name ?? "",
    description: flow?.description ?? "",
    default_project_name: flow?.default_project_name ?? ""
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (flow) return updateOperationalFlow(flow.id, form);
      return createOperationalFlow(form);
    },
    onSuccess: (data) => {
      toast.success(flow ? "Fluxo atualizado" : "Fluxo criado");
      onSaved(data.id);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{flow ? "Editar Fluxo" : "Novo Fluxo Operacional"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Nome do Fluxo</Label>
            <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Conteúdo Mensal" />
          </div>
          <div className="space-y-1.5">
            <Label>Projeto Padrão</Label>
            <Input value={form.default_project_name} onChange={e => setForm({...form, default_project_name: e.target.value})} placeholder="Ex: Operação Mensal" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={!form.name || mut.isPending}>
            {mut.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FlowEditor({ flowId, canEdit }: { flowId: string, canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["operational-flow-details", flowId],
    queryFn: () => fetchOperationalFlowDetails(flowId),
  });

  const [schemaEditor, setSchemaEditor] = useState<{ open: boolean, job: any }>({ open: false, job: null });

  const { data: roles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: fetchCustomRoles
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["operational-flow-details", flowId] });

  const addStageMut = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('operational_flow_stages')
        .insert({ flow_id: flowId, name, order: stages.length })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message)
  });

  const addJobMut = useMutation({
    mutationFn: async ({ stageId, name, order }: { stageId: string, name: string, order: number }) => {
      const { data, error } = await supabase
        .from('operational_flow_jobs')
        .insert({ stage_id: stageId, name, order })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteStageMut = useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase
        .from('operational_flow_stages')
        .delete()
        .eq('id', stageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa excluída");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="size-5 animate-spin text-primary" /></div>;

  const allJobs = stages.flatMap((s: any) => s.jobs || []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Estrutura do Fluxo</h2>
        <Button size="sm" onClick={() => {
          const name = prompt("Nome da Etapa:");
          if (name) addStageMut.mutate(name);
        }} disabled={!canEdit}>
          <Plus className="size-4 mr-2" /> Adicionar Etapa
        </Button>
      </div>

      <div className="space-y-4">
        {stages.map((stage: any) => (
          <div key={stage.id} className="border border-border rounded-xl bg-surface overflow-hidden">
            <header className="px-4 py-3 bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="size-4 text-foreground/20 cursor-grab" />
                <h3 className="text-sm font-semibold">{stage.name}</h3>
                <Badge variant="outline" className="text-[10px] ml-2">Etapa</Badge>
              </div>
              <div className="flex items-center gap-1">
                 <Button size="icon" variant="ghost" className="size-8 text-foreground/40 hover:text-primary" title="Adicionar Job" onClick={() => {
                   const name = prompt("Nome do Job:");
                   if (name) addJobMut.mutate({ stageId: stage.id, name, order: stage.jobs?.length || 0 });
                 }}>
                   <Plus className="size-4" />
                 </Button>
                 
                 <Button 
                   size="icon" 
                   variant="ghost" 
                   className="size-8 text-foreground/40 hover:text-destructive" 
                   title="Excluir Etapa"
                   onClick={() => {
                     if (confirm(`Deseja excluir a etapa "${stage.name}" e todos os seus jobs?`)) {
                       deleteStageMut.mutate(stage.id);
                     }
                   }}
                 >
                   <Trash2 className="size-4" />
                 </Button>
              </div>
            </header>

            <div className="divide-y divide-border">
              {stage.jobs?.map((job: any) => (
                <JobRow 
                  key={job.id} 
                  job={job} 
                  roles={roles} 
                  canEdit={canEdit} 
                  onChanged={invalidate} 
                  onEditSchema={(job) => setSchemaEditor({ open: true, job })}
                  flowJobs={allJobs.filter((j: any) => j.id !== job.id)}
                />
              ))}
              {(!stage.jobs || stage.jobs.length === 0) && (
                <div className="px-10 py-4 text-xs text-foreground/40 italic">Nenhum job nesta etapa.</div>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-4 py-8 overflow-x-auto scrollbar-none">
          {stages.map((stage: any, i: number) => (
            <div key={stage.id} className="flex items-center shrink-0">
              <div className="bg-surface border border-border rounded-xl px-6 py-4 min-w-[160px] text-center shadow-sm">
                <span className="text-[10px] font-mono-kasa text-primary font-bold uppercase tracking-wider mb-1 block">Etapa {i+1}</span>
                <p className="font-bold text-sm">{stage.name}</p>
              </div>
              {i < stages.length - 1 && <ChevronRight className="size-5 text-foreground/20 mx-2" />}
            </div>
          ))}
        </div>

        {stages.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <p className="text-sm text-foreground/40">Crie a primeira etapa para começar a definir o fluxo.</p>
          </div>
        )}
      </div>

      <Dialog open={schemaEditor.open} onOpenChange={(o) => !o && setSchemaEditor({ open: false, job: null })}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Configurar Formulário: {schemaEditor.job?.name}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <p className="text-xs text-foreground/50">Defina os campos que a equipe deve preencher ao executar este tipo de Job.</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-sm font-semibold">Campos do Formulário</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const currentSchema = schemaEditor.job?.custom_fields_schema || [];
                    const newField = { label: "Novo Campo", type: "text", required: false, options: "" };
                    const next = [...currentSchema, newField];
                    const newJob = { ...schemaEditor.job, custom_fields_schema: next };
                    setSchemaEditor({ ...schemaEditor, job: newJob });
                  }}>
                    <Plus className="size-3 mr-2" /> Novo Campo
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {(schemaEditor.job?.custom_fields_schema || []).map((field: any, idx: number) => (
                  <div key={idx} className="p-3 bg-muted/20 border border-border rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Rótulo (Label)</Label>
                          <Input 
                            value={field.label} 
                            onChange={(e) => {
                              const next = [...schemaEditor.job.custom_fields_schema];
                              next[idx].label = e.target.value;
                              setSchemaEditor({ ...schemaEditor, job: { ...schemaEditor.job, custom_fields_schema: next } });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Tipo de Campo</Label>
                          <select 
                            className="w-full h-8 bg-background border border-input rounded px-2 text-xs focus:ring-0"
                            value={field.type}
                            onChange={(e) => {
                              const next = [...schemaEditor.job.custom_fields_schema];
                              next[idx].type = e.target.value;
                              setSchemaEditor({ ...schemaEditor, job: { ...schemaEditor.job, custom_fields_schema: next } });
                            }}
                          >
                            <option value="text">Texto Curto</option>
                            <option value="textarea">Texto Longo</option>
                            <option value="number">Número</option>
                            <option value="date">Data</option>
                            <option value="time">Hora</option>
                            <option value="select">Seleção</option>
                            <option value="multiselect">Múltipla Escolha</option>
                            <option value="url">URL</option>
                            <option value="file">Upload de Arquivo</option>
                            <option value="currency">Moeda (R$)</option>
                          </select>
                        </div>
                        {field.type === 'select' && (
                          <div className="space-y-1 col-span-2">
                            <Label className="text-[10px]">Opções (separadas por vírgula)</Label>
                            <Input 
                              value={field.options || ""} 
                              onChange={(e) => {
                                const next = [...schemaEditor.job.custom_fields_schema];
                                next[idx].options = e.target.value;
                                setSchemaEditor({ ...schemaEditor, job: { ...schemaEditor.job, custom_fields_schema: next } });
                              }}
                              placeholder="Opção 1, Opção 2, Opção 3"
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                      </div>
                      <Button size="icon" variant="ghost" className="size-8 text-destructive self-end" onClick={() => {
                        const next = schemaEditor.job.custom_fields_schema.filter((_: any, i: number) => i !== idx);
                        setSchemaEditor({ ...schemaEditor, job: { ...schemaEditor.job, custom_fields_schema: next } });
                      }}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(schemaEditor.job?.custom_fields_schema || []).length === 0 && (
                  <p className="text-center py-6 text-xs text-foreground/40 italic">Nenhum campo configurado. Clique em "Novo Campo" para começar.</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-4 border-t">
              <Label className="text-[10px] text-foreground/40">JSON Avançado (Opcional)</Label>
              <Textarea 
                rows={4} 
                value={JSON.stringify(schemaEditor.job?.custom_fields_schema || [], null, 2)}
                onChange={(e) => {
                  try {
                    const schema = JSON.parse(e.target.value);
                    setSchemaEditor({ ...schemaEditor, job: { ...schemaEditor.job, custom_fields_schema: schema } });
                  } catch (err) {}
                }}
                className="font-mono text-[10px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSchemaEditor({ open: false, job: null })}>Cancelar</Button>
            <Button onClick={async () => {
              try {
                const { error } = await supabase
                  .from('operational_flow_jobs')
                  .update({ custom_fields_schema: schemaEditor.job.custom_fields_schema })
                  .eq('id', schemaEditor.job.id);
                if (error) throw error;
                toast.success("Formulário salvo com sucesso!");
                setSchemaEditor({ open: false, job: null });
                invalidate();
              } catch (e: any) {
                toast.error("Erro ao salvar: " + e.message);
              }
            }}>Salvar Formulário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobRow({ job, roles, canEdit, onChanged, onEditSchema, flowJobs }: { job: any, roles: any[], canEdit: boolean, onChanged: () => void, onEditSchema: (job: any) => void, flowJobs: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeps, setShowDeps] = useState(false);

  const { data: deps = [], refetch: refetchDeps } = useQuery({
    queryKey: ["job-deps", job.id],
    queryFn: () => fetchJobDependencies(job.id),
    enabled: showDeps
  });

  const addDepMut = useMutation({
    mutationFn: (dependsOnId: string) => addJobDependency(job.id, dependsOnId),
    onSuccess: () => {
      toast.success("Dependência adicionada");
      refetchDeps();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const removeDepMut = useMutation({
    mutationFn: (id: string) => removeJobDependency(id),
    onSuccess: () => {
      toast.success("Dependência removida");
      refetchDeps();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const updateJobMut = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase
        .from('operational_flow_jobs')
        .update(patch)
        .eq('id', job.id);
      if (error) throw error;
    },
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message)
  });

  const addChecklistMut = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from('operational_flow_checklists')
        .insert({ flow_job_id: job.id, item_text: text, order: job.checklists?.length || 0 });
      if (error) throw error;
    },
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteJobMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('operational_flow_jobs').delete().eq('id', job.id);
      if (error) throw error;
    },
    onSuccess: onChanged
  });

  return (
    <div className="group">
      <div className="px-4 py-3 flex items-center gap-4 hover:bg-muted/10 transition-colors">
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-foreground/40 hover:text-foreground">
          {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{job.name}</p>
          <div className="mt-1">
            <select
              className="bg-transparent border-none text-[10px] focus:ring-0 p-0 text-primary font-semibold uppercase tracking-wider"
              value={job.job_type || ""}
              onChange={e => updateJobMut.mutate({ job_type: e.target.value || null })}
            >
              <option value="">Tipo: Não definido</option>
              {JOB_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>


        <div className="flex items-center gap-6">
          <Button size="icon" variant="ghost" className="size-8" title="Configurar Formulário da Tarefa" onClick={() => onEditSchema(job)}>
            <FileText className="size-3.5" />
          </Button>

          <Button size="icon" variant="ghost" className={`size-8 ${showDeps ? "text-primary" : ""}`} title="Configurar Dependências" onClick={() => setShowDeps(!showDeps)}>
            <ArrowDown className="size-3.5" />
          </Button>

          <div className="flex items-center gap-2 text-foreground/50">
            <Clock className="size-3.5" />
            <input 
              type="number" 
              className="w-12 bg-transparent border-none text-xs focus:ring-0 p-0"
              value={job.sla_days || 0}
              onChange={e => updateJobMut.mutate({ sla_days: parseInt(e.target.value) || 0 })}
            />
            <span className="text-[10px]">dias</span>
          </div>

          <div className="w-40">
            <select
              className="w-full bg-transparent border-none text-xs focus:ring-0 p-0 text-foreground/50"
              value={job.default_assignee_role_id || ""}
              onChange={e => updateJobMut.mutate({ default_assignee_role_id: e.target.value || null })}
            >
              <option value="">Sem resp.</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          <Button 
            size="icon" 
            variant="ghost" 
            className="size-8 text-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            title="Excluir Job"
            onClick={() => {
              if (confirm(`Excluir job "${job.name}"?`)) deleteJobMut.mutate();
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {showDeps && (
        <div className="px-12 pb-4 pt-2 space-y-3 bg-primary/5 border-b border-primary/10">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1">
                <ArrowDown className="size-3" /> Dependências (Bloqueia execução)
              </Label>
              <select 
                className="h-7 bg-background border border-border rounded px-2 text-[10px] focus:ring-0"
                onChange={(e) => e.target.value && addDepMut.mutate(e.target.value)}
                value=""
              >
                <option value="">Adicionar dependência...</option>
                {flowJobs.map((fj: any) => (
                  <option key={fj.id} value={fj.id} disabled={deps.some((d: any) => d.depends_on_job_id === fj.id)}>
                    {fj.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {deps.map((dep: any) => {
                const depJob = flowJobs.find((fj: any) => fj.id === dep.depends_on_job_id);
                return (
                  <Badge key={dep.id} variant="secondary" className="text-[10px] gap-1 pr-1">
                    {depJob?.name || "Job removido"}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="size-3.5 hover:bg-transparent" 
                      onClick={() => removeDepMut.mutate(dep.id)}
                    >
                      <X className="size-2" />
                    </Button>
                  </Badge>
                );
              })}
              {deps.length === 0 && (
                <p className="text-[10px] text-foreground/30 italic">Nenhuma dependência definida.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="px-12 pb-4 pt-2 space-y-3 bg-muted/5">
          <div className="space-y-2">
             <div className="flex items-center justify-between">
               <Label className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold flex items-center gap-1">
                 <CheckSquare className="size-3" /> Checklist Padrão
               </Label>
               <Button size="icon" variant="ghost" className="size-6" onClick={() => {
                 const text = prompt("Item do checklist:");
                 if (text) addChecklistMut.mutate(text);
               }}>
                 <Plus className="size-3" />
               </Button>
             </div>
             <div className="space-y-1">
               {job.checklists?.map((item: any) => (
                 <div key={item.id} className="flex items-center gap-2 group/item">
                   <div className="size-1.5 rounded-full bg-foreground/20" />
                   <span className="text-xs text-foreground/60 flex-1">{item.item_text}</span>
                   <Button 
                     size="icon" 
                     variant="ghost" 
                     className="size-5 opacity-0 group-hover/item:opacity-100"
                     onClick={async () => {
                       await supabase.from('operational_flow_checklists').delete().eq('id', item.id);
                       onChanged();
                     }}
                   >
                     <Trash2 className="size-3" />
                   </Button>
                 </div>
               ))}
               {(!job.checklists || job.checklists.length === 0) && (
                 <p className="text-[10px] text-foreground/30 italic">Nenhum item definido.</p>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
