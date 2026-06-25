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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JobScriptTab } from "@/components/jobs/JobScriptTab";
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
  deleteChecklistItem,
  deleteJob,
  duplicateJob,
  fetchChecklist,
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
  updateChecklistItem,
  reorderChecklist,
} from "@/lib/ops-api";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fetchProfiles } from "@/lib/profile-api";
import { Trash2, Plus, FileText, CheckSquare, Paperclip, History, CheckCircle2, User, X, Clock, AlertCircle, FileUp, Loader2, ExternalLink, Eye, ChevronDown, Pencil, Check, Copy, Send, Archive, RotateCcw, Image as ImageIcon, AtSign, MessageSquare, Lock, Focus, GripVertical } from "lucide-react";
import { UnifiedTimeline } from "@/components/timeline/UnifiedTimeline";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { SendForApprovalDialog } from "@/components/jobs/SendForApprovalDialog";
import { listJobApprovalItems, archiveApprovalItem, unarchiveApprovalItem, listApprovalItemComments, type ApprovalItem } from "@/lib/approval-items-api";
import { enviarNotificacao, enviarNotificacaoMultipla } from "@/lib/notifications-api";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { FileThumbnail } from "@/components/FileThumbnail";
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
import { StorageImage } from "@/components/ui/storage-image";

