import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createJob, createProject, fetchClients, fetchProjects, type JobStage, type Job } from "@/lib/ops-api";
import { listProductsByClient } from "@/lib/launch-grids-api";

import { JOBS_QUERY_KEY } from "./JobsBoard";
import { fetchPartners } from "@/lib/partners-api";
import { fetchProfiles } from "@/lib/profile-api";
import { fetchServices } from "@/lib/services-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DynamicJobForm } from "./DynamicJobForm";
import { X, AlertCircle } from "lucide-react";
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

export function NewJobDialog({
  stage,
  open,
  onOpenChange,
  defaultProjectId,
  defaultClientId,
  defaultPeriod,
  defaultDmeId,
  defaultContractId,
  defaultTitle,
  defaultDescription,
  defaultDueDate,
  defaultLaunchProductId,
  lockLaunchProduct,
  onCreated,
}: {
  stage: JobStage | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultProjectId?: string;
  defaultClientId?: string;
  defaultPeriod?: string;
  defaultDmeId?: string;
  defaultContractId?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultDueDate?: string;
  defaultLaunchProductId?: string;
  lockLaunchProduct?: boolean;
  onCreated?: (job: Job) => void;
}) {
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: services = [] } = useQuery({ queryKey: ["services", { onlyActive: true }], queryFn: () => fetchServices({ onlyActive: true }) });
  const { data: team = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });


  const [form, setForm] = useState({
    title: defaultTitle ?? "",
    description: defaultDescription ?? "",
    priority: "normal",
    due_date: defaultDueDate ?? "",
    project_id: defaultProjectId ?? "",
    client_id: defaultClientId ?? "",
    contract_id: defaultContractId ?? "",
    service_id: "",
    period: defaultPeriod ?? "",
    main_responsible_id: "",
    team_involved_ids: [] as string[],
    launch_product_id: defaultLaunchProductId ?? "",
  });

  // Projetos dependem do cliente selecionado (cascade)
  const selectedClientId = form.client_id;
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    isFetching: isFetchingProjects,
    isSuccess: isProjectsSuccess,
    dataUpdatedAt: projectsUpdatedAt,
    error: projectsError,
  } = useQuery({
    queryKey: ["projects", selectedClientId],
    queryFn: async () => {
      console.log("[NewJobDialog] ID do Cliente Selecionado:", selectedClientId);
      try {
        const result = await fetchProjects({ clientId: selectedClientId });
        console.log("[NewJobDialog] Projetos retornados:", result?.length, result);
        return result;
      } catch (e) {
        console.error("[NewJobDialog] Erro ao buscar projetos:", e);
        throw e;
      }
    },
    enabled: !!selectedClientId,
  });

  // Ao trocar de cliente, limpa o projeto selecionado e libera o ref de auto-criação
  useEffect(() => {
    setForm((f) => (f.project_id ? { ...f, project_id: "" } : f));
    autoCreatingProjectRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  // Auto-preenche dados quando um projeto é escolhido
  useEffect(() => {
    if (form.project_id) {
      const p = projects.find((x) => x.id === form.project_id);
      if (p) {
        setForm((f) => ({
          ...f,
          client_id: p.client_id || f.client_id,
          contract_id: p.contract_id || f.contract_id,
          main_responsible_id: f.main_responsible_id || p.responsible_id || p.owner_id || "",
        }));
      }
    }
  }, [form.project_id, projects]);

  // Se o cliente escolhido REALMENTE não tem nenhum projeto (fetch concluído com sucesso e retornou 0),
  // cria um automaticamente. Usamos isSuccess + !isFetching para evitar criar durante a janela de loading.
  const autoCreatingProjectRef = useRef(false);
  useEffect(() => {
    if (
      !selectedClientId ||
      !isProjectsSuccess ||
      isFetchingProjects ||
      projects.length > 0 ||
      autoCreatingProjectRef.current
    ) return;

    autoCreatingProjectRef.current = true;
    (async () => {
      try {
        const client = clients.find((c: any) => c.id === selectedClientId);
        const clientName = (client as any)?.company || (client as any)?.name || "Cliente";
        const created = await createProject({
          name: `Projeto ${clientName}`,
          client_id: selectedClientId,
          status: "active",
          type: "automatic",
        } as any);
        await qc.invalidateQueries({ queryKey: ["projects", selectedClientId] });
        await qc.invalidateQueries({ queryKey: ["projects"] });
        setForm((f) => ({ ...f, project_id: (created as any).id }));
        toast.success(`Projeto "${(created as any).name}" criado automaticamente`);
      } catch (e: any) {
        toast.error(`Não foi possível criar o projeto: ${e?.message || e}`);
      } finally {
        autoCreatingProjectRef.current = false;
      }
    })();
  }, [selectedClientId, isProjectsSuccess, isFetchingProjects, projectsUpdatedAt, projects.length, clients, qc]);




  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        due_date: form.due_date || null,
        project_id: form.project_id || null,
        client_id: form.client_id || null,
        contract_id: form.contract_id || null,
        service_id: form.service_id || null,
        stage_id: stage?.id ?? null,
        period: form.period || null,
        main_responsible_id: form.main_responsible_id || null,
        team_involved: form.team_involved_ids.map(id => ({ user_id: id, role: "Membro" })),
        dme_id: defaultDmeId || null,
        launch_product_id: form.launch_product_id || null,
      };

      const data = await createJob(payload as any);
      return data;
    },
    onMutate: async () => {
      const filters = { 
        projectId: defaultProjectId ?? form.project_id, 
        clientId: defaultClientId ?? form.client_id, 
        serviceId: form.service_id, 
        period: defaultPeriod ?? form.period ?? 'all' 
      };
      const qk = JOBS_QUERY_KEY(filters);
      
      // Also target the global "jobs" key to catch any general views
      const globalQk = ["jobs"];
      
      await qc.cancelQueries({ queryKey: qk });
      await qc.cancelQueries({ queryKey: globalQk });

      const prev = qc.getQueryData<Job[]>(qk);
      const prevGlobal = qc.getQueryData<Job[]>(globalQk);
      
      const tempJob = {
        id: 'temp-' + Math.random().toString(36).substring(7),
        title: form.title,
        priority: form.priority,
        stage_id: stage?.id ?? null,
        project_id: form.project_id,
        client_id: form.client_id,
        created_at: new Date().toISOString(),
        progress_percentage: 0,
        completed_steps: 0,
        total_steps: 0,
        team_involved: form.team_involved_ids.map(id => ({ user_id: id, role: "Membro" })),
      };
      
      qc.setQueryData<Job[]>(qk, (old) => [tempJob as any, ...(old ?? [])]);
      qc.setQueryData<Job[]>(globalQk, (old) => [tempJob as any, ...(old ?? [])]);

      return { prev, prevGlobal, qk, globalQk };
    },
    onSuccess: (job, __, ctx) => {
      // Invalidate both keys to ensure we get real data from DB
      qc.invalidateQueries({ queryKey: ctx?.qk });
      qc.invalidateQueries({ queryKey: ctx?.globalQk });
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      qc.invalidateQueries({ queryKey: ["jobs-by-dme"] });

      toast.success("Job criado");
      onCreated?.(job as Job);
      onOpenChange(false);
      setForm({
        title: "",
        description: "",
        priority: "normal",
        due_date: "",
        project_id: defaultProjectId ?? "",
        client_id: defaultClientId ?? "",
        contract_id: "",
        service_id: "",
        period: defaultPeriod ?? "",
        main_responsible_id: "",
        team_involved_ids: [],
        launch_product_id: defaultLaunchProductId ?? "",
      });
    },
    onError: (e: Error, _, ctx) => {
      if (ctx?.qk && ctx?.prev) qc.setQueryData(ctx.qk, ctx.prev);
      if (ctx?.globalQk && ctx?.prevGlobal) qc.setQueryData(ctx.globalQk, ctx.prevGlobal);
      toast.error(e.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Novo job{stage ? ` · ${stage.name}` : ""}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título do Job</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Criação de Logo" />
          </div>


          <Tabs defaultValue="vinc" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/20">
              <TabsTrigger value="vinc" className="text-xs uppercase font-bold tracking-tighter">Vínculos Obrigatórios</TabsTrigger>
              <TabsTrigger value="resp" className="text-xs uppercase font-bold tracking-tighter">Responsáveis e Prazos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="vinc" className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <Select 
                    value={form.client_id || undefined} 
                    onValueChange={(v) => {
                      setForm(f => ({ ...f, client_id: v, project_id: "" }));
                    }}
                  >
                    <SelectTrigger className={!form.client_id ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione o Cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Projeto</Label>
                  <Select
                    value={form.project_id || undefined}
                    onValueChange={(v) => {
                      const p = projects.find((x) => x.id === v);
                      if (p) {
                        setForm((f) => ({
                          ...f,
                          project_id: v,
                          client_id: p.client_id || f.client_id,
                        }));
                      } else {
                        setForm((f) => ({ ...f, project_id: v }));
                      }
                    }}
                    disabled={!selectedClientId}
                  >
                    <SelectTrigger className={!form.project_id ? "border-destructive" : ""}>
                      <SelectValue
                        placeholder={
                          !selectedClientId
                            ? "Selecione o Cliente primeiro"
                            : isLoadingProjects
                              ? "Carregando projetos..."
                              : projectsError
                                ? "Erro ao carregar projetos"
                                : projects.length === 0
                                  ? "Nenhum projeto encontrado para este cliente"
                                  : "Selecione o Projeto"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {projectsError ? (
                    <p className="text-[10px] font-bold text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      {(projectsError as Error).message}
                    </p>
                  ) : null}
                </div>


                <div className="space-y-1.5">
                  <Label>Serviço Vinculado</Label>
                  <Select value={form.service_id || undefined} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                    <SelectTrigger className={!form.service_id ? "border-destructive" : ""}><SelectValue placeholder="Selecione o Serviço" /></SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="resp" className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={!form.due_date ? "text-red-500" : ""}>Prazo</Label>
                  <Input 
                    type="date" 
                    value={form.due_date} 
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })} 
                    className={!form.due_date ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {!form.due_date && (
                    <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Prazo final é obrigatório
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label>Responsável Principal</Label>
                  <Select value={form.main_responsible_id} onValueChange={(v) => setForm({ ...form, main_responsible_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {team.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name || p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label>Equipe Envolvida</Label>
                  <Select 
                    value="" 
                    onValueChange={(v) => setForm(f => ({ ...f, team_involved_ids: Array.from(new Set([...f.team_involved_ids, v])) }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Adicionar membros..." /></SelectTrigger>
                    <SelectContent>
                      {team.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name || p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.team_involved_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {form.team_involved_ids.map(id => {
                        const member = team.find((x: any) => x.id === id);
                        return member ? (
                          <div key={id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-[10px]">
                            {member.display_name || member.full_name}
                            <button onClick={() => setForm(f => ({ ...f, team_involved_ids: f.team_involved_ids.filter(x => x !== id) }))}>
                              <X className="size-3" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {form.service_id && (
            <div className="mt-2 animate-in fade-in zoom-in-95">
              <DynamicJobForm serviceId={form.service_id} data={{}} onChange={() => {}} />
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.title || !form.project_id || !form.client_id || !form.service_id || !form.due_date}
            className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[100px]"
          >
            {mut.isPending ? "Criando..." : "Criar Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
