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
import { Trash2, Plus, FileText, CheckSquare, Paperclip, History, CheckCircle2, User, X, Clock, AlertCircle, FileUp, Loader2, ExternalLink, Eye, ChevronDown, Pencil, Check, Copy, Send, Archive, RotateCcw, Image as ImageIcon, AtSign, MessageSquare, Lock, Focus, GripVertical, Clapperboard, ClipboardList, Download } from "lucide-react";
import { UnifiedTimeline } from "@/components/timeline/UnifiedTimeline";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { SendForApprovalDialog } from "@/components/jobs/SendForApprovalDialog";
import { listJobApprovalItems, archiveApprovalItem, unarchiveApprovalItem, listApprovalItemComments, type ApprovalItem } from "@/lib/approval-items-api";

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
      className="flex items-center gap-2 group py-1.5 px-2 hover:bg-muted/30 rounded-md border border-transparent hover:border-border/40 transition-all"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
        title="Arraste para reordenar"
        aria-label="Arraste para reordenar"
      >
        <GripVertical className="size-3.5" />
      </button>
      <Checkbox
        checked={item.done}
        onCheckedChange={(v) => onToggle(item.id, v === true)}
        className="size-4 data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:border-foreground transition-colors shrink-0"
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
          className={`w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-xs transition-colors ${
            item.done ? "line-through text-muted-foreground/60 italic" : "font-medium text-foreground"
          }`}
        />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Select
          value={item.responsible_id || "none"}
          onValueChange={(v) => onUpdate(item.id, { responsible_id: v === "none" ? null : v })}
        >
          <SelectTrigger className="h-6 border border-border/40 bg-muted/20 hover:bg-muted/40 px-1.5 py-0 rounded text-[11px] gap-1 focus:ring-0">
            <div className="flex items-center gap-1">
              <Avatar className="size-3.5 shrink-0">
                {resp?.avatar_url ? <AvatarImage src={resp.avatar_url} /> : null}
                <AvatarFallback className="text-[7px] bg-muted text-muted-foreground">
                  {resp ? (resp.display_name || resp.full_name || "?").charAt(0).toUpperCase() : <User className="size-2.5" />}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                {resp ? (resp.display_name || resp.full_name?.split(" ")[0]) : "Atribuir"}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent align="end" className="text-xs font-mono-kasa">
            <SelectItem value="none" className="text-xs">Sem responsável</SelectItem>
            {team.map((p: any) => (
              <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                <div className="flex items-center gap-2">
                  <Avatar className="size-4">
                    {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                    <AvatarFallback className="text-[7px]">{(p.display_name || p.full_name || "?").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{p.display_name || p.full_name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all p-1"
          title="Remover etapa"
        >
          <X className="size-3.5" />
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
  const [observations, setObservations] = useState(job?.description || "");
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
      setObservations(job.description || "");
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", job!.id] });
      toast.success("Job atualizado");
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["jobs"], ctx.prev);
      toast.error(e.message);
    }
  });

  const uploadFiles = async (files: File[]) => {
    if (!job || files.length === 0) return;
    try {
      setIsUploading(true);
      for (const file of files) {
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
      }

      qc.invalidateQueries({ queryKey: ["job-attachments", job.id] });
      toast.success(files.length > 1 ? `${files.length} arquivos enviados!` : "Arquivo enviado com sucesso!");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    await uploadFiles(files);
  };

  const [isDragging, setIsDragging] = useState(false);


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

  const isAdmin = currentUser?.user_metadata?.role === 'admin' || currentUser?.email === 'admin@ops.com';


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
      <SheetContent key={job.id} className="bg-card border-border/60 w-full p-0 sm:max-w-[1000px] overflow-hidden flex flex-col h-[100dvh] sm:h-[90vh] sm:rounded-lg sm:my-auto sm:mr-6 shadow-2xl [&>button]:hidden sm:[&>button]:inline-flex">
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border/60 bg-card flex items-center justify-between gap-3 sm:gap-4 shrink-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground">
                  Job #{job.id.slice(0, 8)}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-kasa uppercase tracking-wider font-semibold border border-border/60 text-muted-foreground bg-muted/20">
                  {JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS]?.label || job.status}
                </span>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title !== job.title && updateMut.mutate({ title })}
                className="bg-transparent border-none outline-none w-full focus:ring-0 p-0 font-display text-base sm:text-lg lg:text-xl font-bold text-foreground truncate"
                placeholder="Título do job"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <FocusModeButton jobId={job.id} />
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                aria-label="Fechar gaveta"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          <Tabs defaultValue="gestao" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 border-b border-border/60 bg-card shrink-0">
              <TabsList className="bg-transparent border-0 h-auto p-0 gap-4 sm:gap-6">
                <TabsTrigger
                  value="gestao"
                  className="relative data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-foreground border-b-2 border-transparent rounded-none px-0 py-2.5 text-xs font-mono-kasa font-medium tracking-tight gap-1.5 transition-colors hover:text-foreground text-muted-foreground shadow-none"
                >
                  <ClipboardList className="size-3.5" /> Gestão & Execução
                </TabsTrigger>
                <TabsTrigger
                  value="roteiro"
                  className="relative data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-foreground border-b-2 border-transparent rounded-none px-0 py-2.5 text-xs font-mono-kasa font-medium tracking-tight gap-1.5 transition-colors hover:text-foreground text-muted-foreground shadow-none"
                >
                  <Clapperboard className="size-3.5" /> Roteiro
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="gestao" className="flex-1 overflow-hidden mt-0">
              {/* Executive Layout: Stacked em mobile e 2 Colunas em desktop */}
              <div className="flex flex-col lg:grid lg:grid-cols-12 h-full overflow-y-auto lg:overflow-hidden">
                {/* Left Column (Main): Briefing, Checklist, Attachments, Timeline */}
                <div className="lg:col-span-7 overflow-y-visible lg:overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 border-b lg:border-b-0 lg:border-r border-border/60">
                  {/* Briefing Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <FileText className="size-3.5 text-muted-foreground" /> Briefing & Descrição
                      </Label>
                    </div>
                    <Textarea
                      rows={6}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      onBlur={() => observations !== job.description && updateMut.mutate({ description: observations } as any)}
                      placeholder="Descreva o escopo, orientações e objetivos deste job..."
                      className="text-xs font-normal leading-relaxed bg-muted/20 border-border/60 resize-y rounded-md"
                    />
                  </div>

                  {/* Checklist (Etapas de Execução) */}
                  <div className="space-y-3 rounded-lg border border-border/60 p-4 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="size-4 text-foreground" />
                        <span className="text-xs font-semibold text-foreground">Etapas de Execução</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono-kasa tabular-nums text-muted-foreground">
                        <span>{completedStages}/{totalStages}</span>
                        <span className="font-semibold text-foreground">{progressPercent}%</span>
                      </div>
                    </div>
                    <Progress value={progressPercent} className="h-1.5 bg-muted/40" />

                    <div className="space-y-1.5 pt-2">
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
                        className="flex gap-2 pt-2"
                      >
                        <Input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder="Adicionar nova etapa de execução…"
                          className="h-8 text-xs bg-muted/20 border-border/60"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!draft.trim()}
                          className="h-8 px-3 text-xs font-mono-kasa bg-foreground text-background hover:bg-foreground/90 shrink-0"
                        >
                          <Plus className="size-3.5 mr-1" /> Adicionar
                        </Button>
                      </form>
                    </div>
                  </div>

                  {/* Anexos */}
                  <div className="space-y-3 rounded-lg border border-border/60 p-4 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="size-4 text-foreground" />
                        <span className="text-xs font-semibold text-foreground">Anexos ({attachments.length})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 px-2 text-xs font-mono-kasa text-muted-foreground hover:text-foreground"
                      >
                        <FileUp className="size-3.5 mr-1" /> Upload
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        onChange={handleFileUpload}
                      />
                    </div>

                    {attachments.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {attachments.map((file) => (
                          <div
                            key={file.id}
                            className="group relative bg-muted/20 border border-border/60 rounded-md overflow-hidden hover:border-border transition-all"
                          >
                            <button
                              type="button"
                              onClick={() => setViewerConfig({ url: file.file_url, name: file.file_name })}
                              className="block w-full text-left"
                            >
                              <FileThumbnail
                                url={file.file_url}
                                fileName={file.file_name}
                                fileType={file.file_type}
                                aspectClass="aspect-[16/10]"
                                className="rounded-none ring-0 border-b border-border/60"
                              />
                              <div className="p-1.5">
                                <p className="text-[11px] font-medium truncate text-foreground">{file.file_name}</p>
                              </div>
                            </button>

                            <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 backdrop-blur-xs p-0.5 rounded border border-border/60">
                              {job.client_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-muted-foreground hover:text-foreground"
                                  title="Enviar para aprovação"
                                  onClick={(e) => { e.stopPropagation(); setApprovalDialog({ url: file.file_url, name: file.file_name }); }}
                                >
                                  <Send className="size-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-muted-foreground hover:text-destructive"
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
                                <X className="size-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Enviados ao cliente */}
                    {approvalItems.length > 0 && (
                      <div className="pt-2 border-t border-border/60 space-y-2">
                        <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
                          Enviados para Aprovação ({approvalItems.length})
                        </span>
                        <div className="space-y-1.5">
                          {approvalItems.map((it: ApprovalItem) => (
                            <div key={it.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/60 text-xs">
                              <span className="truncate font-medium">{it.title}</span>
                              <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">
                                {it.status === 'approved' ? '✓ Aprovado' : it.status === 'rejected' ? 'Ajustes' : 'Aguardando'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Histórico & Atividades Accordion */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="history" className="border border-border/60 rounded-lg px-4 bg-card overflow-hidden">
                      <AccordionTrigger className="hover:no-underline py-3 text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <History className="size-3.5 text-muted-foreground" />
                          <span>Histórico & Atividades</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <UnifiedTimeline jobId={job.id} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                {/* Right Sidebar (Properties: 5 cols) */}
                <div className="lg:col-span-5 overflow-y-auto p-6 space-y-4 bg-muted/10">
                  <div className="space-y-3.5">
                    <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold block">
                      Propriedades
                    </span>

                    {/* Status */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Status</Label>
                      <Select
                        value={(job as any).status}
                        onValueChange={(v) => updateMut.mutate({ status: v, done_at: v === 'done' ? new Date().toISOString() : null } as any)}
                      >
                        <SelectTrigger className="h-8 text-xs font-mono-kasa bg-card border-border/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started" className="text-xs font-mono-kasa">Nova Demanda</SelectItem>
                          <SelectItem value="in_progress" className="text-xs font-mono-kasa">Em Andamento</SelectItem>
                          <SelectItem value="review" className="text-xs font-mono-kasa">Em Correção</SelectItem>
                          <SelectItem value="done" className="text-xs font-mono-kasa">Concluído</SelectItem>
                          <SelectItem value="paused" className="text-xs font-mono-kasa">Aguardando Cliente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Prioridade & Prazo Final */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Prioridade</Label>
                        <Select
                          value={job.priority}
                          onValueChange={(v) => updateMut.mutate({ priority: v })}
                        >
                          <SelectTrigger className="h-8 text-xs font-mono-kasa bg-card border-border/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high" className="text-xs font-mono-kasa">Alta</SelectItem>
                            <SelectItem value="normal" className="text-xs font-mono-kasa">Normal</SelectItem>
                            <SelectItem value="low" className="text-xs font-mono-kasa">Baixa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Prazo Final</Label>
                        <Input
                          type="date"
                          value={job.due_date ? format(new Date(job.due_date + 'T12:00:00'), 'yyyy-MM-dd') : ''}
                          onChange={(e) => updateMut.mutate({ due_date: e.target.value || null })}
                          className="h-8 text-xs font-mono-kasa bg-card border-border/60"
                        />
                      </div>
                    </div>

                    {/* Responsável Principal */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-foreground block">
                        Responsável Principal (Dono da Entrega)
                      </Label>
                      <Select
                        value={(job as any).main_responsible_id || "none"}
                        onValueChange={(v) => updateMut.mutate({ main_responsible_id: v === "none" ? null : v } as any)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-card border-border/60">
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">Sem Responsável</SelectItem>
                          {team.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                              {p.display_name || p.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-2 border-t border-border/60 space-y-3">
                      <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold block">
                        Contexto & Vínculos
                      </span>

                      {/* Cliente */}
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Cliente</Label>
                        <Select
                          value={(job as any).client_id || "none"}
                          onValueChange={(v) => updateMut.mutate({ client_id: v === "none" ? null : v } as any)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-card border-border/60">
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs">Sem Cliente</SelectItem>
                            {clients.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer">
                                {c.company || c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Projeto */}
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">Projeto</Label>
                        <Select
                          value={(job as any).project_id || "none"}
                          onValueChange={(v) => updateMut.mutate({ project_id: v === "none" ? null : v } as any)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-card border-border/60">
                            <SelectValue placeholder="Selecione um projeto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs">Sem Projeto</SelectItem>
                            {projects
                              .filter(p => !(job as any).client_id || p.client_id === (job as any).client_id)
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                                  {p.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Mostrar no Portal */}
                      <div className="flex items-center justify-between gap-3 p-2.5 rounded-md border border-border/60 bg-card mt-2">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-medium text-foreground">Visível no Portal</Label>
                          <p className="text-[10px] text-muted-foreground">Minha Kasa</p>
                        </div>
                        <Checkbox
                          checked={!!(job as any).show_in_portal}
                          onCheckedChange={(v) => updateMut.mutate({ show_in_portal: v === true } as any)}
                          className="size-4 data-[state=checked]:bg-foreground data-[state=checked]:text-background"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirm("Tem certeza que deseja remover este job permanentemente?") && deleteMut.mutate()}
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5 mr-1" /> Excluir
                      </Button>
                      <span className="text-[10px] font-mono-kasa text-muted-foreground">
                        #{job.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="roteiro" className="flex-1 overflow-y-auto p-6 mt-0">
              <JobScriptTab jobId={job.id} defaultTitle={job.title} />
            </TabsContent>
          </Tabs>
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

