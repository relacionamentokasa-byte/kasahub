import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConversionStore } from "@/lib/conversion-store";
import { createJob, createProject, fetchClients, fetchProjects, addJobAttachment, type JobStage, type Job } from "@/lib/ops-api";
import { listProductsByClient } from "@/lib/launch-grids-api";

import { JOBS_QUERY_KEY } from "./JobsBoard";
import { fetchProfiles } from "@/lib/profile-api";
import { fetchServices } from "@/lib/services-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { X, Paperclip, FileUp, Loader2, Briefcase } from "lucide-react";
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
  defaultEditorialPostId,
  defaultCoverUrl,
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
  defaultEditorialPostId?: string;
  defaultCoverUrl?: string;
  lockLaunchProduct?: boolean;
  onCreated?: (job: Job) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: _services = [] } = useQuery({ queryKey: ["services", { onlyActive: true }], queryFn: () => fetchServices({ onlyActive: true }) });
  const { data: team = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "normal",
    due_date: "",
    project_id: "",
    client_id: "",
    contract_id: "",
    service_id: "",
    period: "",
    main_responsible_id: "",
    team_involved_ids: [] as string[],
    launch_product_id: "",
    editorial_post_id: "",
  });

  const { conversionData, clearConversionData } = useConversionStore();
  const initializationRef = useRef(false);

  useEffect(() => {
    if (open) {
      if (initializationRef.current) return;

      setPendingFiles([]);

      if (conversionData) {
        setForm({
          title: conversionData.title,
          description: conversionData.briefing,
          due_date: conversionData.dueDate,
          client_id: conversionData.clientId,
          editorial_post_id: conversionData.sourcePostId,
          project_id: "",
          contract_id: "",
          period: "",
          launch_product_id: "",
          priority: "normal",
          service_id: "",
          main_responsible_id: "",
          team_involved_ids: [],
        });
      } else {
        setForm({
          title: defaultTitle || "",
          description: defaultDescription || "",
          due_date: defaultDueDate || "",
          project_id: defaultProjectId || "",
          client_id: defaultClientId || "",
          contract_id: defaultContractId || "",
          period: defaultPeriod || "",
          launch_product_id: defaultLaunchProductId || "",
          editorial_post_id: defaultEditorialPostId || "",
          priority: "normal",
          service_id: "",
          main_responsible_id: "",
          team_involved_ids: [],
        });
      }

      initializationRef.current = true;
    } else {
      if (initializationRef.current) {
        initializationRef.current = false;
        clearConversionData();
        setPendingFiles([]);
        setForm({
          title: "",
          description: "",
          priority: "normal",
          due_date: "",
          project_id: "",
          client_id: "",
          contract_id: "",
          service_id: "",
          period: "",
          main_responsible_id: "",
          team_involved_ids: [],
          launch_product_id: "",
          editorial_post_id: "",
        });
      }
    }
  }, [open, conversionData, clearConversionData, defaultTitle, defaultDescription, defaultDueDate, defaultClientId, defaultEditorialPostId, defaultProjectId, defaultContractId, defaultPeriod, defaultLaunchProductId]);

  const selectedClientId = form.client_id;
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    isFetching: isFetchingProjects,
    isSuccess: isProjectsSuccess,
    dataUpdatedAt: projectsUpdatedAt,
  } = useQuery({
    queryKey: ["projects", selectedClientId],
    queryFn: async () => {
      try {
        return await fetchProjects({ clientId: selectedClientId });
      } catch (e) {
        console.error("[NewJobDialog] Erro ao buscar projetos:", e);
        throw e;
      }
    },
    enabled: !!selectedClientId,
  });

  const selectedClient = clients.find((c: any) => c.id === selectedClientId) as any;
  const clientHasGrid = !!selectedClient?.has_launch_grid;
  const { data: launchProducts = [] } = useQuery({
    queryKey: ["launch-products-by-client", selectedClientId],
    queryFn: () => listProductsByClient(selectedClientId),
    enabled: !!selectedClientId && clientHasGrid,
  });
  const lockedProduct = (lockLaunchProduct || conversionData?.coverUrl) && form.launch_product_id
    ? (launchProducts.find((p) => p.id === form.launch_product_id)
        ?? { id: form.launch_product_id, name: "Produto vinculado", image_url: conversionData?.coverUrl || null })
    : null;

  useEffect(() => {
    if (!selectedClientId) return;

    setForm((f) => {
      if (initializationRef.current && (conversionData || defaultEditorialPostId)) {
        return f;
      }

      if (isFetchingProjects && projects.length === 0) return f;

      if (f.project_id && projects.some(p => p.id === f.project_id && p.client_id === selectedClientId)) {
        return f;
      }

      if (f.project_id && f.project_id === defaultProjectId) {
        return f;
      }

      return {
        ...f,
        project_id: "",
        launch_product_id: lockLaunchProduct ? f.launch_product_id : "",
      };
    });
    autoCreatingProjectRef.current = false;
  }, [selectedClientId, projects, defaultProjectId, lockLaunchProduct, isFetchingProjects]);

  useEffect(() => {
    if (form.project_id) {
      const p = projects.find((x) => x.id === form.project_id);
      if (p) {
        setForm((f) => ({
          ...f,
          client_id: p.client_id || f.client_id,
          contract_id: p.contract_id || f.contract_id,
        }));
      }
    }
  }, [form.project_id, projects]);

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
        editorial_post_id: form.editorial_post_id || null,
      };

      const data = await createJob(payload as any);

      if (pendingFiles.length > 0 && data?.id) {
        setIsUploadingFiles(true);
        for (const file of pendingFiles) {
          try {
            const ext = file.name.split('.').pop() || 'bin';
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `jobs/${data.id}/${Date.now()}_${safeName}`;

            const { error: uploadError } = await supabase.storage
              .from('job-attachments')
              .upload(path, file, { upsert: false });

            if (uploadError) {
              console.error('[NewJobDialog] Erro ao subir anexo:', uploadError);
              continue;
            }

            const { data: urlData } = supabase.storage
              .from('job-attachments')
              .getPublicUrl(path);

            await addJobAttachment({
              job_id: data.id,
              file_name: file.name,
              file_url: urlData.publicUrl,
              file_type: file.type || ext,
              file_size: file.size,
            });
          } catch (attErr) {
            console.error('[NewJobDialog] Erro processando anexo:', attErr);
          }
        }
        setIsUploadingFiles(false);
      }

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
    onSuccess: async (job, __, ctx) => {
      qc.invalidateQueries({ queryKey: ctx?.qk });
      qc.invalidateQueries({ queryKey: ctx?.globalQk });
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      qc.invalidateQueries({ queryKey: ["jobs-by-dme"] });
      qc.invalidateQueries({ queryKey: ["job-attachments", (job as any).id] });

      if (form.editorial_post_id) {
        const { error: linkError } = await supabase
          .from("editorial_posts")
          .update({
            job_id: (job as any).id,
            status: 'converted'
          } as any)
          .eq("id", form.editorial_post_id);

        if (linkError) {
          console.error("[NewJobDialog] Erro ao vincular post ao job:", linkError);
        }

        qc.invalidateQueries({ queryKey: ["editorial-posts"] });
        toast.success("Job criado e post vinculado com sucesso!");
        navigate({ to: "/calendario-editorial", search: { clientId: form.client_id } as any });
      } else {
        toast.success("Job criado com sucesso!");
      }
      onCreated?.(job as Job);
      onOpenChange(false);
      setPendingFiles([]);
      setForm({
        title: "",
        description: "",
        priority: "normal",
        due_date: "",
        project_id: "",
        client_id: "",
        contract_id: "",
        service_id: "",
        period: "",
        main_responsible_id: "",
        team_involved_ids: [],
        launch_product_id: "",
        editorial_post_id: "",
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Briefcase className="size-5" />
            </div>
            <div className="flex items-center gap-2">
              <span>{form.editorial_post_id ? "Converter Post em Job" : "Novo Job"}</span>
              {stage?.name && (
                <>
                  <span className="text-xs font-normal text-muted-foreground">•</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-mono-kasa bg-primary/10 border border-primary/20 text-primary">
                    {stage.name}
                  </span>
                </>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre um novo job operacional vinculado ao cliente e projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          {/* Título do Job */}
          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Título do Job *
            </Label>
            <Input
              id="job-title-field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Criação de Carrossel para Lançamento"
              className="h-9 text-xs font-medium"
              autoFocus
            />
          </div>

          {/* Imagem de Referência do Calendário */}
          {(conversionData?.coverUrl || defaultCoverUrl) && (
            <div className="space-y-1 p-2.5 rounded-xl border border-border/80 bg-muted/20">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground block font-semibold">
                Imagem de Referência (Calendário)
              </Label>
              <div className="relative w-full aspect-video max-h-36 rounded-lg overflow-hidden border border-border/60 bg-background/50">
                <img
                  src={conversionData?.coverUrl || defaultCoverUrl}
                  alt="Referência"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Cliente e Projeto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Cliente *
              </Label>
              <Select
                value={form.client_id || undefined}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, client_id: v, project_id: "" }));
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o Cliente" />
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

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Projeto Vinculado
              </Label>
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
                disabled={!selectedClientId || isLoadingProjects}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue
                    placeholder={
                      !selectedClientId
                        ? "Selecione o cliente primeiro"
                        : isLoadingProjects
                        ? "Carregando..."
                        : projects.length === 0
                        ? "Nenhum projeto (criará automático)"
                        : "Selecione o Projeto"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Responsável, Prazo e Prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Responsável
              </Label>
              <Select
                value={form.main_responsible_id || undefined}
                onValueChange={(v) => setForm({ ...form, main_responsible_id: v })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o dono" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((p: any) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                      {p.display_name || p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Prazo Final
              </Label>
              <Input
                type="date"
                value={form.due_date ? form.due_date.slice(0, 10) : ""}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="h-9 text-xs font-mono-kasa tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Prioridade
              </Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="h-9 text-xs font-mono-kasa">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs font-mono-kasa">Baixa</SelectItem>
                  <SelectItem value="normal" className="text-xs font-mono-kasa">Normal</SelectItem>
                  <SelectItem value="high" className="text-xs font-mono-kasa">Alta</SelectItem>
                  <SelectItem value="urgent" className="text-xs font-mono-kasa text-destructive">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid de Lançamento se aplicável */}
          {((clientHasGrid && launchProducts.length > 0) || lockLaunchProduct) && (
            <div className="space-y-1 p-3 rounded-xl border border-border/80 bg-muted/10">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                Produto de Lançamento <span className="text-[10px] text-muted-foreground font-normal lowercase">(opcional)</span>
              </Label>
              {lockedProduct ? (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-foreground">{lockedProduct.name}</span>
                  <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Vinculado</span>
                </div>
              ) : (
                <Select
                  value={form.launch_product_id || undefined}
                  onValueChange={(v) => setForm({ ...form, launch_product_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Nenhum (job avulso)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">Nenhum (job avulso)</SelectItem>
                    {launchProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Briefing */}
          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Briefing & Orientações
            </Label>
            <Textarea
              id="job-description-field"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o escopo, orientações e objetivos deste job..."
              className="text-xs resize-y min-h-[90px]"
              rows={4}
            />
          </div>

          {/* Anexos & Arquivos */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Paperclip className="size-3.5 text-primary" />
                Anexos & Referências
                {pendingFiles.length > 0 && (
                  <span className="text-[10px] font-mono-kasa bg-primary/10 text-primary px-1.5 py-0.2 rounded font-medium">
                    {pendingFiles.length}
                  </span>
                )}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-2.5 text-xs font-medium border-border/80 gap-1.5 hover:bg-muted/30"
              >
                <FileUp className="size-3.5" /> Adicionar Arquivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const newFiles = Array.from(e.target.files);
                    setPendingFiles((prev) => [...prev, ...newFiles]);
                    e.target.value = "";
                  }
                }}
              />
            </div>

            {pendingFiles.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {pendingFiles.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border/80 bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="size-3 text-muted-foreground shrink-0" />
                      <span className="truncate text-foreground max-w-[280px] font-mono-kasa text-xs">
                        {f.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono-kasa shrink-0">
                        ({(f.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="size-6 p-0 text-muted-foreground hover:text-destructive hover:bg-transparent"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
            onClick={() => mut.mutate()}
            disabled={mut.isPending || isUploadingFiles || !form.title.trim() || !form.client_id}
            size="sm"
            className="h-9 text-xs font-medium gap-1.5"
          >
            {mut.isPending || isUploadingFiles ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {isUploadingFiles ? "Enviando anexos..." : "Criando..."}
              </>
            ) : form.editorial_post_id ? (
              <>
                <Briefcase className="size-3.5" />
                Converter e Criar Job
              </>
            ) : (
              <>
                <Briefcase className="size-3.5" />
                Criar Job
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
