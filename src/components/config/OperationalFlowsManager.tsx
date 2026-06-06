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
  FileText
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar - Lista de Fluxos */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Fluxos</h3>
          <Button size="icon" variant="ghost" onClick={() => setIsCreating(true)} disabled={!canEdit}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {flows.map(flow => (
            <button
              key={flow.id}
              onClick={() => setSelectedFlow(flow.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${
                selectedFlow === flow.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground/70"
              }`}
            >
              <span className="truncate">{flow.name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-6 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => duplicateMut.mutate(flow.id)}>
                    <Copy className="size-3.5 mr-2" /> Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Excluir o fluxo "${flow.name}"?`)) delMut.mutate(flow.id);
                    }}
                  >
                    <Trash2 className="size-3.5 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </button>
          ))}
          {flows.length === 0 && (
            <p className="text-xs text-foreground/40 text-center py-4">Nenhum fluxo cadastrado.</p>
          )}
        </div>
      </div>

      {/* Área de Conteúdo - Editor do Fluxo */}
      <div className="lg:col-span-3">
        {selectedFlow ? (
          <FlowEditor flowId={selectedFlow} canEdit={canEdit} />
        ) : (
          <div className="h-full border border-dashed border-border rounded-xl flex flex-col items-center justify-center p-12 text-center space-y-3">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center">
              <Settings2 className="size-6 text-foreground/40" />
            </div>
            <div>
              <p className="font-medium">Nenhum fluxo selecionado</p>
              <p className="text-sm text-foreground/50">Selecione um fluxo ao lado ou crie um novo para começar.</p>
            </div>
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
              <div className="flex items-center gap-2">
                 <Button size="icon" variant="ghost" className="size-8" onClick={() => {
                   const name = prompt("Nome do Job:");
                   if (name) addJobMut.mutate({ stageId: stage.id, name, order: stage.jobs?.length || 0 });
                 }}>
                   <Plus className="size-4" />
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
            className="size-8 text-destructive opacity-0 group-hover:opacity-100"
            onClick={() => confirm(`Excluir job "${job.name}"?`) && deleteJobMut.mutate()}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

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
