import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExternalLink, Wand2, Trash2 } from "lucide-react";
import {
  createEditorialPost, updateEditorialPost, deleteEditorialPost,
  type EditorialPost, SOCIAL_LABEL, CONTENT_TYPE_LABEL, STATUS_LABEL,
  type SocialNetwork, type EditorialContentType, type EditorialStatus,
} from "@/lib/editorial-api";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  post?: EditorialPost | null;
  defaultDate?: Date | null;
}

const empty = (clientId: string, date?: Date | null) => ({
  client_id: clientId,
  title: "",
  scheduled_at: (date ?? new Date()).toISOString().slice(0, 16),
  social_network: "instagram" as SocialNetwork,
  content_type: "reels" as EditorialContentType,
  description: "",
  status: "planned" as EditorialStatus,
});

export function EditorialPostDialog({ open, onOpenChange, clientId, post, defaultDate }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty(clientId, defaultDate));

  useEffect(() => {
    if (post) {
      setForm({
        client_id: post.client_id,
        title: post.title,
        scheduled_at: new Date(post.scheduled_at).toISOString().slice(0, 16),
        social_network: post.social_network,
        content_type: post.content_type,
        description: post.description ?? "",
        status: post.status,
      });
    } else if (open) {
      setForm(empty(clientId, defaultDate));
    }
  }, [post, open, clientId, defaultDate]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
      };
      if (post) return updateEditorialPost(post.id, payload);
      return createEditorialPost(payload as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["editorial-posts"] });
      toast.success(post ? "Post atualizado" : "Post criado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteEditorialPost(post!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["editorial-posts"] });
      toast.success("Post excluído");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertToJob = () => {
    if (!post) return;
    navigate({
      to: "/jobs",
      search: { new: true, clientId: post.client_id } as any,
    });
    toast.info("Crie o Job com base neste post e vincule depois pelo campo Job ID.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {post ? "Editar post" : "Novo post no calendário"}
          </DialogTitle>
          <DialogDescription>
            Planeje o conteúdo para a rede social do cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EditorialStatus })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Rede social</Label>
              <Select value={form.social_network} onValueChange={(v) => setForm({ ...form, social_network: v as SocialNetwork })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOCIAL_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <span className="inline-flex items-center gap-2">
                        <SocialIcon network={k as SocialNetwork} size={16} /> {v}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de conteúdo</Label>
              <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v as EditorialContentType })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTENT_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição / Copy</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="bg-background" />
          </div>
          {post?.job_id && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline">Vinculado a Job</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => navigate({ to: "/jobs", search: { openJobId: post.job_id! } as any })}
              >
                <ExternalLink className="size-3 mr-1" /> Abrir Job
              </Button>
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {post && (
            <Button variant="ghost" className="text-destructive sm:mr-auto" onClick={() => { if (confirm("Excluir este post?")) del.mutate(); }}>
              <Trash2 className="size-4 mr-1" /> Excluir
            </Button>
          )}
          {post && !post.job_id && (
            <Button variant="outline" onClick={convertToJob}>
              <Wand2 className="size-4 mr-1" /> Converter em Job
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!form.title || save.isPending}>
            {post ? "Salvar" : "Criar post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