function SortableChecklistRow({
  item,
  team,
  jobId,
  onToggle,
  onDelete,
  onUpdate,
}: {
  item: any;
  team: any[];
  jobId: string;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: any) => Promise<void> | void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const resp = team.find((p) => p.id === item.responsible_id);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 group py-1.5 px-2 hover:bg-background/50 rounded-lg transition-all"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing text-foreground/30 hover:text-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
        title="Arraste para reordenar"
        aria-label="Arraste para reordenar"
      >
        <GripVertical className="size-4" />
      </button>
      <Checkbox
        checked={item.done}
        onCheckedChange={(v) => onToggle(item.id, v === true)}
        className="size-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-300 shrink-0"
      />
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={(e) => {
          if (
            !(e.target as HTMLElement).closest("input") &&
            !(e.target as HTMLElement).closest("button") &&
            !(e.target as HTMLElement).closest('[role="combobox"]')
          ) {
            onToggle(item.id, !item.done);
          }
        }}
      >
        <input
          defaultValue={item.content}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const newContent = e.target.value.trim();
            if (newContent && newContent !== item.content) {
              onUpdate(item.id, { content: newContent });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={`w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-sm transition-all duration-300 ${
            item.done ? "line-through text-foreground/40 italic" : "font-medium text-foreground"
          }`}
        />
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={item.responsible_id || "none"}
          onValueChange={(v) => onUpdate(item.id, { responsible_id: v === "none" ? null : v })}
        >
          <SelectTrigger className="h-7 border-none bg-transparent hover:bg-white/5 p-0 w-auto gap-1 focus:ring-0">
            <div className="flex items-center gap-1.5 px-2">
              <Avatar className="size-5">
                {resp?.avatar_url ? <AvatarImage src={resp.avatar_url} /> : null}
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
                    <AvatarFallback className="text-[6px]">{(p.display_name || p.full_name || "?").charAt(0)}</AvatarFallback>
                  </Avatar>
                  {p.display_name || p.full_name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-destructive transition-all p-1"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}




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
  const [title, setTitle] = useState(job?.title || "");
  const [observations, setObservations] = useState((job as any)?.operational_observations || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerConfig, setViewerConfig] = useState<{ url: string; name: string } | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<{ url: string; name: string } | null>(null);


  const { data: checklist = [] } = useQuery({
    queryKey: ["job-checklist", job?.id],
    queryFn: () => fetchChecklist(job!.id),
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

  const { data: approvalItems = [] } = useQuery({
    queryKey: ["job-approval-items", job?.id],
    queryFn: () => listJobApprovalItems(job!.id),
    enabled: !!job,
  });

  const archiveApprovalMut = useMutation({
    mutationFn: (id: string) => archiveApprovalItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-approval-items", job?.id] });
      qc.invalidateQueries({ queryKey: ["approval-items"] });
      toast.success("Item arquivado — não aparece mais no portal do cliente");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unarchiveApprovalMut = useMutation({
    mutationFn: (id: string) => unarchiveApprovalItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-approval-items", job?.id] });
      qc.invalidateQueries({ queryKey: ["approval-items"] });
      toast.success("Item restaurado — voltou ao portal do cliente");
    },
    onError: (e: Error) => toast.error(e.message),
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
      
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_history', filter: `job_id=eq.${job.id}` }, () => qc.invalidateQueries({ queryKey: ["job-history", job.id] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_comments', filter: `job_id=eq.${job.id}` }, () => qc.invalidateQueries({ queryKey: ["job-internal-notes", job.id] }))
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
        
        const recipients = teamInvolved
          .map((m: any) => typeof m === 'string' ? m : m.user_id)
          .filter((id: string) => id && id !== currentUser?.id);
        
        if (recipients.length > 0) {
          enviarNotificacaoMultipla(
            recipients,
            `Status alterado: ${job.title}`,
            `O status do job foi alterado para: ${statusLabel}`,
            "job",
            `/jobs?jobId=${job.id}`
          ).catch(console.error);
        }
      }

      // Notify if assignee changes
      if (variables.assignee_id && job && variables.assignee_id !== (job as any).assignee_id) {
        enviarNotificacao(
          variables.assignee_id,
          "Novo Job Atribuído",
          `Você foi atribuído ao job: ${job.title}`,
          "job",
          `/jobs?jobId=${job.id}`
        ).catch(console.error);
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

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleChecklistDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !job) return;
    const qk = ["job-checklist", job.id];
    const current = (qc.getQueryData<any[]>(qk) ?? []).slice();
    const oldIndex = current.findIndex((i) => i.id === active.id);
    const newIndex = current.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(current, oldIndex, newIndex).map((it, idx) => ({ ...it, order_index: idx }));
    qc.setQueryData(qk, reordered);
    reorderChecklist(reordered.map((it) => ({ id: it.id, order_index: it.order_index })))
      .then(() => qc.invalidateQueries({ queryKey: qk }))
      .catch(() => qc.setQueryData(qk, current));
  };




  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // Sincroniza team_involved com os responsáveis da execução (fonte única).
  useEffect(() => {
    if (!job) return;
    const derivedIds = Array.from(new Set(
      (checklist || [])
        .map((c: any) => c.responsible_id)
        .filter((id: string | null) => !!id)
    )) as string[];
    const currentIds = ((job as any).team_involved || [])
      .map((m: any) => (typeof m === "string" ? m : m.user_id))
      .filter(Boolean);
    const same =
      derivedIds.length === currentIds.length &&
      derivedIds.every((id) => currentIds.includes(id));
    if (same) return;
    const next = derivedIds.map((id) => ({ user_id: id, role: "Membro" }));
    updateJob(job.id, { team_involved: next } as any)
      .then(() => qc.invalidateQueries({ queryKey: ["jobs"] }))
      .catch(() => {});
  }, [checklist, job?.id]);


  const isAdmin = currentUser?.user_metadata?.role === 'admin' || currentUser?.email === 'admin@ops.com'; // Placeholder check


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
      <SheetContent key={job.id} className="bg-surface border-border w-full p-0 sm:max-w-[800px] overflow-hidden flex flex-col h-[100dvh] sm:h-auto [&>button]:hidden sm:[&>button]:inline-flex">
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Main Column: Details (Gestão do Job) */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="p-6 space-y-8 pb-12">
              <SheetHeader className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="size-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Gestão de Job</span>
                  </div>
                  <FocusModeButton jobId={job.id} />
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

              <Tabs defaultValue="gestao" className="space-y-6">
                <TabsList className="bg-background/50">
                  <TabsTrigger value="gestao">Gestão</TabsTrigger>
                  <TabsTrigger value="roteiro">Roteiro</TabsTrigger>
                </TabsList>
                <TabsContent value="gestao" className="space-y-6 mt-0">
              <div className="space-y-6">
                {/* STATUS spacer */}
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Status</Label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:gap-2">
                    {[
                      { id: 'not_started', label: 'Nova Demanda', color: 'bg-[#374151]/20 text-[#374151] border-[#374151]/50', active: 'bg-[#374151] text-white border-[#374151]' },
                      { id: 'in_progress', label: 'Em Andamento', color: 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/50', active: 'bg-[#3b82f6] text-white border-[#3b82f6]' },
                      { id: 'review', label: 'Em Revisão', color: 'bg-[#ffbc45]/20 text-[#ffbc45] border-[#ffbc45]/50', active: 'bg-[#ffbc45] text-white border-[#ffbc45]' },
                      { id: 'done', label: 'Concluído', color: 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/50', active: 'bg-[#22c55e] text-white border-[#22c55e]' },
                      { id: 'paused', label: 'Aguardando Cliente', color: 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/50', active: 'bg-[#f97316] text-white border-[#f97316]' }
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

                {/* MOSTRAR NO PORTAL */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-4 py-3">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      👁️ Mostrar no Minha Kasa
                    </Label>
                    <p className="text-[10px] text-foreground/50">Quando ativado, este job aparece no portal do cliente.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!(job as any).show_in_portal}
                    onChange={(e) => updateMut.mutate({ show_in_portal: e.target.checked } as any)}
                    className="size-5 accent-primary cursor-pointer"
                  />
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
                              <StorageImage src={(clients.find(c => c.id === (job as any).client_id) as any)?.logo_url} className="size-full rounded-full object-cover" />
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
                                      <StorageImage src={(c as any).logo_url} className="size-full rounded-full object-cover" />
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
                                  <StorageImage src={p.avatar_url} alt={p.display_name || ""} className="size-full object-cover" />
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

                  {/* EQUIPE ENVOLVIDA — derivada da execução */}
                  <div className="space-y-3 col-span-1 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Equipe Envolvida</Label>
                      <span className="text-[9px] text-foreground/40 italic">Definida pelos responsáveis da execução</span>
                    </div>
                    {(() => {
                      const ids = Array.from(new Set(
                        (checklist || [])
                          .map((c: any) => c.responsible_id)
                          .filter((id: string | null) => !!id)
                      )) as string[];
                      const members = ids
                        .map((id) => team.find((p) => p.id === id))
                        .filter(Boolean) as any[];
                      if (members.length === 0) {
                        return (
                          <p className="text-[11px] text-foreground/40 italic">
                            Atribua responsáveis aos itens da execução para montar a equipe.
                          </p>
                        );
                      }
                      return (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                          {members.map((p) => (
                            <div key={p.id} className="flex flex-col items-center gap-2">
                              <div className="size-12 rounded-full border-2 border-primary p-0.5 shadow-[0_0_15px_rgba(255,188,69,0.3)]">
                                <div className="size-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                  {p.avatar_url ? (
                                    <StorageImage src={p.avatar_url} alt={p.display_name || ""} className="size-full object-cover" />
                                  ) : (
                                    <span className="text-xs font-bold text-foreground/40 uppercase">
                                      {(p.display_name || p.full_name || "??").substring(0, 2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-tighter text-center line-clamp-1 w-full text-primary">
                                {p.display_name || p.full_name?.split(' ')[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
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
                        <DndContext
                          sensors={dndSensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleChecklistDragEnd}
                        >
                          <SortableContext
                            items={checklist.map((c) => c.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {checklist.map((item) => (
                              <SortableChecklistRow
                                key={item.id}
                                item={item}
                                team={team}
                                jobId={job.id}
                                onToggle={(id, done) => toggleItemMut.mutate({ id, done })}
                                onDelete={(id) => delItemMut.mutate(id)}
                                onUpdate={async (id, patch) => {
                                  await updateChecklistItem(id, patch);
                                  qc.invalidateQueries({ queryKey: ["job-checklist", job.id] });
                                }}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>

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
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {attachments.map((file) => (
                          <div
                            key={file.id}
                            className="group relative bg-background border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all"
                          >
                            <button
                              type="button"
                              onClick={() => setViewerConfig({ url: file.file_url, name: file.file_name })}
                              className="block w-full text-left"
                              title="Visualizar"
                            >
                              <FileThumbnail
                                url={file.file_url}
                                fileName={file.file_name}
                                fileType={file.file_type}
                                aspectClass="aspect-[4/3]"
                                className="rounded-none ring-0 border-b border-border"
                              />
                              <div className="p-2">
                                <p className="text-xs font-medium truncate text-foreground/80">{file.file_name}</p>
                              </div>
                            </button>

                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {job.client_id && (
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="size-7 h-7 w-7 bg-background/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground shadow-sm"
                                  title="Enviar para aprovação do cliente"
                                  onClick={(e) => { e.stopPropagation(); setApprovalDialog({ url: file.file_url, name: file.file_name }); }}
                                >
                                  <Send className="size-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="secondary"
                                size="icon"
                                className="size-7 h-7 w-7 bg-background/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground shadow-sm"
                                title="Baixar com nome original"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const marker = '/job-attachments/';
                                    const idx = file.file_url.indexOf(marker);
                                    const path = idx >= 0 ? file.file_url.slice(idx + marker.length) : null;
                                    let href = file.file_url;
                                    if (path) {
                                      const { data } = supabase.storage
                                        .from('job-attachments')
                                        .getPublicUrl(path, { download: file.file_name });
                                      href = data.publicUrl;
                                    }
                                    const a = document.createElement('a');
                                    a.href = href;
                                    a.download = file.file_name;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                  } catch (err: any) {
                                    toast.error('Erro ao baixar: ' + (err?.message || err));
                                  }
                                }}
                              >
                                <ExternalLink className="size-3.5" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="size-7 h-7 w-7 bg-background/90 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
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

                    {approvalItems.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Send className="size-4 text-primary" />
                          <Label className="text-xs font-bold uppercase tracking-wider">
                            Enviados ao cliente ({approvalItems.length})
                          </Label>
                        </div>
                        <div className="space-y-2">
                          {approvalItems.map((it: ApprovalItem) => {
                            const isArchived = it.status === "archived";
                            const statusLabel =
                              it.status === "approved" ? "Aprovado"
                              : it.status === "rejected" ? "Ajustes pedidos"
                              : it.status === "archived" ? "Arquivado"
                              : "Aguardando";
                            const statusColor =
                              it.status === "approved" ? "text-emerald-500"
                              : it.status === "rejected" ? "text-orange-500"
                              : it.status === "archived" ? "text-foreground/40"
                              : "text-blue-500";
                            return (
                              <div
                                key={it.id}
                                className={`bg-background border rounded-lg group ${isArchived ? "opacity-60" : ""} ${it.status === "rejected" ? "border-orange-500/40" : "border-border"}`}
                              >
                                <div className="flex items-center justify-between gap-2 p-2">
                                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                    <ImageIcon className="size-4 text-foreground/40 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium truncate text-foreground/80">{it.title}</p>
                                      <p className={`text-[10px] uppercase tracking-wider font-bold ${statusColor}`}>
                                        {statusLabel}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {it.content_url && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 h-7 w-7 text-foreground/40 hover:text-primary"
                                        onClick={() => window.open(it.content_url!, "_blank")}
                                        title="Abrir mídia"
                                      >
                                        <ExternalLink className="size-3.5" />
                                      </Button>
                                    )}
                                    {isArchived ? (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 h-7 w-7 text-foreground/40 hover:text-primary"
                                        title="Restaurar — voltar a aparecer no portal"
                                        onClick={() => unarchiveApprovalMut.mutate(it.id)}
                                        disabled={unarchiveApprovalMut.isPending}
                                      >
                                        <RotateCcw className="size-3.5" />
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 h-7 w-7 text-foreground/40 hover:text-destructive"
                                        title="Arquivar — remover do portal do cliente"
                                        onClick={() => {
                                          if (confirm(`Arquivar "${it.title}"?\n\nO item será removido do portal do cliente, mas fica no seu histórico interno.`)) {
                                            archiveApprovalMut.mutate(it.id);
                                          }
                                        }}
                                        disabled={archiveApprovalMut.isPending}
                                      >
                                        <Archive className="size-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {it.status === "rejected" && (
                                  <RejectedFeedback item={it} />
                                )}
                              </div>
                            );

                          })}
                        </div>
                      </div>
                    )}


                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 text-primary" />
                        <Label className="text-xs font-bold uppercase tracking-wider">Briefing</Label>
                      </div>
                      <Textarea
                        rows={14}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        onBlur={() => observations !== (job as any).operational_observations && updateMut.mutate({ operational_observations: observations } as any)}
                        placeholder="Registros internos da equipe, contexto da demanda, referências, observações estratégicas..."
                        className="bg-background text-base leading-relaxed border-border min-h-[320px] text-foreground placeholder:text-foreground/50 p-4 resize-y"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="internal-notes" className="border border-border rounded-xl px-4 bg-muted/5 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-2">
                      <Lock className="size-4 text-primary" />
                      <span className="text-sm font-bold uppercase tracking-wider">Observações Internas</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <InternalNotesSection jobId={job.id} team={team} currentUser={currentUser} />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="history" className="border border-border rounded-xl px-4 bg-muted/5 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-2">
                      <History className="size-4 text-primary" />
                      <span className="text-sm font-bold uppercase tracking-wider">Atividade</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <UnifiedTimeline jobId={job.id} />
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
                </TabsContent>
                <TabsContent value="roteiro" className="mt-0">
                  <JobScriptTab jobId={job.id} defaultTitle={job.title} />
                </TabsContent>
              </Tabs>
            </div>
          </div>

        </div>
        <AttachmentViewer
          url={viewerConfig?.url || ""}
          fileName={viewerConfig?.name || ""}
          isOpen={!!viewerConfig}
          onClose={() => setViewerConfig(null)}
        />
      </SheetContent>
      {approvalDialog && job.client_id && (
        <SendForApprovalDialog
          open={!!approvalDialog}
          onOpenChange={(o) => !o && setApprovalDialog(null)}
          clientId={job.client_id}
          jobId={job.id}
          projectId={(job as any).project_id ?? null}
          defaultTitle={approvalDialog.name || job.title}
          defaultUrl={approvalDialog.url}
          defaultFileName={approvalDialog.name}
          attachments={attachments.map((a: any) => ({
            id: a.id,
            file_name: a.file_name,
            file_url: a.file_url,
            file_type: a.file_type,
          }))}
        />
      )}
    </Sheet>
  );
}

const FOCUS_SUGGEST_KEY = (jobId: string) => `kasa:focus-suggested:${jobId}`;

function FocusModeButton({ jobId }: { jobId: string }) {
  const { focusMode, setFocusMode } = useFocusMode();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem(FOCUS_SUGGEST_KEY(jobId));
    if (seen || focusMode) return;
    sessionStorage.setItem(FOCUS_SUGGEST_KEY(jobId), "1");
    const t = setTimeout(() => {
      toast("Quer entrar em Modo Foco para executar este job?", {
        description: "Esconde menus e barras para você focar no que importa.",
        action: { label: "Entrar", onClick: () => setFocusMode(true) },
        duration: 6000,
      });
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  return (
    <button
      onClick={() => setFocusMode(!focusMode)}
      title={focusMode ? "Sair do Modo Foco" : "Entrar em Modo Foco"}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition ${
        focusMode
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-foreground/60 hover:text-primary hover:border-primary/40"
      }`}
    >
      <Focus className="size-3" />
      {focusMode ? "Saindo do Foco" : "Modo Foco"}
    </button>
  );
}

function RejectedFeedback({ item }: { item: ApprovalItem }) {
  const { data: comments = [] } = useQuery({
    queryKey: ["approval-item-comments", item.id],
    queryFn: () => listApprovalItemComments(item.id),
    staleTime: 30_000,
  });

  const changeRequests = comments.filter((c) => c.is_change_request);
  const slideIndexById = new Map((item.slides ?? []).map((s, i) => [s.id, i + 1]));
  const rejectedSlides = Object.entries(item.slide_statuses ?? {})
    .filter(([, st]) => st === "rejected")
    .map(([sid]) => slideIndexById.get(sid))
    .filter((n): n is number => !!n)
    .sort((a, b) => a - b);

  if (!item.feedback && changeRequests.length === 0 && rejectedSlides.length === 0) {
    return (
      <div className="px-3 pb-3 -mt-1 text-[11px] text-foreground/60 italic">
        Cliente pediu ajustes, mas não deixou observações.
      </div>
    );
  }

  return (
    <div className="border-t border-orange-500/20 bg-orange-500/5 px-3 py-3 space-y-2 rounded-b-lg">
      <p className="text-[10px] uppercase tracking-wider font-bold text-orange-500 flex items-center gap-1">
        <AlertCircle className="size-3" /> Ajustes pedidos pelo cliente
      </p>
      {rejectedSlides.length > 0 && (
        <p className="text-[11px] text-foreground/70">
          Slides com ajuste: <span className="font-semibold text-foreground">{rejectedSlides.map((n) => `#${n}`).join(", ")}</span>
        </p>
      )}
      {item.feedback && (
        <div className="text-xs text-foreground/85 whitespace-pre-wrap bg-background border border-border rounded-md p-2 leading-relaxed">
          {item.feedback}
        </div>
      )}
      {changeRequests.map((c) => {
        const slideNum = c.slide_id ? slideIndexById.get(c.slide_id) : null;
        return (
          <div key={c.id} className="text-xs text-foreground/85 bg-background border border-border rounded-md p-2 leading-relaxed">
            <div className="flex items-center gap-2 mb-1 text-[10px] text-foreground/50 uppercase tracking-wider font-bold">
              <span>{c.author_name || "Cliente"}</span>
              {slideNum && <span className="text-orange-500">· Slide #{slideNum}</span>}
              <span className="ml-auto normal-case tracking-normal font-normal text-foreground/40">
                {format(new Date(c.created_at), "dd/MM HH:mm")}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{c.body}</p>
          </div>
        );
      })}
    </div>
  );
}

function InternalNotesSection({
  jobId,
  team,
  currentUser,
}: {
  jobId: string;
  team: any[];
  currentUser: any;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<Array<{ id: string; name: string }>>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: notes = [] } = useQuery({
    queryKey: ["job-internal-notes", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_comments")
        .select("id, content, mentions, created_at, user_id, is_internal")
        .eq("job_id", jobId)
        .eq("is_internal", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error("Escreva uma observação");
      const mentionIds = mentions.map((m) => m.id);
      const { error } = await supabase.from("job_comments").insert({
        job_id: jobId,
        user_id: currentUser?.id,
        content: body.trim(),
        mentions: mentionIds,
        is_internal: true,
        type: "internal_note",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      setMentions([]);
      qc.invalidateQueries({ queryKey: ["job-internal-notes", jobId] });
      toast.success(mentions.length > 0 ? `Observação registrada — ${mentions.length} usuário(s) notificado(s)` : "Observação registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-internal-notes", jobId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function toggleMention(p: any) {
    const name = p.display_name || p.full_name || "usuário";
    setMentions((prev) => {
      if (prev.some((m) => m.id === p.id)) return prev.filter((m) => m.id !== p.id);
      // also append @name to body if not present
      setBody((b) => (b.includes(`@${name}`) ? b : (b ? b + " " : "") + `@${name} `));
      return [...prev, { id: p.id, name }];
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva uma observação interna (somente equipe)..."
          className="bg-background text-sm border-border min-h-[80px] text-foreground placeholder:text-foreground/50"
        />
        {mentions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mentions.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5"
              >
                <AtSign className="size-3" /> {m.name}
                <button
                  type="button"
                  onClick={() => setMentions((prev) => prev.filter((x) => x.id !== m.id))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-2 text-xs">
                <AtSign className="size-3.5" /> Mencionar usuário
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 bg-surface border-border" align="start">
              <Command>
                <CommandInput placeholder="Buscar pessoa..." className="h-9" />
                <CommandList>
                  <CommandEmpty>Ninguém encontrado.</CommandEmpty>
                  <CommandGroup>
                    {team.map((p: any) => {
                      const checked = mentions.some((m) => m.id === p.id);
                      return (
                        <CommandItem
                          key={p.id}
                          onSelect={() => toggleMention(p)}
                          className="gap-2"
                        >
                          <Avatar className="size-5">
                            <AvatarImage src={p.avatar_url || ""} />
                            <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                              {(p.display_name || p.full_name || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs flex-1 truncate">{p.display_name || p.full_name}</span>
                          {checked && <Check className="size-3.5 text-primary" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            size="sm"
            onClick={() => addMut.mutate()}
            disabled={!body.trim() || addMut.isPending}
            className="h-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
          >
            <Send className="size-3.5" /> Registrar
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        {notes.length === 0 && (
          <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest text-center py-4">
            Nenhuma observação interna ainda
          </p>
        )}
        {notes.map((n: any) => {
          const author = team.find((t) => t.id === n.user_id);
          const mentionIds: string[] = Array.isArray(n.mentions) ? n.mentions.map((m: any) => (typeof m === "string" ? m : m?.user_id || m?.id)).filter(Boolean) : [];
          const mentionedUsers = mentionIds
            .map((id) => team.find((t) => t.id === id))
            .filter(Boolean);
          return (
            <div key={n.id} className="border border-border bg-background/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="size-6 shrink-0">
                    <AvatarImage src={author?.avatar_url || ""} />
                    <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                      {(author?.display_name || author?.full_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold truncate">{author?.display_name || author?.full_name || "Usuário"}</span>
                  <span className="text-[10px] text-foreground/40 font-mono">
                    {format(new Date(n.created_at), "dd/MM · HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {n.user_id === currentUser?.id && (
                  <button
                    type="button"
                    onClick={() => confirm("Excluir esta observação?") && delMut.mutate(n.id)}
                    className="text-foreground/30 hover:text-destructive transition"
                    aria-label="Excluir"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap text-foreground/90">{n.content}</p>
              {mentionedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {mentionedUsers.map((u: any) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5"
                    >
                      <AtSign className="size-2.5" /> {u.display_name || u.full_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

