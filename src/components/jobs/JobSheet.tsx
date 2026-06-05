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
  type Job,
  type JobStage,
} from "@/lib/ops-api";
import { Trash2, Plus, Send } from "lucide-react";
import { toast } from "sonner";

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

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-foreground/50">Etapa</Label>
              <Select
                value={job.stage_id ?? undefined}
                onValueChange={(v) => updateMut.mutate({ stage_id: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-foreground/50">Prioridade</Label>
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
              <Label className="text-[10px] uppercase tracking-widest text-foreground/50">Prazo</Label>
              <Input
                type="date"
                defaultValue={job.due_date ?? ""}
                onBlur={(e) => updateMut.mutate({ due_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-[10px] uppercase tracking-widest text-foreground/50">Descrição</Label>
              <Textarea
                rows={3}
                defaultValue={job.description ?? ""}
                onBlur={(e) => updateMut.mutate({ description: e.target.value || null })}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] uppercase tracking-widest text-foreground/50 font-mono">Checklist</h3>
              <span className="text-[10px] text-foreground/40 font-mono">
                {checklist.filter((c) => c.done).length}/{checklist.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
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
                className="flex gap-2"
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Adicionar item…"
                  className="h-9"
                />
                <Button type="submit" size="icon" variant="ghost" className="size-9 shrink-0">
                  <Plus className="size-4" />
                </Button>
              </form>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-foreground/50 font-mono mb-2">
              Comentários
            </h3>
            <div className="space-y-3 mb-3">
              {comments.map((c) => (
                <div key={c.id} className="bg-surface-elevated border border-border rounded-lg p-3">
                  <div className="text-xs text-foreground/40 mb-1">
                    {format(new Date(c.created_at), "dd MMM HH:mm")}
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
              className="flex gap-2"
            >
              <Textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comentar… use @nome para mencionar"
              />
              <Button type="submit" size="icon" className="size-10 shrink-0 bg-primary text-primary-foreground">
                <Send className="size-4" />
              </Button>
            </form>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => confirm("Remover este job?") && deleteMut.mutate()}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
            >
              <Trash2 className="size-4 mr-2" /> Excluir job
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
