import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  ArrowLeft, Plus, Image as ImageIcon, Calendar, Pencil, Trash2,
  Settings2, Upload, Link as LinkIcon, ExternalLink, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getLaunchGrid, listGridStatuses, listGridProducts,
  createProduct, updateProduct, deleteProduct,
  createStatus, updateStatus, deleteStatus, updateLaunchGrid,
  uploadProductImage,
  type LaunchGridProduct, type LaunchGridStatus,
} from "@/lib/launch-grids-api";

export const Route = createFileRoute("/_authenticated/lancamentos/$gridId")({
  component: GridDetailPage,
});

function GridDetailPage() {
  const { gridId } = useParams({ from: "/_authenticated/lancamentos/$gridId" });
  const qc = useQueryClient();
  const [productDialog, setProductDialog] = useState<{ mode: "new" | "edit"; product?: LaunchGridProduct; defaultStatusId?: string } | null>(null);
  const [statusesDialog, setStatusesDialog] = useState(false);

  const { data: grid } = useQuery({
    queryKey: ["launch-grid", gridId],
    queryFn: () => getLaunchGrid(gridId),
  });
  const { data: statuses = [] } = useQuery({
    queryKey: ["launch-grid-statuses", gridId],
    queryFn: () => listGridStatuses(gridId),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["launch-grid-products", gridId],
    queryFn: () => listGridProducts(gridId),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, status_id }: { id: string; status_id: string }) => updateProduct(id, { status_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["launch-grid-products", gridId] }),
  });

  const archiveMut = useMutation({
    mutationFn: (newStatus: string) => updateLaunchGrid(gridId, { status: newStatus as any }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["launch-grid", gridId] });
      qc.invalidateQueries({ queryKey: ["launch-grids"] });
    },
  });

  if (!grid) return <div className="p-8 text-center text-foreground/50">Carregando...</div>;

  const clientName = grid.clients?.company || grid.clients?.name || "Cliente";

  return (
    <div className="p-4 md:p-8 max-w-[1800px] mx-auto">
      <div className="mb-6">
        <Link to="/lancamentos" className="text-sm text-foreground/60 hover:text-primary flex items-center gap-1 mb-3">
          <ArrowLeft className="size-3.5" /> Voltar
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{grid.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-foreground/60">
              <span className="font-medium">{clientName}</span>
              {grid.launch_date && (
                <>
                  <span>•</span>
                  <Calendar className="size-3.5" />
                  <span>{format(new Date(grid.launch_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
                </>
              )}
              <Badge variant={grid.status === "active" ? "default" : "outline"}>{grid.status}</Badge>
            </div>
            {grid.description && (
              <p className="text-sm text-foreground/70 mt-2 max-w-2xl">{grid.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setStatusesDialog(true)}>
              <Settings2 className="size-4" /> Etapas
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => archiveMut.mutate(grid.status === "active" ? "archived" : "active")}
            >
              {grid.status === "active" ? <><EyeOff className="size-4" /> Arquivar</> : <><Eye className="size-4" /> Reativar</>}
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setProductDialog({ mode: "new" })}>
              <Plus className="size-4" /> Produto
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.length === 0 ? (
          <div className="text-foreground/50 text-sm">Configure as etapas em "Etapas".</div>
        ) : (
          statuses.map((s) => {
            const items = products.filter((p) => p.status_id === s.id);
            return (
              <div key={s.id} className="w-72 shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                    <h3 className="text-sm font-semibold">{s.label}</h3>
                    <span className="text-xs text-foreground/50">{items.length}</span>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="size-6"
                    onClick={() => setProductDialog({ mode: "new", defaultStatusId: s.id })}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
                <div className="space-y-2 min-h-[80px] bg-muted/30 rounded-lg p-2">
                  {items.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      statuses={statuses}
                      onEdit={() => setProductDialog({ mode: "edit", product: p })}
                      onMove={(statusId) => moveMut.mutate({ id: p.id, status_id: statusId })}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="text-center text-xs text-foreground/30 py-6">Vazio</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {productDialog && (
        <ProductDialog
          gridId={gridId}
          statuses={statuses}
          mode={productDialog.mode}
          product={productDialog.product}
          defaultStatusId={productDialog.defaultStatusId || statuses[0]?.id}
          onClose={() => setProductDialog(null)}
        />
      )}

      {statusesDialog && (
        <StatusesDialog
          gridId={gridId}
          statuses={statuses}
          onClose={() => setStatusesDialog(false)}
        />
      )}
    </div>
  );
}

function ProductCard({
  product, statuses, onEdit, onMove,
}: {
  product: LaunchGridProduct;
  statuses: LaunchGridStatus[];
  onEdit: () => void;
  onMove: (statusId: string) => void;
}) {
  return (
    <Card className="p-2 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={onEdit}>
      {product.image_url && (
        <div
          className="h-24 rounded mb-2 bg-cover bg-center"
          style={{ backgroundImage: `url(${product.image_url})` }}
        />
      )}
      <div className="font-medium text-sm leading-tight mb-1">{product.name}</div>
      {product.description && (
        <div className="text-xs text-foreground/60 line-clamp-2 mb-2">{product.description}</div>
      )}
      <div className="flex items-center justify-between gap-2">
        {product.due_date ? (
          <span className="text-[10px] text-foreground/60 flex items-center gap-1">
            <Calendar className="size-3" />
            {format(new Date(product.due_date), "dd/MM", { locale: ptBR })}
          </span>
        ) : <span />}
        <Select value={product.status_id || ""} onValueChange={(v) => { onMove(v); }}>
          <SelectTrigger
            className="h-6 text-[10px] w-auto min-w-0 border-0 bg-transparent px-1"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue placeholder="Mover" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}

function ProductDialog({
  gridId, statuses, mode, product, defaultStatusId, onClose,
}: {
  gridId: string;
  statuses: LaunchGridStatus[];
  mode: "new" | "edit";
  product?: LaunchGridProduct;
  defaultStatusId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [statusId, setStatusId] = useState(product?.status_id ?? defaultStatusId ?? "");
  const [dueDate, setDueDate] = useState(product?.due_date ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [notes, setNotes] = useState(product?.notes ?? "");
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>(product?.links ?? []);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (mode === "new") {
        return createProduct({
          grid_id: gridId, name, description: description || null,
          status_id: statusId || null, due_date: dueDate || null,
          image_url: imageUrl || null, notes: notes || null, links,
        });
      }
      return updateProduct(product!.id, {
        name, description: description || null, status_id: statusId || null,
        due_date: dueDate || null, image_url: imageUrl || null, notes: notes || null,
        links,
      });
    },
    onSuccess: () => {
      toast.success(mode === "new" ? "Produto criado" : "Produto atualizado");
      qc.invalidateQueries({ queryKey: ["launch-grid-products", gridId] });
      onClose();
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const delMut = useMutation({
    mutationFn: () => deleteProduct(product!.id),
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["launch-grid-products", gridId] });
      onClose();
    },
  });

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      const url = await uploadProductImage(gridId, file);
      setImageUrl(url);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error("Erro upload: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "new" ? "Novo produto" : "Editar produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Imagem */}
          <div>
            <Label>Imagem do produto</Label>
            <div className="flex items-center gap-3 mt-1">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="size-20 object-cover rounded border" />
              ) : (
                <div className="size-20 rounded border bg-muted flex items-center justify-center">
                  <ImageIcon className="size-6 text-foreground/30" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                />
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="size-4" /> {uploading ? "Enviando..." : "Enviar imagem"}
                </Button>
                {imageUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl("")}>Remover</Button>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Batom Matte Vermelho" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Etapa</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data prevista</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Links (drive, posts, etc)</Label>
              <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => setLinks([...links, { label: "", url: "" }])}>
                <Plus className="size-3" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Rótulo (ex: Drive)"
                    value={l.label}
                    onChange={(e) => setLinks(links.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
                    className="w-1/3"
                  />
                  <Input
                    placeholder="https://..."
                    value={l.url}
                    onChange={(e) => setLinks(links.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x))}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setLinks(links.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Observações internas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {mode === "edit" && (
            <Button
              variant="ghost"
              className="text-destructive mr-auto"
              onClick={() => { if (confirm("Remover produto?")) delMut.mutate(); }}
            >
              <Trash2 className="size-4 mr-1" /> Remover
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => saveMut.mutate()} disabled={!name || saveMut.isPending}>
            {saveMut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusesDialog({
  gridId, statuses, onClose,
}: {
  gridId: string;
  statuses: LaunchGridStatus[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#94a3b8");

  const refetch = () => qc.invalidateQueries({ queryKey: ["launch-grid-statuses", gridId] });

  const addMut = useMutation({
    mutationFn: () => createStatus({ grid_id: gridId, label: newLabel, color: newColor }),
    onSuccess: () => { setNewLabel(""); refetch(); },
  });
  const updMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => updateStatus(id, patch),
    onSuccess: refetch,
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteStatus(id),
    onSuccess: refetch,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Etapas do grid</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {statuses.map((s) => (
            <div key={s.id} className="flex items-center gap-2 border rounded p-2">
              <input
                type="color"
                value={s.color}
                onChange={(e) => updMut.mutate({ id: s.id, patch: { color: e.target.value } })}
                className="size-8 rounded cursor-pointer"
              />
              <Input
                value={s.label}
                onChange={(e) => updMut.mutate({ id: s.id, patch: { label: e.target.value } })}
                className="flex-1"
              />
              <div className="flex items-center gap-1 text-xs">
                <Switch
                  checked={s.is_done}
                  onCheckedChange={(v) => updMut.mutate({ id: s.id, patch: { is_done: v } })}
                />
                <span className="text-foreground/60">Final</span>
              </div>
              <Button
                variant="ghost" size="icon"
                onClick={() => { if (confirm("Remover etapa? Produtos ficarão sem etapa.")) delMut.mutate(s.id); }}
              >
                <Trash2 className="size-4 text-destructive/70" />
              </Button>
            </div>
          ))}

          <div className="border-t pt-3">
            <Label className="text-xs">Nova etapa</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="size-8 rounded cursor-pointer"
              />
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Aguardando fornecedor"
                className="flex-1"
              />
              <Button onClick={() => addMut.mutate()} disabled={!newLabel || addMut.isPending}>
                Adicionar
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
