import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen, Plus, Search, Star, Trash2, Download, Upload, FileText, Loader2, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientPicker } from "@/components/clients/ClientPicker";
import { supabase } from "@/integrations/supabase/client";
import {
  listKbDocuments, createKbDocument, deleteKbDocument, toggleFavorite,
  uploadKbFile, getKbFileUrl, KB_CATEGORIES, type KbDocument,
} from "@/lib/kb-api";

export const Route = createFileRoute("/_authenticated/biblioteca/")({
  head: () => ({
    meta: [
      { title: "Biblioteca — Kasa Hub" },
      { name: "description", content: "Biblioteca de conhecimento da agência: calendários, estratégias, roteiros, briefings e mais." },
    ],
  }),
  component: BibliotecaPage,
});

function BibliotecaPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [segment, setSegment] = useState("");
  const [tab, setTab] = useState<"all" | "mine" | "favorites">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KbDocument | null>(null);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then((u) => setMe(u.data.user?.id ?? null));
  }, []);

  const filter = {
    search: search || undefined,
    category: category || undefined,
    segment: segment || undefined,
    favoritesOnly: tab === "favorites",
    onlyMine: tab === "mine",
  };
  const q = useQuery({
    queryKey: ["kb-docs", filter],
    queryFn: () => listKbDocuments(filter),
  });

  const favMut = useMutation({
    mutationFn: (d: KbDocument) => toggleFavorite(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb-docs"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteKbDocument(id),
    onSuccess: () => {
      toast.success("Documento excluído");
      qc.invalidateQueries({ queryKey: ["kb-docs"] });
    },
  });

  async function downloadFile(d: KbDocument) {
    if (!d.file_path) return;
    const url = await getKbFileUrl(d.file_path);
    window.open(url, "_blank");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Biblioteca
          </h1>
          <p className="text-sm text-muted-foreground">
            Conhecimento centralizado da agência — reutilize em qualquer projeto ou no Kasa AI.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo documento
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={category || "__all"} onValueChange={(v) => setCategory(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as categorias</SelectItem>
              {KB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Segmento" value={segment} onChange={(e) => setSegment(e.target.value)} className="w-[180px]" />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="mine">Meus</TabsTrigger>
            <TabsTrigger value="favorites">Favoritos</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {q.isLoading ? (
        <div className="text-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : q.data?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>Nenhum documento ainda. Crie o primeiro!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {q.data?.map((d) => {
            const isFav = me ? d.favorited_by?.includes(me) : false;
            return (
              <Card key={d.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{d.title}</div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{d.category}</Badge>
                      {d.segment && <Badge variant="outline" className="text-[10px]">{d.segment}</Badge>}
                    </div>
                  </div>
                  <button
                    onClick={() => favMut.mutate(d)}
                    className="text-muted-foreground hover:text-yellow-500"
                    title="Favoritar"
                  >
                    <Star className={isFav ? "h-4 w-4 fill-yellow-500 text-yellow-500" : "h-4 w-4"} />
                  </button>
                </div>
                {d.description && <p className="text-xs text-muted-foreground line-clamp-3">{d.description}</p>}
                {d.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {d.tags.slice(0, 6).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                  </div>
                )}
                <div className="mt-auto pt-2 flex items-center justify-between gap-2 border-t">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <div className="flex gap-1">
                    {d.file_path && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadFile(d)} title="Baixar arquivo">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(d); setDialogOpen(true); }} title="Editar">
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive"
                      onClick={() => { if (confirm(`Excluir "${d.title}"?`)) delMut.mutate(d.id); }}
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <KbDocDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
}

function KbDocDialog({
  open, onOpenChange, editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: KbDocument | null;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(KB_CATEGORIES[0]);
  const [segment, setSegment] = useState("");
  const [clientId, setClientId] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setCategory(editing.category);
      setSegment(editing.segment ?? "");
      setClientId(editing.client_id ?? "");
      setTags(editing.tags?.join(", ") ?? "");
      setDescription(editing.description ?? "");
      setContent(editing.content ?? "");
    } else {
      setTitle(""); setCategory(KB_CATEGORIES[0]); setSegment(""); setClientId("");
      setTags(""); setDescription(""); setContent(""); setFile(null);
    }
  }, [open, editing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      let filePayload: any = {};
      if (file) {
        setUploading(true);
        try {
          const up = await uploadKbFile(file);
          filePayload = { file_path: up.path, file_name: up.name, file_type: up.type, source_type: "upload" };
        } finally {
          setUploading(false);
        }
      }
      const payload = {
        title,
        category,
        segment: segment || null,
        client_id: clientId || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        description: description || null,
        content: content || null,
        ...filePayload,
      };
      if (editing) {
        const { updateKbDocument } = await import("@/lib/kb-api");
        return updateKbDocument(editing.id, payload as any);
      }
      return createKbDocument(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Documento atualizado" : "Documento criado");
      qc.invalidateQueries({ queryKey: ["kb-docs"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar documento" : "Novo documento"}</DialogTitle>
          <DialogDescription>Adicione material de referência para reutilizar na agência.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título*</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Segmento</Label>
              <Input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="fitness, moda..." />
            </div>
          </div>
          <div>
            <Label>Cliente relacionado (opcional)</Label>
            <ClientPicker value={clientId} onChange={setClientId} allowClear placeholder="Nenhum" />
          </div>
          <div>
            <Label>Tags</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="separadas por vírgula" />
          </div>
          <div>
            <Label>Descrição curta</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Conteúdo (texto/markdown)</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="Cole aqui um roteiro, calendário, briefing..." />
          </div>
          <div>
            <Label>Arquivo (opcional)</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {editing?.file_name && !file && (
              <p className="text-xs text-muted-foreground mt-1">Arquivo atual: {editing.file_name}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMut.mutate()} disabled={!title || saveMut.isPending || uploading}>
            {(saveMut.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
