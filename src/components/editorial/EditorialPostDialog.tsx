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
import { ExternalLink, Wand2, Trash2, Upload, X } from "lucide-react";
import {
  createEditorialPost, updateEditorialPost, deleteEditorialPost, uploadEditorialCover,
  type EditorialPost, SOCIAL_LABEL, CONTENT_TYPE_LABEL, STATUS_LABEL,
  type SocialNetwork, type EditorialContentType, type EditorialStatus,
} from "@/lib/editorial-api";
import { SocialIcon } from "./SocialIcon";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  post?: EditorialPost | null;
  defaultDate?: Date | null;
}

// Format Date -> "YYYY-MM-DDTHH:mm" in LOCAL time (datetime-local expects local, not UTC)
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const empty = (clientId: string, date?: Date | null) => ({
  client_id: clientId,
  title: "",
  scheduled_at: toLocalInput(date ?? new Date()),
  social_network: "instagram" as SocialNetwork,
  content_type: "reels" as EditorialContentType,
  description: "",
  status: "planned" as EditorialStatus,
  cover_url: "" as string,
});

export function EditorialPostDialog({ open, onOpenChange, clientId, post, defaultDate }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty(clientId, defaultDate));
  const [uploading, setUploading] = useState(false);

  const handleCoverUpload = async (file: File) => {
    try {
      setUploading(true);
      const url = await uploadEditorialCover(clientId, file);
      setForm((f) => ({ ...f, cover_url: url }));
      toast.success("Capa enviada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Only re-hydrate when the dialog opens or the post identity changes —
  // NOT on every parent re-render (which would randomly reset the time field
  // if the parent's cursor/defaultDate updated while the dialog is open).
  useEffect(() => {
    if (!open) return;
    if (post) {
      setForm({
        client_id: post.client_id,
        title: post.title,
        scheduled_at: toLocalInput(new Date(post.scheduled_at)),
        social_network: post.social_network,
        content_type: post.content_type,
        description: post.description ?? "",
        status: post.status,
        cover_url: post.cover_url ?? "",
      });
    } else {
      setForm(empty(clientId, defaultDate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, post?.id]);

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
            <Label>Imagem de capa (aparece no Feed)</Label>
            {form.cover_url ? (
              <div className="relative inline-block">
                <img src={form.cover_url} alt="capa" className="h-32 w-32 object-cover rounded-lg border border-border" />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => setForm({ ...form, cover_url: "" })}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center h-32 w-32 rounded-lg border border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors text-foreground/40">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }}
                />
                <div className="flex flex-col items-center gap-1 text-xs">
                  <Upload className="size-5" />
                  {uploading ? "Enviando..." : "Subir capa"}
                </div>
              </label>
            )}
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
