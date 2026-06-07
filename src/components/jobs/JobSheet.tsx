import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Trash2, Plus, Send, FileText, CheckSquare, Paperclip, MessageSquare, History, CheckCircle2, User, X, Clock, AlertCircle, FileUp, Loader2, ExternalLink, Eye, ChevronDown, AtSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Realtime mentions and typing indicator
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionCoords, setMentionCoords] = useState({ top: 0, left: 0 });
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    const channel = supabase.channel(`job-room-${job.id}`);
    
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_checklist', filter: `job_id=eq.${job.id}` }, () => qc.invalidateQueries({ queryKey: ["job-checklist", job.id] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_comments', filter: `job_id=eq.${job.id}` }, () => qc.invalidateQueries({ queryKey: ["job-comments", job.id] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_history', filter: `job_id=eq.${job.id}` }, () => qc.invalidateQueries({ queryKey: ["job-history", job.id] }))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${job.id}` }, () => qc.invalidateQueries({ queryKey: ["jobs"] }))
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: string[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.is_typing) users.push(p.user_name);
          });
        });
        setTypingUsers([...new Set(users)]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          const profile = team.find(p => p.id === user?.id);
          await channel.track({
            user_id: user?.id,
            user_name: profile?.display_name || profile?.full_name || 'Usuário',
            is_typing: false
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [job?.id, qc, team]);

  const handleTyping = useCallback(async (isTyping: boolean) => {
    if (!job?.id) return;
    const channel = supabase.getChannels().find(c => c.topic === `realtime:job-room-${job.id}`);
    if (channel) {
      const { data: { user } } = await supabase.auth.getUser();
      const profile = team.find(p => p.id === user?.id);
      channel.track({
        user_id: user?.id,
        user_name: profile?.display_name || profile?.full_name || 'Usuário',
        is_typing: isTyping
      });
    }
  }, [job?.id, team]);

  useEffect(() => {
    if (comment.length > 0) {
      handleTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 3000);
    } else {
      handleTyping(false);
    }
  }, [comment, handleTyping]);

  useEffect(() => {
    if (job) {
      setTitle(job.title);
      setObservations((job as any).operational_observations || "");
    }
  }, [job?.id]);

  // Scroll to bottom when comments change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [comments, attachments]);

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

      await addJobAttachment({
        job_id: job.id,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size
      });

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
      setComment("");
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

  const totalStages = checklist.length;
  const completedStages = checklist.filter(c => c.done).length;
  const progressPercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent key={job.id} className="bg-surface border-border w-full p-0 sm:max-w-[1000px] overflow-hidden flex flex-col">
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Details */}
          <div className="flex-1 flex flex-col border-r border-border overflow-y-auto">
            <div className="p-6 space-y-8 pb-12">
              <SheetHeader className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="size-5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Gestão de Job</span>
                </div>
                <SheetTitle className="font-display text-2xl lg:text-3xl">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => title !== job.title && updateMut.mutate({ title })}
                    className="bg-transparent border-none outline-none w-full focus:ring-0 p-0 h-auto font-display text-white"
                    placeholder="Título do job"
                  />
                </SheetTitle>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
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

              <Accordion type="multiple" className="w-full space-y-4">
                <AccordionItem value="execution" className="border border-border rounded-xl px-4 bg-muted/5 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="size-4 text-primary" />
                      <span className="text-sm font-bold uppercase tracking-wider">Execução</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-6 pb-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] text-foreground/40 uppercase tracking-tighter">Progresso operacional</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">{progressPercent}%</div>
                          <div className="text-[10px] text-foreground/40 font-mono">{completedStages} de {totalStages} concluídas</div>
                        </div>
                      </div>
                      <Progress value={progressPercent} className="h-2.5 bg-muted" />
                      
                      <div className="space-y-2 mt-4">
                        {checklist.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 group py-1.5 px-2 hover:bg-background/50 rounded-lg transition-all">
                            <Checkbox
                              checked={item.done}
                              onCheckedChange={(v) => toggleItemMut.mutate({ id: item.id, done: !!v })}
                              className="size-5"
                            />
                            <span className={`flex-1 text-sm ${item.done ? "line-through text-foreground/40" : "font-medium text-foreground"}`}>
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
                        rows={4}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        onBlur={() => observations !== (job as any).operational_observations && updateMut.mutate({ operational_observations: observations } as any)}
                        placeholder="Registros internos da equipe..."
                        className="bg-background text-sm leading-relaxed border-border min-h-[100px]"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="history" className="border border-border rounded-xl px-4 bg-muted/5 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-2">
                      <History className="size-4 text-primary" />
                      <span className="text-sm font-bold uppercase tracking-wider">Histórico</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="space-y-4">
                      {history.map((h: any) => (
                        <div key={h.id} className="flex gap-4 items-start border-l-2 border-muted pl-6 py-1 relative">
                          <div className="size-3 rounded-full bg-muted absolute left-[-7.5px] top-2 border-2 border-background" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-foreground/80">
                              {h.action}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-foreground/40 font-mono uppercase">
                                {format(new Date(h.created_at), "dd MMM yyyy · HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {history.length === 0 && (
                        <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest text-center py-4">Nenhum histórico registrado</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="pt-6 border-t border-border flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirm("Tem certeza que deseja remover este job permanentemente?") && deleteMut.mutate()}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-[10px] font-bold uppercase tracking-widest h-9 px-3 rounded-lg"
                >
                  <Trash2 className="size-3.5 mr-2" /> Excluir job
                </Button>
                <div className="flex flex-col items-end opacity-20">
                  <span className="text-[9px] font-mono font-bold">
                    UUID: {job.id}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Communication */}
          <div className="w-[400px] flex flex-col bg-muted/5">
            <div className="p-6 border-b border-border flex items-center gap-2 shrink-0">
              <MessageSquare className="size-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Comunicação</h3>
            </div>

            <ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
              <div className="py-6 space-y-6">
                {communicationTimeline.map((item, idx) => {
                  const user = team.find(p => p.id === item.user_id);
                  const userName = item.is_system ? "Sistema" : (user?.display_name || user?.full_name || "Usuário");
                  
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-bold text-foreground/60">{userName}</span>
                        <span className="text-[9px] text-foreground/30 font-mono">
                          {format(new Date(item.created_at), "HH:mm", { locale: ptBR })}
                        </span>
                      </div>

                      <div className={`text-sm p-3 rounded-2xl border ${
                        item.type === 'attachment' ? 'bg-blue-50/5 border-blue-500/20 text-blue-100' : 'bg-background border-border/50 text-foreground'
                      }`}>
                        {item.type === 'attachment' || item.file_url ? (
                          <div className="space-y-3">
                            {item.content && !item.content.startsWith('Anexou um arquivo:') && (
                              <p className="whitespace-pre-wrap leading-relaxed text-xs">
                                {item.content.split(/(@\w+)/).map((part, i) => 
                                  part.startsWith('@') ? (
                                    <span key={i} className="text-primary font-bold">{part}</span>
                                  ) : part
                                )}
                              </p>
                            )}
                            <div className="flex items-center justify-between gap-2 bg-white/5 p-2 rounded-xl border border-blue-500/10">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="size-4 text-blue-400 shrink-0" />
                                <p className="font-bold text-blue-200 truncate text-[10px]">{item.metadata?.file_name || "Anexo"}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="size-6 hover:bg-primary/20 hover:text-primary transition-colors"
                                  onClick={() => setViewerConfig({ url: item.file_url!, name: item.metadata?.file_name || "Anexo" })}
                                >
                                  <Eye className="size-3" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="size-6 hover:bg-blue-500/20 hover:text-blue-400 transition-colors" 
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
                                  <FileUp className="size-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed text-xs">
                            {item.content.split(/(@\w+)/).map((part, i) => 
                              part.startsWith('@') ? (
                                <span key={i} className="text-primary font-bold">{part}</span>
                              ) : part
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {communicationTimeline.length === 0 && (
                  <div className="text-center py-12 space-y-3 opacity-20">
                    <MessageSquare className="size-10 text-muted mx-auto" />
                    <p className="text-[10px] uppercase font-bold tracking-widest">Sem mensagens</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-6 pt-2 border-t border-border shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (comment.trim()) {
                    commentMut.mutate({ content: comment.trim() });
                  }
                }}
              >
                <div className="flex flex-col gap-2 p-3 bg-background border border-border rounded-xl focus-within:border-primary/50 transition-colors">
                  <Textarea
                    rows={2}
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
                    className="resize-none border-none bg-transparent focus-visible:ring-0 p-0 text-xs min-h-[50px] text-white"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="size-7 text-foreground/40 hover:text-primary hover:bg-primary/10"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? <Loader2 className="size-3 animate-spin" /> : <Paperclip className="size-3" />}
                      </Button>
                    </div>
                    <Button 
                      type="submit" 
                      size="sm" 
                      className="h-8 gap-2 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider"
                      disabled={!comment.trim() || commentMut.isPending}
                    >
                      {commentMut.isPending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
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
          </div>
        </div>

        <AttachmentViewer
          url={viewerConfig?.url || null}
          fileName={viewerConfig?.name || ""}
          isOpen={!!viewerConfig}
          onClose={() => setViewerConfig(null)}
        />
      </SheetContent>
    </Sheet>
  );
}
