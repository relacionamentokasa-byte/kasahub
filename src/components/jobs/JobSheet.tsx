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
  duplicateJob,
  fetchChecklist,
  fetchJobComments,
  toggleChecklistItem,
  updateJob,
  fetchJobHistory,
  fetchJobAttachments,
  addJobAttachment,
  updateJobComment,
  deleteJobComment,
  JOB_STATUS_LABELS,
  type Job,
  type JobStage,
  fetchClients,
  fetchProjects,
  updateChecklistItem,
} from "@/lib/ops-api";
import { fetchProfiles } from "@/lib/profile-api";
import { Trash2, Plus, Send, FileText, CheckSquare, Paperclip, MessageSquare, History, CheckCircle2, User, X, Clock, AlertCircle, FileUp, Loader2, ExternalLink, Eye, ChevronDown, AtSign, Pencil, Check, RotateCcw, Trash, Copy } from "lucide-react";
import { handleMentions, notify } from "@/lib/notifications-api";

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
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


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

  // Realtime mentions
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionCoords, setMentionCoords] = useState({ top: 0, left: 0 });
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showVersionsId, setShowVersionsId] = useState<string | null>(null);


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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [job?.id, qc]);


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
    onSuccess: (updatedJob, variables) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", job!.id] });
      
      // Notify team members when status changes
      if (variables.status && job && variables.status !== job.status) {
        const teamInvolved = (job as any).team_involved || [];
        const statusLabel = JOB_STATUS_LABELS[variables.status as keyof typeof JOB_STATUS_LABELS]?.label || variables.status;
        
        teamInvolved.forEach((userId: string) => {
          if (userId === currentUser?.id) return;
          notify({
            userId,
            title: `Job: ${job.title}`,
            description: `Status alterado para: ${statusLabel}`,
            category: "job",
            link: `/jobs?jobId=${job.id}`,
            originType: "job",
            originId: job.id
          }).catch(console.error);
        });
      }

      // Notify if assignee changes
      if (variables.assignee_id && job && variables.assignee_id !== (job as any).assignee_id) {
        notify({
          userId: variables.assignee_id,
          title: "Novo Job Atribuído",
          description: `Você foi atribuído ao job: ${job.title}`,
          category: "job",
          link: `/jobs?jobId=${job.id}`,
          originType: "job",
          originId: job.id
        }).catch(console.error);
      }

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

      // Removido addJobComment manual aqui pois o addJobAttachment já deve disparar a criação 
      // do comentário via trigger no banco ou se for necessário ser manual, deve ser centralizado.
      // Atualmente parece que o addJobAttachment e addJobComment estão criando o mesmo "evento" visual.

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

  const dupMut = useMutation({
    mutationFn: () => duplicateJob(job!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job duplicado");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
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
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      // Use simple toggle function from ops-api
      await toggleChecklistItem(id, done);
      return { id, done };
    },
    onMutate: async ({ id, done }) => {
      // Step 1: Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: ["job-checklist", job!.id] });
      await qc.cancelQueries({ queryKey: ["jobs"] });

      // Step 2: Snapshot the previous value
      const prevChecklist = qc.getQueryData<any[]>(["job-checklist", job!.id]);
      const prevJobs = qc.getQueryData<any[]>(["jobs"]);

      // Step 3: Optimistically update to the new value
      qc.setQueryData<any[]>(["job-checklist", job!.id], (old) =>
        (old ?? []).map((item) => (item.id === id ? { ...item, done } : item))
      );

      // Recalculate progress for UI feedback
      const currentItems = (prevChecklist || []).map(it => it.id === id ? { ...it, done } : it);
      const totalCount = currentItems.length;
      const completedCount = currentItems.filter(it => it.done).length;
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      qc.setQueriesData({ queryKey: ["jobs"] }, (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map(j => (j.id === job!.id ? { 
          ...j, 
          completed_steps: completedCount, 
          total_steps: totalCount, 
          progress_percentage: progress 
        } : j));
      });

      // Return context with snapshots
      return { prevChecklist, prevJobs };
    },
    onError: (err, _variables, context) => {
      // Step 4: Revert to previous state if mutation fails
      if (context?.prevChecklist) {
        qc.setQueryData(["job-checklist", job!.id], context.prevChecklist);
      }
      if (context?.prevJobs) {
        qc.setQueryData(["jobs"], context.prevJobs);
      }
      
      console.error("ERRO COMPLETO DO SUPABASE AO ATUALIZAR CHECKLIST:", err);
      toast.error("Falha ao atualizar checklist");
    },
    onSettled: () => {
      // Step 5: Always refetch after error or success to keep server in sync
      qc.invalidateQueries({ queryKey: ["job-checklist", job!.id] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
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
    mutationFn: async ({ content, type, metadata, isSystem }: { content: string; type?: string; metadata?: any; isSystem?: boolean }) => {
      const result = await addJobComment(job!.id, content, type, metadata, isSystem);
      
      // Handle mentions manually for instant notification if not a system comment
      if (!isSystem && content.includes('@')) {
        const jobTitle = job!.title;
        const jobLink = `/jobs?jobId=${job!.id}`;
        await handleMentions(content, {
          title: jobTitle,
          link: jobLink,
          originType: 'job',
          originId: job!.id
        });
      }
      
      return result;
    },
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
      
      // Auto-focus back to input
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 0);
      
      return { prev };
    },
    onSuccess: (data: any, variables) => {
      qc.invalidateQueries({ queryKey: ["job-comments", job!.id] });
      
      // Notify team members about new comment
      if (!variables.isSystem) {
        const teamInvolved = (job as any).team_involved || [];
        teamInvolved.forEach((userId: string) => {
          // Skip the author of the comment and mentions (already handled in mutationFn)
          if (userId === currentUser?.id) return;
          
          notify({
            userId,
            title: `Novo comentário: ${job!.title}`,
            description: variables.content.substring(0, 100) + (variables.content.length > 100 ? '...' : ''),
            category: "comment",
            link: `/jobs?jobId=${job!.id}`,
            originType: "job",
            originId: job!.id
          }).catch(console.error);
        });
      }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["job-comments", job!.id], ctx.prev);
      toast.error("Erro ao enviar mensagem");
    }
  });

  const updateCommentMut = useMutation({
    mutationFn: ({ id, content }: { id: string, content: string }) => updateJobComment(id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-comments", job!.id] });
      setEditingCommentId(null);
      toast.success("Comentário atualizado");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteCommentMut = useMutation({
    mutationFn: (id: string) => deleteJobComment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-comments", job!.id] });
      toast.success("Comentário excluído");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  const isAdmin = currentUser?.user_metadata?.role === 'admin' || currentUser?.email === 'admin@ops.com'; // Placeholder check

  const communicationTimeline = useMemo(() => {

    if (!job) return [];
    return [
      ...comments.map(c => ({ 
        id: `comment-${c.id}`, 
        commentId: c.id,
        type: (c as any).type || 'comment', 
        content: c.content, 
        user_id: c.user_id, 
        created_at: c.created_at, 
        updated_at: (c as any).updated_at,
        previous_versions: (c as any).previous_versions || [],
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
    <Sheet open={open} onOpenChange={(o) => {
      if (!o) {
        onClose();
      }
    }}>
      <SheetContent key={job.id} className="bg-surface border-border w-full p-0 sm:max-w-[1000px] overflow-hidden flex flex-col h-[100dvh] sm:h-auto [&>button]:hidden sm:[&>button]:inline-flex">
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Left Column: Details (Gestão do Job) */}
          <div className="flex-1 flex flex-col border-r border-border overflow-y-auto order-1 sm:order-1">
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
                    className="bg-transparent border-none outline-none w-full focus:ring-0 p-0 h-auto font-display text-foreground"
                    placeholder="Título do job"
                  />
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                {/* STATUS */}
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Status</Label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:gap-2">
                    {[
                      { id: 'not_started', label: 'Nova Demanda', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50', active: 'bg-zinc-500 text-white border-zinc-500' },
                      { id: 'in_progress', label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', active: 'bg-blue-500 text-white border-blue-500' },
                      { id: 'review', label: 'Em Revisão', color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', active: 'bg-amber-500 text-white border-amber-500' },
                      { id: 'done', label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', active: 'bg-emerald-500 text-white border-emerald-500' },
                      { id: 'paused', label: 'Pausado', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', active: 'bg-orange-500 text-white border-orange-500' }
                    ].map((s) => {
                      const isActive = (job as any).status === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => updateMut.mutate({ status: s.id, done_at: s.id === 'done' ? new Date().toISOString() : null } as any)}
                          className={`px-2.5 py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border transition-all whitespace-nowrap shrink-0 ${
                            isActive ? s.active : `${s.color} hover:bg-opacity-30`
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  {/* PRIORIDADE */}
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Prioridade</Label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:gap-2">
                      {[
                        { id: 'high', label: 'Alta', icon: '🔴', color: 'hover:border-red-500/50', active: 'bg-red-500/20 border-red-500 text-red-500' },
                        { id: 'normal', label: 'Normal', icon: '🟡', color: 'hover:border-yellow-500/50', active: 'bg-yellow-500/20 border-yellow-500 text-yellow-500' },
                        { id: 'low', label: 'Baixa', icon: '🟢', color: 'hover:border-green-500/50', active: 'bg-green-500/20 border-green-500 text-green-500' }
                      ].map((p) => {
                        const isActive = job.priority === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => updateMut.mutate({ priority: p.id })}
                            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 sm:gap-2 h-9 sm:h-10 rounded-lg border border-border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                              isActive ? p.active : `bg-background/50 ${p.color}`
                            }`}
                          >
                            <span>{p.icon}</span>
                            <span>{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PRAZO FINAL */}
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Prazo Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className={`w-full flex items-center justify-between h-10 px-4 rounded-lg border transition-all text-sm group ${!job.due_date ? "border-red-500/50 bg-red-500/5" : "border-border bg-background/50 hover:border-primary/50"}`}>
                          <span className={job.due_date ? "text-foreground" : "text-red-400"}>
                            {job.due_date ? format(new Date(job.due_date + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Prazo obrigatório"}
                          </span>
                          <Clock className={`size-4 transition-colors ${!job.due_date ? "text-red-400" : "text-foreground/40 group-hover:text-primary"}`} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-surface border-border" align="start">
                        <div className="p-3 bg-muted/50 border-b border-border">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Calendário de Entrega</span>
                        </div>
                        <Calendar
                          mode="single"
                          selected={job.due_date ? new Date(job.due_date + 'T12:00:00') : undefined}
                          onSelect={(date: Date | undefined) => updateMut.mutate({ due_date: date ? format(date, 'yyyy-MM-dd') : null })}
                          initialFocus
                          locale={ptBR}
                          className="bg-surface text-foreground"
                        />
                      </PopoverContent>
                    </Popover>
                    {!job.due_date && (
                      <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="size-3" />
                        Prazo final é obrigatório
                      </p>
                    )}
                  </div>

                  {/* CLIENTE */}
                   <div className="space-y-3 col-span-1 sm:col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Cliente</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center gap-3 h-12 px-4 rounded-xl border border-border bg-background/50 hover:border-primary/50 transition-all group">
                          <div className={`size-8 rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0 uppercase shadow-sm ${
                            (clients.find(c => c.id === (job as any).client_id) as any)?.logo_url 
                            ? "" 
                            : ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'][((clients.find(c => c.id === (job as any).client_id)?.id || '0').charCodeAt(0)) % 6]
                          }`}>
                            {(clients.find(c => c.id === (job as any).client_id) as any)?.logo_url ? (
                              <img src={(clients.find(c => c.id === (job as any).client_id) as any)?.logo_url} className="size-full rounded-full object-cover" />
                            ) : (
                              clients.find(c => c.id === (job as any).client_id)?.company?.substring(0, 2) || clients.find(c => c.id === (job as any).client_id)?.name?.substring(0, 2) || "??"
                            )}
                          </div>

                          <div className="flex-1 text-left">
                            <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                              {clients.find(c => c.id === (job as any).client_id)?.company || clients.find(c => c.id === (job as any).client_id)?.name || "Selecionar Cliente"}
                            </p>
                          </div>
                          <ChevronDown className="size-4 text-foreground/40 group-hover:text-primary transition-colors" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] sm:w-[400px] p-0 bg-surface border-border" align="start">
                        <Command className="bg-transparent">
                          <CommandInput placeholder="Buscar cliente..." className="h-12 border-none focus:ring-0 bg-transparent text-foreground" />
                          <CommandList className="max-h-[300px]">
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              {clients.map((c) => (
                                <CommandItem
                                  key={c.id}
                                  value={c.company || c.name}
                                  onSelect={() => updateMut.mutate({ client_id: c.id } as any)}
                                  className="flex items-center gap-3 p-3 hover:bg-primary/10 cursor-pointer aria-selected:bg-primary/10"
                                >
                                   <div className={`size-8 rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs uppercase shadow-sm ${
                                    (c as any).logo_url ? "" : ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'][c.id.charCodeAt(0) % 6]
                                   }`}>
                                    {(c as any).logo_url ? (
                                      <img src={(c as any).logo_url} className="size-full rounded-full object-cover" />
                                    ) : (
                                      (c.company || c.name).substring(0, 2)
                                    )}
                                   </div>

                                   <span className="text-sm font-medium text-foreground">{c.company || c.name}</span>
                                  {(job as any).client_id === c.id && <Check className="size-4 text-primary ml-auto" />}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* PROJETO */}
                   <div className="space-y-3 col-span-1 sm:col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Projeto</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {projects
                        .filter(p => !(job as any).client_id || p.client_id === (job as any).client_id)
                        .map((p) => {
                          const isSelected = (job as any).project_id === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => updateMut.mutate({ project_id: p.id } as any)}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                isSelected 
                                  ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(255,188,69,0.1)]" 
                                  : "bg-background/50 border-border hover:border-primary/50 text-foreground/60"
                              }`}
                            >
                              <p className="text-[10px] font-bold uppercase tracking-wider line-clamp-2 leading-tight">
                                {p.name}
                              </p>
                            </button>
                          );
                        })}
                      {projects.filter(p => !(job as any).client_id || p.client_id === (job as any).client_id).length === 0 && (
                        <p className="text-[10px] text-foreground/40 uppercase font-bold py-2 italic">Nenhum projeto disponível para este cliente</p>
                      )}
                    </div>
                  </div>

                  {/* SERVIÇO */}
                   <div className="space-y-3 col-span-1 sm:col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Serviço Principal</Label>
                    <Select
                      value={(job as any).service_id || ""}
                      onValueChange={(v) => updateMut.mutate({ service_id: v } as any)}
                    >
                      <SelectTrigger className="h-10 bg-background/50 border-border px-4 rounded-lg text-foreground">
                        <SelectValue placeholder="Selecione o serviço" className="text-foreground" />
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-border">
                        {services.map((s: any) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* RESPONSÁVEL PRINCIPAL */}
                   <div className="space-y-3 col-span-1 sm:col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Responsável Principal</Label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {team.map((p) => {
                        const isSelected = (job as any).main_responsible_id === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => updateMut.mutate({ main_responsible_id: p.id } as any)}
                            className="flex flex-col items-center gap-2 group"
                          >
                            <div className={`size-12 rounded-full border-2 transition-all p-0.5 ${
                              isSelected ? "border-primary scale-110 shadow-[0_0_15px_rgba(255,188,69,0.3)]" : "border-transparent group-hover:border-primary/30"
                            }`}>
                              <div className="size-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                {p.avatar_url ? (
                                  <img src={p.avatar_url} alt={p.display_name || ""} className="size-full object-cover" />
                                ) : (

                                  <span className="text-xs font-bold text-foreground/40 uppercase">
                                    {(p.display_name || p.full_name || "??").substring(0, 2)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-tighter text-center line-clamp-1 w-full ${isSelected ? "text-primary" : "text-foreground/40 group-hover:text-foreground/60"}`}>
                              {p.display_name || p.full_name?.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* EQUIPE ENVOLVIDA */}
                  <div className="space-y-3 col-span-1 sm:col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Equipe Envolvida</Label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {team.map((p) => {
                        const isSelected = ((job as any).team_involved || []).some((m: any) => m.user_id === p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              const current = (job as any).team_involved || [];
                              if (isSelected) {
                                updateMut.mutate({ team_involved: current.filter((m: any) => m.user_id !== p.id) } as any);
                              } else {
                                updateMut.mutate({ team_involved: [...current, { user_id: p.id, role: "Membro" }] } as any);
                              }
                            }}
                            className={`flex flex-col items-center gap-2 group transition-opacity ${!isSelected && "opacity-40 hover:opacity-100"}`}
                          >
                            <div className={`size-12 rounded-full border-2 transition-all p-0.5 ${
                              isSelected ? "border-primary scale-110 shadow-[0_0_15px_rgba(255,188,69,0.3)]" : "border-transparent group-hover:border-primary/30"
                            }`}>
                              <div className="size-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                {p.avatar_url ? (
                                  <img src={p.avatar_url} alt={p.display_name || ""} className="size-full object-cover" />
                                ) : (

                                  <span className="text-xs font-bold text-foreground/40 uppercase">
                                    {(p.display_name || p.full_name || "??").substring(0, 2)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-tighter text-center line-clamp-1 w-full ${isSelected ? "text-primary" : "text-foreground/40"}`}>
                              {p.display_name || p.full_name?.split(' ')[0]}
                            </span>
                          </button>
                        );
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
                        {checklist.map((item) => {
                          const resp = team.find(p => p.id === (item as any).responsible_id);
                          return (
                            <div 
                              key={item.id} 
                              className="flex items-center gap-3 group py-1.5 px-2 hover:bg-background/50 rounded-lg transition-all cursor-pointer"
                              onClick={(e) => {
                                // Only trigger if not clicking on the select or delete button
                                if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('[role="combobox"]')) {
                                  toggleItemMut.mutate({ id: item.id, done: !item.done });
                                }
                              }}
                            >
                              <Checkbox
                                checked={item.done}
                                onCheckedChange={(v) => {
                                  // This will be handled by the div click for better hit area, 
                                  // but keep it for accessibility/keyboard
                                  toggleItemMut.mutate({ id: item.id, done: v === true });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="size-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-300 shrink-0"
                              />
                              <div className="flex-1 min-w-0">

                                 <input
                                  defaultValue={item.content}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    const newContent = e.target.value.trim();
                                    if (newContent && newContent !== item.content) {
                                      updateChecklistItem(item.id, { content: newContent })
                                        .then(() => qc.invalidateQueries({ queryKey: ["job-checklist", job.id] }));
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className={`w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-sm transition-all duration-300 ${
                                    item.done ? "line-through text-foreground/40 italic" : "font-medium text-foreground"
                                  }`}
                                />
                              </div>

                              
                              <div className="flex items-center gap-2">
                                <Select
                                  value={(item as any).responsible_id || "none"}
                                  onValueChange={(v) => {
                                    updateChecklistItem(item.id, { responsible_id: v === "none" ? null : v } as any)
                                      .then(() => qc.invalidateQueries({ queryKey: ["job-checklist", job.id] }));
                                  }}
                                >
                                  <SelectTrigger className="h-7 border-none bg-transparent hover:bg-white/5 p-0 w-auto gap-1 focus:ring-0">
                                    <div className="flex items-center gap-1.5 px-2">
                                      <Avatar className="size-5">
                                        {resp?.avatar_url ? (
                                          <AvatarImage src={resp.avatar_url} />
                                        ) : null}
                                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                          {resp ? (resp.display_name || resp.full_name || "?").charAt(0).toUpperCase() : <User className="size-3" />}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent align="end">
                                    <SelectItem value="none" className="text-xs">Sem responsável</SelectItem>
                                    {team.map((p: any) => (
                                      <SelectItem key={p.id} value={p.id} className="text-xs">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="size-4">
                                            {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                                            <AvatarFallback className="text-[6px]">{ (p.display_name || p.full_name || "?").charAt(0) }</AvatarFallback>
                                          </Avatar>
                                          {p.display_name || p.full_name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <button
                                  onClick={() => delItemMut.mutate(item.id)}
                                  className="opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-destructive transition-all p-1"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
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
                            className="h-10 bg-background border-border text-foreground placeholder:text-foreground/50"
                          />
                          <Button type="submit" size="icon" className="size-10 shrink-0 text-primary-foreground">
                            <Plus className="size-5" />
                          </Button>
                        </form>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Paperclip className="size-4 text-primary" />
                        <Label className="text-xs font-bold uppercase tracking-wider">Anexos do Job</Label>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {attachments.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-2 bg-background border border-border rounded-lg group">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="size-4 text-foreground/40 shrink-0" />
                              <span className="text-xs font-medium truncate text-foreground/80">{file.file_name}</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 h-7 w-7 text-foreground/40 hover:text-primary"
                                onClick={() => window.open(file.file_url, '_blank')}
                              >
                                <ExternalLink className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 h-7 w-7 text-foreground/40 hover:text-destructive"
                                onClick={async () => {
                                  if (confirm("Deseja remover este anexo?")) {
                                    const { error } = await supabase.from('job_attachments').delete().eq('id', file.id);
                                    if (!error) {
                                      qc.invalidateQueries({ queryKey: ["job-attachments", job.id] });
                                      toast.success("Anexo removido");
                                    }
                                  }
                                }}
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                      >
                        {isUploading ? (
                          <Loader2 className="size-6 text-primary animate-spin" />
                        ) : (
                          <FileUp className="size-6 text-foreground/20" />
                        )}
                        <div className="text-center">
                          <p className="text-xs font-bold text-foreground/60">
                            {isUploading ? "Enviando arquivo..." : "Clique ou arraste para anexar"}
                          </p>
                          <p className="text-[10px] text-foreground/40 uppercase tracking-widest mt-1">Formatos suportados: PDF, JPG, PNG, DOCX</p>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 text-primary" />
                        <Label className="text-xs font-bold uppercase tracking-wider">Briefing</Label>
                      </div>
                      <Textarea
                        rows={4}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        onBlur={() => observations !== (job as any).operational_observations && updateMut.mutate({ operational_observations: observations } as any)}
                        placeholder="Registros internos da equipe..."
                        className="bg-background text-sm leading-relaxed border-border min-h-[100px] text-foreground placeholder:text-foreground/50"
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
          <div className="w-[400px] flex flex-col bg-muted/5 order-2 sm:order-2 h-full sm:h-auto overflow-hidden">
            <div className="p-6 border-b border-border flex items-center gap-2 shrink-0">
              <MessageSquare className="size-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Comunicação</h3>
            </div>

            <ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
              <div className="py-6 space-y-6">
                {(communicationTimeline as any[]).map((item, idx) => {
                  const profile = team.find(p => p.id === item.user_id);
                  const userName = item.is_system ? "Sistema" : (profile?.display_name || profile?.full_name || "Usuário");
                  const userAvatar = profile?.avatar_url;
                  const userInitials = userName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);

                  const isEditing = editingCommentId === item.commentId;
                  const hasVersions = item.previous_versions && item.previous_versions.length > 0;
                  const isShowingVersions = showVersionsId === item.commentId;
                  
                  return (
                    <div key={item.id} className="flex gap-3 group/comment">
                      <Avatar className="size-8 shrink-0 border border-border/50">
                        <AvatarImage src={userAvatar || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-foreground/60">{userName}</span>
                            {item.updated_at && (
                              <span className="text-[8px] uppercase bg-muted px-1.5 py-0.5 rounded text-foreground/40 font-bold">Editado</span>
                            )}
                          </div>
                        <div className="flex items-center gap-2">
                          {!item.is_system && !isEditing && (
                            <div className="hidden group-hover/comment:flex items-center gap-1">
                              {item.user_id === currentUser?.id && (
                                <button 
                                  onClick={() => {
                                    setEditingCommentId(item.commentId!);
                                    setEditValue(item.content);
                                  }}
                                  className="text-foreground/40 hover:text-primary transition-colors"
                                >
                                  <Pencil className="size-3" />
                                </button>
                              )}
                              {(item.user_id === currentUser?.id || isAdmin) && (
                                <button 
                                  onClick={() => {
                                    if (confirm("Deseja excluir este comentário?")) {
                                      deleteCommentMut.mutate(item.commentId!);
                                    }
                                  }}
                                  className="text-foreground/40 hover:text-red-500 transition-colors"
                                  title="Excluir comentário"
                                >
                                  <Trash className="size-3" />
                                </button>
                              )}
                              {hasVersions && (
                                <button 
                                  onClick={() => setShowVersionsId(isShowingVersions ? null : item.commentId!)}
                                  className="text-foreground/40 hover:text-primary transition-colors"
                                  title="Ver histórico de edições"
                                >
                                  <RotateCcw className="size-3" />
                                </button>
                              )}
                            </div>
                          )}
                          <span className="text-[9px] text-foreground/30 font-mono">
                            {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>

                      <div className={`text-sm p-3 rounded-2xl border transition-all ${
                        item.type === 'attachment' ? 'bg-blue-50/5 border-blue-500/20 text-foreground' : 

                        isEditing ? 'bg-background border-primary ring-1 ring-primary/20' :
                        'bg-background border-border/50 text-foreground'
                      }`}>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea 
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="min-h-[60px] bg-transparent border-none p-0 focus-visible:ring-0 text-xs resize-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="ghost" className="size-6 h-6 w-6" onClick={() => setEditingCommentId(null)}>
                                <X className="size-3" />
                              </Button>
                              <Button 
                                size="icon" 
                                className="size-6 h-6 w-6" 
                                onClick={() => updateCommentMut.mutate({ id: item.commentId!, content: editValue })}
                                disabled={updateCommentMut.isPending || !editValue.trim() || editValue === item.content}
                              >
                                {updateCommentMut.isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {item.type === 'attachment' || item.file_url ? (
                              <div className="space-y-3">
                                {item.content && !item.content.startsWith('Anexou um arquivo:') && (
                                  <p className="whitespace-pre-wrap leading-relaxed text-xs">
                                  {item.content.split(/(@\w+)/).map((part: string, i: number) => 

                                      part.startsWith('@') ? (
                                        <span key={i} className="text-primary font-bold">{part}</span>
                                      ) : part
                                    )}
                                  </p>
                                )}
                                <div className="flex items-center justify-between gap-2 bg-white/5 p-2 rounded-xl border border-blue-500/10">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="size-4 text-blue-400 shrink-0" />
                                    <p className="font-bold text-foreground truncate text-[10px]">{item.metadata?.file_name || "Anexo"}</p>
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
                                {item.content.split(/(@\w+)/).map((part: string, i: number) => 
                                  part.startsWith('@') ? (
                                    <span key={i} className="text-primary font-bold">{part}</span>
                                  ) : part
                                )}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      
                      {isShowingVersions && item.previous_versions.length > 0 && (
                        <div className="mt-2 ml-4 pl-4 border-l-2 border-muted space-y-3">
                          <p className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider flex items-center gap-1">
                            <History className="size-3" /> Histórico de versões
                          </p>
                          {item.previous_versions.map((version: any, vIdx: number) => (
                            <div key={vIdx} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-foreground/40">Versão {item.previous_versions.length - vIdx}</span>
                                <span className="text-[9px] text-foreground/40 font-mono">
                                  {format(new Date(version.updated_at), "dd/MM HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              <div className="bg-muted/30 p-2 rounded-xl border border-border/30">
                                <p className="text-[11px] text-foreground/60 whitespace-pre-wrap">{version.content}</p>
                              </div>
                            </div>
                          )).reverse()}
                        </div>
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

            <div className="p-6 pt-2 border-t border-border shrink-0 bg-surface/50">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dupMut.mutate()}
                  disabled={dupMut.isPending}
                  className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 gap-2 h-8 px-3"
                >
                  <Copy className="size-3" />
                  Duplicar Job
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirm(`Remover este job?`) && deleteMut.mutate()}
                  disabled={deleteMut.isPending}
                  className="text-[10px] font-bold uppercase tracking-widest text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 h-8 px-3"
                >
                  <Trash2 className="size-3" />
                  Excluir Job
                </Button>
              </div>


              
              <div className="relative z-[100]">
                <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
                  <PopoverTrigger asChild>
                    <div className="absolute pointer-events-none" style={{ top: mentionCoords.top, left: mentionCoords.left }} />
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[200px] bg-popover border-border" align="start">
                    <Command className="bg-popover">
                      <CommandList>
                        <CommandEmpty>Nenhum membro encontrado</CommandEmpty>
                        <CommandGroup heading="Mencionar equipe">
                          {team.filter(p => {
                            const name = (p.display_name || p.full_name || '').toLowerCase();
                            return name.includes(mentionSearch.toLowerCase());
                          }).map(p => (
                            <CommandItem
                              key={p.id}
                              onSelect={() => {
                                const lastAt = comment.lastIndexOf('@');
                                const before = comment.substring(0, lastAt);
                                const after = comment.substring(lastAt + mentionSearch.length + 1);
                                const name = (p.display_name || p.full_name || '').replace(/\s/g, '');
                                setComment(`${before}@${name} ${after}`);
                                setMentionOpen(false);
                                commentInputRef.current?.focus();
                              }}
                              className="cursor-pointer hover:bg-accent"
                            >
                              <User className="size-4 mr-2" />
                              {p.display_name || p.full_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div className="flex gap-2 bg-background border border-border rounded-xl p-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all relative z-[110]">
                  <Textarea
                    ref={commentInputRef}
                    value={comment}
                    onChange={(e) => {
                      const val = e.target.value;
                      setComment(val);
                      
                      const lastAt = val.lastIndexOf('@');
                      if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ' || val[lastAt - 1] === '\n')) {
                        const search = val.substring(lastAt + 1);
                        if (!search.includes(' ')) {
                          setMentionSearch(search);
                          setMentionOpen(true);
                          
                          const textarea = e.target;
                          const { selectionStart } = textarea;
                          const textBefore = val.substring(0, selectionStart);
                          const lines = textBefore.split('\n');
                          const currentLine = lines.length;
                          setMentionCoords({
                            top: currentLine * 20 - 40,
                            left: lines[lines.length - 1].length * 7
                          });
                        } else {
                          setMentionOpen(false);
                        }
                      } else {
                        setMentionOpen(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (!e.shiftKey && !mentionOpen) {
                          e.preventDefault();
                          e.stopPropagation();
                          if (comment.trim() && !commentMut.isPending) {
                            commentMut.mutate({ content: comment.trim() });
                            // The focus back is handled by the textarea auto-focus on re-render 
                            // but let's be explicit if needed.
                          }
                        }
                      }
                    }}
                    placeholder="Escreva uma mensagem..."
                    className="flex-1 bg-transparent border-none focus-visible:ring-0 min-h-[40px] max-h-[120px] py-2 resize-none text-xs text-foreground placeholder:text-foreground/50 relative z-[120]"
                    rows={1}
                  />
                  <div className="flex flex-col justify-end gap-1">
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon" 
                      className="size-8 rounded-lg text-foreground/40 hover:text-primary hover:bg-primary/10"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                    </Button>
                    <Button 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (comment.trim() && !commentMut.isPending) {
                          commentMut.mutate({ content: comment.trim() });
                        }
                      }}
                      disabled={!comment.trim() || commentMut.isPending}
                      size="icon" 
                      className="size-8 rounded-lg shadow-lg shadow-primary/20"
                    >
                      {commentMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    </Button>
                  </div>
                </div>
              </div>
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
