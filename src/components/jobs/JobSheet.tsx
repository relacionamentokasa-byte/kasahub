import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
} from "@/lib/ops-api";
import { Trash2, Plus, Send, FileText, Info, CheckSquare, Paperclip, MessageSquare, History, CheckCircle2, Link as LinkIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { JOB_TYPES } from "@/lib/job-types";
import { supabase } from "@/integrations/supabase/client";


export function JobSheet({
  job,
  stages,
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

  const updateMut = useMutation({
    mutationFn: (patch: Partial<Job>) => updateJob(job!.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteJob(job!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job removido");
      onClose();
    },
  });
  const addItemMut = useMutation({
    mutationFn: (content: string) => addChecklistItem(job!.id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-checklist", job!.id] });
      setDraft("");
    },
  });
  const toggleItemMut = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleChecklistItem(id, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-checklist", job!.id] }),
  });
  const delItemMut = useMutation({
    mutationFn: (id: string) => deleteChecklistItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-checklist", job!.id] }),
  });
  const commentMut = useMutation({
    mutationFn: (content: string) => addJobComment(job!.id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-comments", job!.id] });
      setComment("");
    },
  });

  if (!job) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="bg-surface border-border w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">
            <input
              defaultValue={job.title}
              onBlur={(e) => e.target.value !== job.title && updateMut.mutate({ title: e.target.value })}
              className="bg-transparent border-none outline-none w-full focus:ring-0"
            />
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList className="w-full flex justify-start gap-1 overflow-x-auto scrollbar-none bg-transparent h-auto p-0 border-b border-border rounded-none">
              <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs">Detalhes</TabsTrigger>
              <TabsTrigger value="briefing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs">Briefing</TabsTrigger>
              <TabsTrigger value="checklist" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs">Checklist</TabsTrigger>
              <TabsTrigger value="files" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs">Arquivos</TabsTrigger>
              <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs">Comentários</TabsTrigger>
              <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] capitalize text-foreground/50">Status</Label>
                  <Select
                    value={(job as any).status || "not_started"}
                    onValueChange={(v) => updateMut.mutate({ status: v } as any)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(JOB_STATUS_LABELS).map(([val, { label }]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] capitalize text-foreground/50">Tipo de Job</Label>
                  <Select
                    value={(job as any).job_type || "post"}
                    onValueChange={(v) => updateMut.mutate({ job_type: v } as any)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">

                  <Label className="text-[10px] capitalize text-foreground/50">Prioridade</Label>
                  <Select
                    value={job.priority}
                    onValueChange={(v) => updateMut.mutate({ priority: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-[10px] capitalize text-foreground/50">Prazo</Label>
                  <Input
                    type="date"
                    defaultValue={job.due_date ?? ""}
                    onBlur={(e) => updateMut.mutate({ due_date: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-[10px] capitalize text-foreground/50">Descrição Geral</Label>
                  <Textarea
                    rows={2}
                    defaultValue={job.description ?? ""}
                    onBlur={(e) => updateMut.mutate({ description: e.target.value || null })}
                  />
                </div>
              </div>

              {/* Campos Personalizados Dinâmicos baseados no tipo do Job */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-[10px] uppercase font-bold text-primary tracking-wider flex items-center gap-1.5">
                  <Plus className="size-3" /> Campos da Tarefa
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {/* Se houver labels ou informações sobre o fluxo no job, poderíamos buscar o esquema aqui. 
                      Para implementação imediata, vamos checar se o job tem custom_fields e renderizar inputs */}
                  {Object.entries((job as any).custom_fields || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-[10px] capitalize text-foreground/50">{key}</Label>
                      {typeof val === 'string' && val.length > 50 ? (
                        <Textarea 
                          defaultValue={val} 
                          onBlur={(e) => {
                            const next = { ...(job as any).custom_fields, [key]: e.target.value };
                            updateMut.mutate({ custom_fields: next } as any);
                          }}
                        />
                      ) : (
                        <Input 
                          defaultValue={val}
                          onBlur={(e) => {
                            const next = { ...(job as any).custom_fields, [key]: e.target.value };
                            updateMut.mutate({ custom_fields: next } as any);
                          }}
                        />
                      )}
                    </div>
                  ))}
                  {Object.keys((job as any).custom_fields || {}).length === 0 && (
                    <p className="text-[10px] text-foreground/40 italic">Nenhum campo personalizado definido para este tipo de job.</p>
                  )}
                </div>
              </div>

              {(job as any).status === 'in_progress' && (
                <div className="pt-4 border-t border-border">
                  <Button 
                    className="w-full bg-primary text-primary-foreground font-semibold gap-2"
                    onClick={() => {
                      updateMut.mutate({ status: 'review' } as any);
                      toast.success("Job enviado para aprovação!");
                    }}
                  >
                    <CheckCircle2 className="size-4" /> Enviar para Aprovação
                  </Button>
                  <p className="text-[10px] text-center text-foreground/40 mt-2">
                    Isso gerará um link para o cliente revisar a entrega.
                  </p>
                </div>
              )}

              {((job as any).status === 'review' || (job as any).status === 'done') && (
                <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <LinkIcon className="size-3.5" /> Link de Aprovação
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => {
                      const url = `${window.location.origin}/approve/${(job as any).approval_token}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Link copiado!");
                    }}>Copiar</Button>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-background border border-border rounded text-[10px] font-mono text-foreground/60 truncate">
                    {window.location.origin}/approve/{(job as any).approval_token}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="briefing" className="space-y-4 pt-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] capitalize text-foreground/50">Objetivo da Tarefa</Label>
                  <Textarea 
                    rows={2}
                    defaultValue={(job as any).briefing_objective ?? ""}
                    onBlur={(e) => updateMut.mutate({ briefing_objective: e.target.value } as any)}
                    placeholder="O que este job deve atingir?"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] capitalize text-foreground/50">Orientações e Diretrizes</Label>
                  <Textarea 
                    rows={4}
                    defaultValue={(job as any).briefing_guidelines ?? ""}
                    onBlur={(e) => updateMut.mutate({ briefing_guidelines: e.target.value } as any)}
                    placeholder="Regras, tom de voz, restrições..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] capitalize text-foreground/50">Referências e Links</Label>
                  <Textarea 
                    rows={2}
                    defaultValue={(job as any).briefing_references ?? ""}
                    onBlur={(e) => updateMut.mutate({ briefing_references: e.target.value } as any)}
                    placeholder="Links, inspirações, drives..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] capitalize text-foreground/50">Observações Extras</Label>
                  <Textarea 
                    rows={2}
                    defaultValue={(job as any).briefing_notes ?? ""}
                    onBlur={(e) => updateMut.mutate({ briefing_notes: e.target.value } as any)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="checklist" className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground/70">Checklist de Execução</h3>
                <span className="text-[10px] text-foreground/40 font-mono">
                  {checklist.filter((c) => c.done).length}/{checklist.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group p-2 hover:bg-muted/10 rounded-lg transition-colors">
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={(v) => toggleItemMut.mutate({ id: item.id, done: !!v })}
                    />
                    <span className={`flex-1 text-sm ${item.done ? "line-through text-foreground/40" : ""}`}>
                      {item.content}
                    </span>
                    <button
                      onClick={() => delItemMut.mutate(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
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
                    placeholder="Novo item de checklist…"
                    className="h-9"
                  />
                  <Button type="submit" size="icon" variant="ghost" className="size-9 shrink-0">
                    <Plus className="size-4" />
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="files" className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground/70">Anexos do Job</h3>
                <Button variant="outline" size="sm" className="h-8 gap-2 text-[10px]" onClick={() => toast.info("Upload em breve")}>
                  <Paperclip className="size-3.5" /> Subir Arquivo
                </Button>
              </div>
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg group">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded bg-background flex items-center justify-center">
                        <FileText className="size-4 text-foreground/40" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">{att.file_name}</p>
                        <p className="text-[10px] text-foreground/40">{format(new Date(att.created_at), "dd/MM/yyyy")}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100" asChild>
                      <a href={att.file_url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /></a>
                    </Button>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                    <p className="text-[10px] text-foreground/40">Nenhum arquivo anexado a este job.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="space-y-4 pt-2">
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-none">
                {comments.map((c) => (
                  <div key={c.id} className="bg-surface-elevated border border-border rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-primary">Sistema</span>
                      <span className="text-[9px] text-foreground/30">
                        {format(new Date(c.created_at), "dd MMM HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (comment.trim()) commentMut.mutate(comment.trim());
                }}
                className="flex gap-2 sticky bottom-0 bg-surface pt-2"
              >
                <Textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comentar… use @nome para mencionar"
                  className="resize-none"
                />
                <Button type="submit" size="icon" className="size-10 shrink-0 bg-primary text-primary-foreground">
                  <Send className="size-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="history" className="space-y-3 pt-2">
              {history.map((h: any) => (
                <div key={h.id} className="flex gap-3 items-start border-l-2 border-muted pl-4 py-1">
                  <div className="size-2 rounded-full bg-muted -ml-[21px] mt-1.5" />
                  <div className="flex-1">
                    <p className="text-xs text-foreground/70">
                      <span className="font-semibold text-foreground">Ação: {h.action}</span>
                      {h.from_value && ` de ${h.from_value}`}
                      {h.to_value && ` para ${h.to_value}`}
                    </p>
                    <p className="text-[10px] text-foreground/40">
                      {format(new Date(h.created_at), "dd MMM yyyy, HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-[10px] text-center text-foreground/40 py-8">Nenhum histórico registrado.</p>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => confirm("Remover este job?") && deleteMut.mutate()}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-[10px] h-8"
            >
              <Trash2 className="size-3.5 mr-2" /> Excluir job
            </Button>
            <span className="text-[10px] text-foreground/20 font-mono">
              ID: {job.id.slice(0, 8)}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
