import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  addChecklistItem,
  addJobComment,
  deleteChecklistItem,
  deleteJob,
  fetchChecklist,
  fetchJobComments,
  toggleChecklistItem,
  updateJob,
  fetchJobHistory,
  fetchJobAttachments,
  addJobAttachment,
  JOB_STATUS_LABELS,
  type Job,
  type JobStage,
  fetchClients,
  fetchProjects,
} from "@/lib/ops-api";
import { fetchProfiles } from "@/lib/profile-api";
import { Trash2, Plus, Send, FileText, CheckSquare, Paperclip, MessageSquare, History, CheckCircle2, User, X, Clock, AlertCircle, FileUp, Loader2, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AttachmentViewer } from "@/components/AttachmentViewer";


export function JobSheet({
  job,
  onClose,
}: {
  job: Job | null;
  stages: JobStage[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const open = !!job;
  const [draft, setDraft] = useState("");
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState(job?.title || "");
  const [observations, setObservations] = useState((job as any)?.operational_observations || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerConfig, setViewerConfig] = useState<{ url: string; name: string } | null>(null);


  const { data: checklist = [] } = useQuery({
    queryKey: ["job-checklist", job?.id],
    queryFn: () => fetchChecklist(job!.id),
    enabled: !!job,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["job-comments", job?.id],
    queryFn: () => fetchJobComments(job!.id),
    enabled: !!job,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["job-history", job?.id],
    queryFn: () => fetchJobHistory(job!.id),
    enabled: !!job,
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["job-attachments", job?.id],
    queryFn: () => fetchJobAttachments(job!.id),
    enabled: !!job,
  });

  const { data: team = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const { data: servicesData = [] } = useQuery({ queryKey: ["services", "active"], queryFn: async () => {
    const { data } = await supabase.from("services").select("*").eq("is_active", true);
    return data || [];
  }});
  const services = servicesData as any[];

  useEffect(() => {
    if (!job?.id) return;

    const channels = [
      supabase.channel(`job-checklist-${job.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'job_checklist', filter: `job_id=eq.${job.id}` }, () => qc.invalidateQueries({ queryKey: ["job-checklist", job.id] })),
      supabase.channel(`job-comments-${job.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'job_comments', filter: `job_id=eq.${job.id}` }, () => qc.invalidateQueries({ queryKey: ["job-comments", job.id] })),
      supabase.channel(`job-history-${job.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'job_history', filter: `job_id=eq.${job.id}` }, () => qc.invalidateQueries({ queryKey: ["job-history", job.id] })),
      supabase.channel(`job-updates-${job.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${job.id}` }, () => qc.invalidateQueries({ queryKey: ["jobs"] }))
    ];

    channels.forEach(c => c.subscribe());

    return () => {
      channels.forEach(c => supabase.removeChannel(c));
    };
  }, [job?.id, qc]);

  useEffect(() => {
    if (job) {
      setTitle(job.title);
      setObservations((job as any).operational_observations || "");
    }
  }, [job?.id]);

  const updateMut = useMutation({
    mutationFn: (patch: Partial<Job>) => {
      const cleanPatch = Object.entries(patch).reduce((acc, [key, value]) => {
        acc[key] = value === "" ? null : value;
        return acc;
      }, {} as any);
      return updateJob(job!.id, cleanPatch);
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["jobs"] });
      await qc.cancelQueries({ queryKey: ["job", job!.id] });
      
      const prev = qc.getQueryData<Job[]>(["jobs"]);
      
      // Update ALL queries starting with "jobs" (board, list, etc)
      qc.setQueriesData({ queryKey: ["jobs"] }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((j) => (j.id === job!.id ? { ...j, ...patch } : j));
        }
        return old;
      });
      
      return { prev };
    },
    onSuccess: (updatedJob) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", job!.id] });
      toast.success("Job atualizado");
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["jobs"], ctx.prev);
      toast.error(e.message);
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !job) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${job.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('job-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('job-attachments')
        .getPublicUrl(filePath);

      // Add to attachments table
      await addJobAttachment({
        job_id: job.id,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size
      });

      // Add as a comment with file info
      await addJobComment(job.id, `Anexou um arquivo: ${file.name}`, 'comment', { 
        file_name: file.name, 
        file_url: publicUrl 
      });

      qc.invalidateQueries({ queryKey: ["job-attachments", job.id] });
      qc.invalidateQueries({ queryKey: ["job-comments", job.id] });
      toast.success("Arquivo enviado com sucesso!");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteMut = useMutation({
    mutationFn: () => deleteJob(job!.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["jobs"] });
      const prev = qc.getQueryData<Job[]>(["jobs"]);
      qc.setQueryData<Job[]>(["jobs"], (old) => (old ?? []).filter((j) => j.id !== job!.id));
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job removido");
      onClose();
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["jobs"], ctx.prev);
      toast.error(e.message);
    },
  });

  const addItemMut = useMutation({
    mutationFn: (content: string) => addChecklistItem(job!.id, content),
    onMutate: async (content) => {
      const qk = ["job-checklist", job!.id];
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<any[]>(qk);
      const tempId = Math.random().toString(36).substring(7);
      const newItem = { id: tempId, job_id: job!.id, content, done: false, order_index: (prev?.length || 0) + 1 };
      qc.setQueryData<any[]>(qk, (old) => [...(old ?? []), newItem]);
      setDraft("");
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-checklist", job!.id] });
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["job-checklist", job!.id], ctx.prev);
    }
  });

  const toggleItemMut = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleChecklistItem(id, done),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ["job-checklist", job!.id] });
      const prev = qc.getQueryData<any[]>(["job-checklist", job!.id]);
      qc.setQueryData<any[]>(["job-checklist", job!.id], (old) =>
        (old ?? []).map((item) => (item.id === id ? { ...item, done } : item)),
      );
      
      // Update job progress optimistically in all job queries
      qc.setQueriesData({ queryKey: ["jobs"] }, (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map(j => {
          if (j.id === job!.id) {
            const currentChecklist = prev || [];
            const newChecklist = currentChecklist.map(it => it.id === id ? { ...it, done } : it);
            const total = newChecklist.length;
            const completed = newChecklist.filter(it => it.done).length;
            return {
              ...j,
              completed_steps: completed,
              total_steps: total,
              progress_percentage: total > 0 ? Math.round((completed / total) * 100) : 0
            };
          }
          return j;
        });
      });

      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-checklist", job!.id] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["job-checklist", job!.id], ctx.prev);
    }
  });

  const delItemMut = useMutation({
    mutationFn: (id: string) => deleteChecklistItem(id),
    onMutate: async (id) => {
      const qk = ["job-checklist", job!.id];
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<any[]>(qk);
      qc.setQueryData<any[]>(qk, (old) => (old ?? []).filter(it => it.id !== id));
      return { prev };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-checklist", job!.id] }),
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["job-checklist", job!.id], ctx.prev);
    }
  });

  const commentMut = useMutation({
    mutationFn: ({ content, type, metadata, isSystem }: { content: string; type?: string; metadata?: any; isSystem?: boolean }) => 
      addJobComment(job!.id, content, type, metadata, isSystem),
    onMutate: async ({ content, type, isSystem }) => {
      const qk = ["job-comments", job!.id];
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<any[]>(qk);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const tempId = Math.random().toString(36).substring(7);
      const newComment = {
        id: tempId,
        job_id: job!.id,
        user_id: user?.id,
        content,
        type: type || 'comment',
        is_system: isSystem || false,
        created_at: new Date().toISOString(),
        mentions: []
      };
      
      qc.setQueryData<any[]>(qk, (old) => [...(old ?? []), newComment]);
      setComment(""); // Clear immediately for better feel
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-comments", job!.id] });
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["job-comments", job!.id], ctx.prev);
      toast.error("Erro ao enviar mensagem");
    }
  });

  // Unificar timeline de comunicação - moved up to avoid hook order violation
  const communicationTimeline = useMemo(() => {
    if (!job) return [];
    return [
      ...comments.map(c => ({ 
        id: `comment-${c.id}`, 
        type: (c as any).type || 'comment', 
        content: c.content, 
        user_id: c.user_id, 
        created_at: c.created_at, 
        is_system: (c as any).is_system,
        metadata: (c as any).metadata,
        file_url: (c as any).metadata?.file_url || undefined
      })),
      ...attachments.map(a => ({ 
        id: `attach-${a.id}`, 
        type: 'attachment', 
        content: `Arquivo enviado: ${a.file_name}`, 
        user_id: a.user_id, 
        created_at: a.created_at, 
        is_system: false,
        metadata: { file_name: a.file_name, file_url: a.file_url },
        file_url: a.file_url || undefined
      }))
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [comments, attachments, job]);

  if (!job) return null;

  // Calcular progresso automaticamente
  const totalStages = (job as any).total_steps || checklist.length;
  const completedStages = (job as any).completed_steps || checklist.filter(c => c.done).length;
  const progressPercent = (job as any).progress_percentage || (totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent key={job.id} className="bg-surface border-border w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Gestão de Job</span>
          </div>
          <SheetTitle className="font-display text-2xl lg:text-3xl">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title !== job.title && updateMut.mutate({ title })}
              className="bg-transparent border-none outline-none w-full focus:ring-0 p-0 h-auto"
            />
          </SheetTitle>
        </SheetHeader>

        <div className="mt-8">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="w-full grid grid-cols-4 bg-muted/20 p-1 rounded-xl">
              <TabsTrigger value="general" className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Geral</TabsTrigger>
              <TabsTrigger value="execution" className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Execução</TabsTrigger>
              <TabsTrigger value="communication" className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Comunicação</TabsTrigger>
              <TabsTrigger value="history" className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">Status</Label>
                  <Select
                    value={(job as any).status || "not_started"}
                    onValueChange={(v) => {
                      updateMut.mutate({ 
                        status: v,
                        done_at: v === 'done' ? new Date().toISOString() : null
                      } as any);
                    }}
                  >
                    <SelectTrigger className="h-10 bg-background/50 border-border">
                      {updateMut.isPending && updateMut.variables?.status ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="size-3 animate-spin" />
                          <span>Atualizando...</span>
                        </div>
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(JOB_STATUS_LABELS).map(([val, { label }]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">Prioridade</Label>
                  <Select
                    value={job.priority}
                    onValueChange={(v) => updateMut.mutate({ priority: v })}
                  >
                    <SelectTrigger className="h-10 bg-background/50 border-border">
                      {updateMut.isPending && updateMut.variables?.priority ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="size-3 animate-spin" />
                          <span>Atualizando...</span>
                        </div>
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">Cliente</Label>
                  <Select
                    value={(job as any).client_id || ""}
                    onValueChange={(v) => updateMut.mutate({ client_id: v } as any)}
                  >
                    <SelectTrigger className="h-10 bg-background/50 border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">Projeto</Label>
                  <Select
                    value={(job as any).project_id || ""}
                    onValueChange={(v) => updateMut.mutate({ project_id: v } as any)}
                  >
                    <SelectTrigger className="h-10 bg-background/50 border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">Serviço</Label>
                  <Select
                    value={(job as any).service_id || ""}
                    onValueChange={(v) => updateMut.mutate({ service_id: v } as any)}
                  >
                    <SelectTrigger className="h-10 bg-background/50 border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {services.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">Responsável Principal</Label>
                  <Select
                    value={(job as any).main_responsible_id || ""}
                    onValueChange={(v) => updateMut.mutate({ main_responsible_id: v } as any)}
                  >
                    <SelectTrigger className="h-10 bg-background/50 border-border gap-2">
                      <User className="size-4 text-foreground/40" />
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {team.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name || p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">Prazo Final</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      defaultValue={job.due_date ?? ""}
                      onBlur={(e) => updateMut.mutate({ due_date: e.target.value || null })}
                      className="h-10 bg-background/50 border-border pr-10"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-foreground/40 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">Equipe Envolvida</Label>
                  <div className="space-y-3">
                    <Select 
                      value="" 
                      onValueChange={(v) => {
                        const current = (job as any).team_involved || [];
                        if (!current.find((m: any) => m.user_id === v)) {
                          updateMut.mutate({ team_involved: [...current, { user_id: v, role: "Membro" }] } as any);
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 bg-background/50 border-border"><SelectValue placeholder="Adicionar membros à equipe..." /></SelectTrigger>
                      <SelectContent>
                        {team.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.display_name || p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2">
                      {((job as any).team_involved || []).map((member: any) => {
                        const p = team.find((x: any) => x.id === member.user_id);
                        return p ? (
                          <div key={member.user_id} className="flex items-center gap-2 bg-muted/50 border border-border px-3 py-1.5 rounded-full text-xs transition-all hover:bg-muted">
                            <span className="font-medium">{p.display_name || p.full_name}</span>
                            <button onClick={() => {
                              const current = (job as any).team_involved || [];
                              updateMut.mutate({ team_involved: current.filter((m: any) => m.user_id !== member.user_id) } as any);
                            }} className="hover:text-destructive transition-colors">
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="execution" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <CheckSquare className="size-4 text-primary" /> Etapas do Job
                    </h3>
                    <p className="text-[10px] text-foreground/40 uppercase tracking-tighter">Acompanhamento de progresso operacional</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">{progressPercent}%</div>
                    <div className="text-[10px] text-foreground/40 font-mono">{completedStages} de {totalStages} concluídas</div>
                  </div>
                </div>
                <Progress value={progressPercent} className="h-2.5 bg-muted" />
                
                <div className="space-y-2 mt-4 bg-muted/10 p-4 rounded-xl border border-border/50">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 group py-1.5 px-2 hover:bg-background/50 rounded-lg transition-all">
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={(v) => toggleItemMut.mutate({ id: item.id, done: !!v })}
                        className="size-5"
                      />
                      <span className={`flex-1 text-sm ${item.done ? "line-through text-foreground/40" : "font-medium"}`}>
                        {item.content}
                      </span>
                      <button
                        onClick={() => delItemMut.mutate(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-destructive transition-all"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (draft.trim()) addItemMut.mutate(draft.trim());
                    }}
                    className="flex gap-2 mt-4"
                  >
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Adicionar nova etapa de execução…"
                      className="h-10 bg-background border-border"
                    />
                    <Button type="submit" size="icon" className="size-10 shrink-0">
                      <Plus className="size-5" />
                    </Button>
                  </form>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-primary" />
                  <Label className="text-xs font-bold uppercase tracking-wider">Observações Operacionais</Label>
                </div>
                <Textarea
                  rows={6}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  onBlur={() => observations !== (job as any).operational_observations && updateMut.mutate({ operational_observations: observations } as any)}
                  placeholder="Registros internos da equipe sobre a execução, intercorrências ou solicitações pontuais..."
                  className="bg-muted/5 text-sm leading-relaxed border-border min-h-[150px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="communication" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" /> Timeline de Comunicação
                </h3>
              </div>

              <ScrollArea className="h-[450px] w-full pr-4 rounded-xl border border-border/50 bg-muted/5 p-4">
                <div className="space-y-6">
                  {communicationTimeline.map((item, idx) => {
                    const user = team.find(p => p.id === item.user_id);
                    const userName = item.is_system ? "Sistema" : (user?.display_name || user?.full_name || "Usuário");
                    
                    return (
                      <div key={item.id} className="relative pl-8">
                        {idx !== communicationTimeline.length - 1 && (
                          <div className="absolute left-[11px] top-7 bottom-[-24px] w-[2px] bg-border" />
                        )}
                        
                        <div className={`absolute left-0 top-1.5 size-6 rounded-full border-2 border-background flex items-center justify-center ${
                          item.type === 'attachment' ? 'bg-blue-500' : 'bg-primary'
                        }`}>
                          {item.type === 'attachment' ? <Paperclip className="size-3 text-white" /> : <MessageSquare className="size-3 text-white" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-foreground">{userName}</span>
                            <span className="text-[10px] text-foreground/30 font-mono">
                              {format(new Date(item.created_at), "dd MMM · HH:mm", { locale: ptBR })}
                            </span>
                          </div>

                          <div className={`text-sm p-4 rounded-2xl shadow-sm border ${
                            item.type === 'attachment' ? 'bg-blue-50/50 border-blue-100' : 'bg-background border-border/50'
                          }`}>
                            {item.type === 'attachment' || item.file_url ? (
                              <div className="space-y-3">
                                {item.content && !item.content.startsWith('Anexou um arquivo:') && (
                                  <p className="whitespace-pre-wrap leading-relaxed">{item.content}</p>
                                )}
                                <div className="flex items-center justify-between gap-4 bg-white/50 p-3 rounded-xl border border-blue-100/50">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                      <FileText className="size-5 text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-blue-900 truncate text-xs">{item.metadata?.file_name || "Anexo"}</p>
                                      <p className="text-[9px] text-blue-600 uppercase font-bold tracking-wider">Arquivo anexado</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button 
                                      size="icon" 
                                      variant="outline" 
                                      title="Visualizar" 
                                      className="size-8 hover:bg-primary hover:text-white transition-colors"
                                      onClick={() => setViewerConfig({ url: item.file_url!, name: item.metadata?.file_name || "Anexo" })}
                                    >
                                      <Eye className="size-4" />
                                    </Button>

                                    <Button 
                                      size="icon" 
                                      variant="outline" 
                                      title="Baixar"
                                      className="size-8 hover:bg-blue-500 hover:text-white transition-colors" 
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = item.file_url || '';
                                        link.download = item.metadata?.file_name || 'arquivo';
                                        link.target = '_blank';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                    >
                                      <FileUp className="size-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap leading-relaxed">{item.content}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {communicationTimeline.length === 0 && (
                    <div className="text-center py-12 space-y-3">
                      <MessageSquare className="size-12 text-muted mx-auto opacity-20" />
                      <p className="text-sm text-foreground/40">Inicie uma conversa ou anexe arquivos para este job.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="relative mt-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (comment.trim()) {
                      commentMut.mutate({ content: comment.trim() });
                    }
                  }}
                >
                  <div className="flex flex-col gap-2 p-3 bg-muted/5 border border-border rounded-2xl group focus-within:border-primary/50 transition-colors">
                    <Textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (comment.trim() && !commentMut.isPending) {
                            commentMut.mutate({ content: comment.trim() });
                          }
                        }
                      }}
                      placeholder="Escreva sua mensagem..."
                      className="resize-none border-none bg-transparent focus-visible:ring-0 p-0 text-sm min-h-[80px]"
                    />
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="size-8 text-foreground/40 hover:text-primary hover:bg-primary/10"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                        </Button>
                        <span className="text-[10px] text-foreground/30 italic hidden sm:inline">
                          Shift+Enter para nova linha
                        </span>
                      </div>
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="gap-2 px-4 rounded-xl shadow-lg shadow-primary/20"
                        disabled={!comment.trim() || commentMut.isPending}
                      >
                        {commentMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Enviar
                      </Button>
                    </div>
                  </div>
                </form>
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload}
                />
              </div>
            </TabsContent>

            <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-muted/10 rounded-2xl border border-border/50 p-6 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <History className="size-4 text-primary" /> Registro de Eventos
                  </h3>
                  <p className="text-[10px] text-foreground/40 uppercase tracking-tighter">Eventos automáticos do sistema (somente leitura)</p>
                </div>
                
                <div className="space-y-4">
                  {history.map((h: any) => (
                    <div key={h.id} className="flex gap-4 items-start border-l-2 border-muted pl-6 py-1 relative">
                      <div className="size-3 rounded-full bg-muted absolute left-[-7.5px] top-2 border-2 border-background" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {h.action}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-foreground/40 font-mono uppercase">
                            {format(new Date(h.created_at), "dd MMM yyyy · HH:mm", { locale: ptBR })}
                          </span>
                          {h.from_value && (
                            <span className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded text-foreground/40">
                              De: {h.from_value} → Para: {h.to_value}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                      <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest">Nenhum histórico registrado</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => confirm("Tem certeza que deseja remover este job permanentemente?") && deleteMut.mutate()}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-bold uppercase tracking-widest h-10 px-4 rounded-xl"
            >
              <Trash2 className="size-4 mr-2" /> Excluir job permanentemente
            </Button>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-foreground/20 font-mono font-bold">
                UUID: {job.id}
              </span>
              <span className="text-[10px] text-foreground/20 font-bold uppercase tracking-widest">KASA HUB · OPERATIONAL UNIT</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

