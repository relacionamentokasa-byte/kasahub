import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Plus, Settings2, LayoutGrid, Table as TableIcon, Image as ImageIcon,
  Pencil, Trash2, Upload, Link as LinkIcon, ExternalLink, Calendar,
  Rocket, GripVertical, X, Briefcase, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StorageImage } from "@/components/ui/storage-image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getOrCreateGridByClient, updateLaunchGrid,
  listGridStatuses, createStatus, updateStatus, deleteStatus,
  listGridProducts, createProduct, updateProduct, deleteProduct,
  uploadProductImage, listProductJobs,
  type LaunchGridProduct, type LaunchGridStatus, type LaunchGridSku,
  type LaunchGridBoletim, type BoletimImagens,
  type AspectoFisico, type Acondicionar,
} from "@/lib/launch-grids-api";
import { cn } from "@/lib/utils";

type Props = { clientId: string; clientName: string };
type ViewMode = "table" | "kanban" | "gallery";

export function LaunchGridSection({ clientId, clientName }: Props) {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewMode>("table");
  const [productSheet, setProductSheet] = useState<{ product?: LaunchGridProduct; defaultStatusId?: string } | null>(null);
  const [statusesOpen, setStatusesOpen] = useState(false);
  const [titleEdit, setTitleEdit] = useState(false);

  const { data: grid } = useQuery({
    queryKey: ["launch-grid-by-client", clientId],
    queryFn: () => getOrCreateGridByClient(clientId, clientName),
  });

  const gridId = grid?.id;

  const { data: statuses = [] } = useQuery({
    queryKey: ["launch-grid-statuses", gridId],
    queryFn: () => listGridStatuses(gridId!),
    enabled: !!gridId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["launch-grid-products", gridId],
    queryFn: () => listGridProducts(gridId!),
    enabled: !!gridId,
  });

  const gridMut = useMutation({
    mutationFn: (patch: any) => updateLaunchGrid(gridId!, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["launch-grid-by-client", clientId] }),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, status_id }: { id: string; status_id: string | null }) =>
      updateProduct(id, { status_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["launch-grid-products", gridId] }),
  });

  const delProductMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["launch-grid-products", gridId] });
    },
  });

  if (!grid) {
    return <div className="p-8 text-center text-foreground/50">Carregando grid…</div>;
  }

  const statusMap = new Map(statuses.map((s) => [s.id, s]));
  const launchDate = grid.launch_date ? format(new Date(grid.launch_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1 min-w-0">
          {titleEdit ? (
            <Input
              autoFocus
              defaultValue={grid.title}
              onBlur={(e) => { gridMut.mutate({ title: e.target.value || grid.title }); setTitleEdit(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setTitleEdit(false); }}
              className="text-xl font-bold"
            />
          ) : (
            <h2 className="text-xl font-bold flex items-center gap-2 cursor-pointer hover:text-primary" onClick={() => setTitleEdit(true)}>
              <Rocket className="size-5 text-primary" />
              {grid.title}
              <Pencil className="size-3.5 text-foreground/30" />
            </h2>
          )}
          <div className="flex items-center gap-3 mt-1 text-sm text-foreground/60">
            <input
              type="date"
              defaultValue={grid.launch_date ?? ""}
              onChange={(e) => gridMut.mutate({ launch_date: e.target.value || null })}
              className="bg-transparent border-0 text-xs text-foreground/60 hover:text-primary cursor-pointer"
            />
            {launchDate && <span className="text-xs">· lançamento previsto</span>}
            <Badge variant="outline" className="text-xs">{products.length} produto{products.length === 1 ? "" : "s"}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-border overflow-hidden">
            {[
              { v: "table" as const, icon: TableIcon, label: "Tabela" },
              { v: "kanban" as const, icon: LayoutGrid, label: "Kanban" },
              { v: "gallery" as const, icon: ImageIcon, label: "Galeria" },
            ].map((b) => (
              <button
                key={b.v}
                onClick={() => setView(b.v)}
                className={cn(
                  "px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors",
                  view === b.v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                )}
              >
                <b.icon className="size-3.5" />
                <span className="hidden sm:inline">{b.label}</span>
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setStatusesOpen(true)}>
            <Settings2 className="size-3.5" /> Etapas
          </Button>
          <Button size="sm" onClick={() => setProductSheet({ defaultStatusId: statuses[0]?.id })} disabled={statuses.length === 0}>
            <Plus className="size-3.5" /> Produto
          </Button>
        </div>
      </div>

      {/* Empty state: sem etapas */}
      {statuses.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <Settings2 className="size-10 mx-auto text-foreground/30 mb-3" />
          <h3 className="font-semibold mb-1">Defina as etapas do seu lançamento</h3>
          <p className="text-sm text-foreground/60 mb-4">
            Crie as colunas que representam o fluxo dos produtos (ex: Briefing, Produção, Aprovação, Publicado).
          </p>
          <Button onClick={() => setStatusesOpen(true)}>
            <Plus className="size-3.5" /> Criar primeira etapa
          </Button>
        </Card>
      )}

      {/* Visões */}
      {statuses.length > 0 && (
        <>
          {view === "table" && (
            <TableView
              products={products}
              statuses={statuses}
              onOpen={(p) => setProductSheet({ product: p })}
              onMove={(id, status_id) => moveMut.mutate({ id, status_id })}
              onDelete={(id) => { if (confirm("Remover produto?")) delProductMut.mutate(id); }}
            />
          )}
          {view === "kanban" && (
            <KanbanView
              products={products}
              statuses={statuses}
              statusMap={statusMap}
              onOpen={(p) => setProductSheet({ product: p })}
              onAdd={(statusId) => setProductSheet({ defaultStatusId: statusId })}
              onMove={(id, status_id) => moveMut.mutate({ id, status_id })}
            />
          )}
          {view === "gallery" && (
            <GalleryView
              products={products}
              statusMap={statusMap}
              onOpen={(p) => setProductSheet({ product: p })}
            />
          )}
        </>
      )}

      {/* Dialog gerenciar etapas */}
      {statusesOpen && (
        <StatusesDialog
          gridId={grid.id}
          statuses={statuses}
          onClose={() => setStatusesOpen(false)}
        />
      )}

      {/* Sheet do produto */}
      {productSheet && (
        <ProductSheet
          gridId={grid.id}
          clientId={clientId}
          statuses={statuses}
          product={productSheet.product}
          defaultStatusId={productSheet.defaultStatusId}
          onClose={() => setProductSheet(null)}
        />
      )}
    </div>
  );
}

/* ============= TABLE VIEW ============= */
function TableView({
  products, statuses, onOpen, onMove, onDelete,
}: {
  products: LaunchGridProduct[];
  statuses: LaunchGridStatus[];
  onOpen: (p: LaunchGridProduct) => void;
  onMove: (id: string, statusId: string) => void;
  onDelete: (id: string) => void;
}) {
  if (products.length === 0) return <EmptyProducts />;
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => {
            const st = statuses.find((s) => s.id === p.status_id);
            return (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => onOpen(p)}>
                <TableCell>
                  {p.image_url ? (
                    <StorageImage src={p.image_url} alt="" className="size-10 rounded object-cover" />
                  ) : (
                    <div className="size-10 rounded bg-muted flex items-center justify-center">
                      <ImageIcon className="size-4 text-foreground/30" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{p.name}</span>
                    {p.skus && p.skus.length > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1">
                        <Package className="size-2.5" />
                        {p.skus.filter((s) => s.done).length}/{p.skus.length}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select value={p.status_id ?? ""} onValueChange={(v) => onMove(p.id, v)}>
                    <SelectTrigger className="h-8 w-40">
                      <span className="flex items-center gap-2">
                        {st && <span className="size-2 rounded-full" style={{ background: st.color }} />}
                        <SelectValue placeholder="—" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ background: s.color }} />
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs text-foreground/70">
                  {p.due_date ? format(new Date(p.due_date), "dd/MM/yyyy") : "—"}
                </TableCell>
                <TableCell className="text-xs text-foreground/60 max-w-xs truncate">{p.notes || "—"}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => onDelete(p.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ============= KANBAN VIEW ============= */
function KanbanView({
  products, statuses, statusMap, onOpen, onAdd, onMove,
}: {
  products: LaunchGridProduct[];
  statuses: LaunchGridStatus[];
  statusMap: Map<string, LaunchGridStatus>;
  onOpen: (p: LaunchGridProduct) => void;
  onAdd: (statusId: string) => void;
  onMove: (id: string, statusId: string) => void;
}) {
  const byStatus = useMemo(() => {
    const map = new Map<string, LaunchGridProduct[]>();
    statuses.forEach((s) => map.set(s.id, []));
    products.forEach((p) => {
      if (p.status_id && map.has(p.status_id)) map.get(p.status_id)!.push(p);
    });
    return map;
  }, [products, statuses]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((s) => {
        const items = byStatus.get(s.id) || [];
        return (
          <div key={s.id} className="w-72 flex-shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                <span className="font-semibold text-sm">{s.label}</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{items.length}</Badge>
              </div>
              <Button variant="ghost" size="icon" className="size-6" onClick={() => onAdd(s.id)}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
              {items.map((p) => (
                <Card
                  key={p.id}
                  className="p-2 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onOpen(p)}
                >
                  {p.image_url && (
                    <StorageImage src={p.image_url} alt="" className="w-full h-24 object-cover rounded mb-2" />
                  )}
                  <div className="font-medium text-sm leading-tight">{p.name}</div>
                  {p.due_date && (
                    <div className="text-[10px] text-foreground/50 mt-1 flex items-center gap-1">
                      <Calendar className="size-2.5" />
                      {format(new Date(p.due_date), "dd/MM")}
                    </div>
                  )}
                  <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                    <Select value={p.status_id ?? ""} onValueChange={(v) => onMove(p.id, v)}>
                      <SelectTrigger className="h-6 text-[10px] flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((st) => (
                          <SelectItem key={st.id} value={st.id}>{st.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              ))}
              {items.length === 0 && (
                <div className="text-xs text-foreground/30 text-center py-6">vazio</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============= GALLERY VIEW ============= */
function GalleryView({
  products, statusMap, onOpen,
}: {
  products: LaunchGridProduct[];
  statusMap: Map<string, LaunchGridStatus>;
  onOpen: (p: LaunchGridProduct) => void;
}) {
  if (products.length === 0) return <EmptyProducts />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {products.map((p) => {
        const st = p.status_id ? statusMap.get(p.status_id) : undefined;
        return (
          <Card
            key={p.id}
            className="overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
            onClick={() => onOpen(p)}
          >
            <div className="aspect-square bg-muted relative">
              {p.image_url ? (
                <StorageImage src={p.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="size-10 text-foreground/20" />
                </div>
              )}
              {st && (
                <Badge
                  className="absolute top-2 left-2 text-[10px] border-0"
                  style={{ background: st.color, color: "white" }}
                >
                  {st.label}
                </Badge>
              )}
            </div>
            <div className="p-3">
              <div className="font-medium text-sm leading-tight truncate">{p.name}</div>
              {p.due_date && (
                <div className="text-[10px] text-foreground/50 mt-1 flex items-center gap-1">
                  <Calendar className="size-2.5" />
                  {format(new Date(p.due_date), "dd/MM/yyyy")}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function EmptyProducts() {
  return (
    <Card className="p-10 text-center border-dashed">
      <ImageIcon className="size-10 mx-auto text-foreground/30 mb-3" />
      <h3 className="font-semibold mb-1">Nenhum produto ainda</h3>
      <p className="text-sm text-foreground/60">Adicione o primeiro produto a ser lançado.</p>
    </Card>
  );
}

/* ============= STATUSES DIALOG ============= */
function StatusesDialog({
  gridId, statuses, onClose,
}: { gridId: string; statuses: LaunchGridStatus[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const createMut = useMutation({
    mutationFn: () => createStatus({ grid_id: gridId, label, color }),
    onSuccess: () => {
      setLabel(""); setColor("#3b82f6");
      qc.invalidateQueries({ queryKey: ["launch-grid-statuses", gridId] });
    },
  });
  const updMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<LaunchGridStatus> }) => updateStatus(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["launch-grid-statuses", gridId] }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteStatus(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["launch-grid-statuses", gridId] });
      qc.invalidateQueries({ queryKey: ["launch-grid-products", gridId] });
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Etapas do Grid</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-foreground/50 -mt-2">
          Marque uma etapa como <strong>Concluída</strong> para indicar que produtos nela contam como finalizados (igual aos jobs).
        </p>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {statuses.map((s) => (
            <div key={s.id} className="flex items-center gap-2 p-2 rounded border border-border">
              <input
                type="color"
                value={s.color}
                onChange={(e) => updMut.mutate({ id: s.id, patch: { color: e.target.value } })}
                className="size-7 rounded cursor-pointer"
              />
              <Input
                defaultValue={s.label}
                onBlur={(e) => { if (e.target.value !== s.label) updMut.mutate({ id: s.id, patch: { label: e.target.value } }); }}
                className="h-8"
              />
              <label className="flex items-center gap-1 text-[11px] text-foreground/70 cursor-pointer shrink-0 px-1">
                <input
                  type="checkbox"
                  checked={!!s.is_done}
                  onChange={(e) => updMut.mutate({ id: s.id, patch: { is_done: e.target.checked } })}
                />
                Concluída
              </label>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => { if (confirm("Remover etapa?")) delMut.mutate(s.id); }}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 mt-3">
          <Label className="text-xs">Nova etapa</Label>
          <div className="flex gap-2 mt-1">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="size-9 rounded cursor-pointer" />
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Em produção" className="h-9" />
            <Button size="sm" onClick={() => label.trim() && createMut.mutate()} disabled={!label.trim()}>
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============= MULTI IMAGE UPLOAD ============= */
function MultiImageUploader({
  gridId, label, value, onChange,
}: {
  gridId: string;
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        try {
          urls.push(await uploadProductImage(gridId, f));
        } catch (e: any) {
          toast.error(`${f.name}: ${e.message}`);
        }
      }
      if (urls.length) onChange([...(value || []), ...urls]);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex flex-wrap gap-2">
        {(value || []).map((url, i) => (
          <div key={i} className="relative group size-20 rounded-md bg-muted overflow-hidden border border-border">
            <StorageImage src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute top-0.5 right-0.5 bg-background/80 rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
              aria-label="Remover"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="size-20 rounded-md border border-dashed border-border flex flex-col items-center justify-center text-xs text-foreground/50 hover:text-foreground hover:border-foreground/40 transition"
        >
          {busy ? "..." : (<><Upload className="size-4 mb-0.5" />Adicionar</>)}
        </button>
        <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>
    </div>
  );
}

/* ============= PRODUCT SHEET ============= */
function ProductSheet({
  gridId, clientId, statuses, product, defaultStatusId, onClose,
}: {
  gridId: string;
  clientId: string;
  statuses: LaunchGridStatus[];
  product?: LaunchGridProduct;
  defaultStatusId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const coverRef = useRef<HTMLInputElement>(null);
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [statusId, setStatusId] = useState<string>(product?.status_id ?? defaultStatusId ?? statuses[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(product?.due_date ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null);
  const [uploading, setUploading] = useState(false);

  // Boletim
  const b0: LaunchGridBoletim = product?.boletim ?? {};
  const [categoria, setCategoria] = useState(b0.categoria ?? "");
  const [imgs, setImgs] = useState<BoletimImagens>(b0.imagens ?? {});
  const [briefing, setBriefing] = useState(b0.briefing_criacao ?? "");
  const [regulatorio, setRegulatorio] = useState(b0.regulatorio_verso ?? "");
  const [benchmark, setBenchmark] = useState<string[]>(b0.benchmark ?? []);
  const [volumetria, setVolumetria] = useState(b0.volumetria ?? "");
  const [aspecto, setAspecto] = useState<AspectoFisico>(b0.aspecto_fisico ?? "");
  const [acondicionar, setAcondicionar] = useState<Acondicionar>(b0.acondicionar ?? "");
  const [descEmbalagem, setDescEmbalagem] = useState(b0.descricao_embalagem ?? "");
  const [responsaveis, setResponsaveis] = useState<Array<{ nome: string; papel?: string }>>(b0.responsaveis ?? []);

  const { data: jobs = [] } = useQuery({
    queryKey: ["product-jobs", product?.id],
    queryFn: () => listProductJobs(product!.id),
    enabled: !!product,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const boletim: LaunchGridBoletim = {
        categoria, imagens: imgs, briefing_criacao: briefing,
        regulatorio_verso: regulatorio, benchmark,
        volumetria, aspecto_fisico: aspecto, acondicionar,
        descricao_embalagem: descEmbalagem, responsaveis,
      };
      const payload = {
        name, description: product?.description ?? null, status_id: statusId || null,
        due_date: dueDate || null, notes: product?.notes ?? null,
        image_url: imageUrl, links: product?.links ?? [], skus: product?.skus ?? [], boletim,
      };
      if (isEdit) return updateProduct(product!.id, payload);
      return createProduct({ grid_id: gridId, ...payload });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Produto atualizado" : "Produto criado");
      qc.invalidateQueries({ queryKey: ["launch-grid-products", gridId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadProductImage(gridId, file);
      setImageUrl(url);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };


  const ASPECTO_OPTIONS: { value: AspectoFisico; label: string }[] = [
    { value: "gel", label: "Gel" }, { value: "fluido", label: "Fluido" },
    { value: "creme", label: "Creme" }, { value: "locao", label: "Loção" },
    { value: "solido", label: "Sólido" }, { value: "liquido", label: "Líquido" },
    { value: "mousse", label: "Mousse" }, { value: "oleo", label: "Óleo" },
    { value: "outros", label: "Outros" },
  ];

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto p-6">
        <SheetHeader className="pr-10">
          <SheetTitle className="break-words">{isEdit ? "Boletim de Lançamento" : "Novo Produto"}</SheetTitle>
          <p className="text-xs text-foreground/50">Boletim de Lançamento de Produtos</p>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* ===== IDENTIFICAÇÃO ===== */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/80 break-words">Identificação</h3>

            <div className="flex gap-4">
              <div>
                <Label className="text-xs">Capa</Label>
                <div className="mt-1 size-24 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                  {imageUrl ? (
                    <StorageImage src={imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="size-8 text-foreground/30" />
                  )}
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <input
                    ref={coverRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }}
                  />
                  <Button size="sm" variant="outline" onClick={() => coverRef.current?.click()} disabled={uploading}>
                    <Upload className="size-3.5" /> {uploading ? "..." : "Enviar"}
                  </Button>
                  {imageUrl && (
                    <Button size="sm" variant="ghost" onClick={() => setImageUrl(null)}>
                      <X className="size-3.5" /> Remover
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-xs">Nome do produto / linha *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Data de lançamento</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Categoria</Label>
                    <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Skincare" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Etapa</Label>
                  <Select value={statusId} onValueChange={setStatusId}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ background: s.color }} />
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>

          {/* ===== IMAGENS DO PRODUTO ===== */}
          <section className="space-y-4 border-t pt-5">
            <h3 className="text-sm font-semibold text-foreground/80 break-words">Imagens do produto</h3>
            <MultiImageUploader gridId={gridId} label="Tampa" value={imgs.tampa ?? []}
              onChange={(v) => setImgs({ ...imgs, tampa: v })} />
            <MultiImageUploader gridId={gridId} label="Embalagem" value={imgs.embalagem ?? []}
              onChange={(v) => setImgs({ ...imgs, embalagem: v })} />
            <MultiImageUploader gridId={gridId} label="Rótulo" value={imgs.rotulo ?? []}
              onChange={(v) => setImgs({ ...imgs, rotulo: v })} />
            <MultiImageUploader gridId={gridId} label="Outros" value={imgs.outros ?? []}
              onChange={(v) => setImgs({ ...imgs, outros: v })} />
          </section>

          {/* ===== BRIEFING DE CRIAÇÃO ===== */}
          <section className="space-y-3 border-t pt-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground/80 break-words">Briefing de criação</h3>
              <p className="text-[11px] text-foreground/50">Esse conteúdo vai para o designer.</p>
            </div>
            <div>
              <Label className="text-xs">Briefing</Label>
              <Textarea value={briefing} onChange={(e) => setBriefing(e.target.value)} rows={4} className="mt-1" placeholder="Direcionamentos, referências, restrições..." />
            </div>
            <div>
              <Label className="text-xs">Regulatório verso</Label>
              <Textarea value={regulatorio} onChange={(e) => setRegulatorio(e.target.value)} rows={3} className="mt-1" placeholder="Informações regulatórias do verso da embalagem" />
            </div>
            <MultiImageUploader gridId={gridId} label="Benchmark (fotos)" value={benchmark} onChange={setBenchmark} />
          </section>

          {/* ===== EMBALAGEM / CONTEÚDO / ASPECTO FÍSICO ===== */}
          <section className="space-y-4 border-t pt-5">
            <h3 className="text-sm font-semibold text-foreground/80 break-words">
              Embalagem / Conteúdo / Aspecto físico
            </h3>


            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Volumetria</Label>
                <Input value={volumetria} onChange={(e) => setVolumetria(e.target.value)} placeholder="Ex: 250 ml" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Aspecto físico</Label>
                <Select value={aspecto || undefined} onValueChange={(v) => setAspecto(v as AspectoFisico)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ASPECTO_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Acondicionar</Label>
                <Select value={acondicionar || undefined} onValueChange={(v) => setAcondicionar(v as Acondicionar)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="selo">Selo</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                    <SelectItem value="ambos">Selo + Caixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Descrição da embalagem</Label>
              <Textarea value={descEmbalagem} onChange={(e) => setDescEmbalagem(e.target.value)} rows={3} className="mt-1" />
            </div>
          </section>

          {/* ===== RESPONSÁVEIS ===== */}
          <section className="space-y-3 border-t pt-5">
            <h3 className="text-sm font-semibold text-foreground/80 break-words">Responsáveis</h3>
            <div className="space-y-2">
              {responsaveis.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={r.nome}
                    onChange={(e) => { const n = [...responsaveis]; n[i].nome = e.target.value; setResponsaveis(n); }}
                    placeholder="Nome" className="h-8 flex-1"
                  />
                  <Input
                    value={r.papel ?? ""}
                    onChange={(e) => { const n = [...responsaveis]; n[i].papel = e.target.value; setResponsaveis(n); }}
                    placeholder="Papel / área" className="h-8 flex-1"
                  />
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setResponsaveis(responsaveis.filter((_, j) => j !== i))}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setResponsaveis([...responsaveis, { nome: "", papel: "" }])}>
                <Plus className="size-3.5" /> Adicionar responsável
              </Button>
            </div>
          </section>



          {/* Jobs vinculados */}
          {isEdit && (
            <section className="border-t pt-5">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Briefcase className="size-3.5" /> Jobs deste produto ({jobs.length})
                </Label>
                <Button size="sm" variant="outline" onClick={() => {
                  navigate({
                    to: "/jobs",
                    search: { new: true, clientId, launchProductId: product!.id },
                  });
                }}>
                  <Plus className="size-3.5" /> Criar job
                </Button>
              </div>
              <div className="space-y-1">
                {jobs.length === 0 && <div className="text-xs text-foreground/40 italic">Nenhum job vinculado ainda.</div>}
                {jobs.map((j: any) => (
                  <a key={j.id} href={`/jobs?jobId=${j.id}`} className="flex items-center justify-between p-2 rounded hover:bg-muted text-sm">
                    <span className="truncate">{j.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{j.status}</Badge>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t sticky bottom-0 bg-background">
          {isEdit ? (
            <Button variant="ghost" className="text-destructive" onClick={() => {
              if (confirm("Remover este produto?")) {
                deleteProduct(product!.id).then(() => {
                  qc.invalidateQueries({ queryKey: ["launch-grid-products", gridId] });
                  toast.success("Produto removido");
                  onClose();
                });
              }
            }}>
              <Trash2 className="size-3.5" /> Remover
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => name.trim() && saveMut.mutate()} disabled={!name.trim() || saveMut.isPending}>
              {saveMut.isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
