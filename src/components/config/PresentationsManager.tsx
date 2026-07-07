import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  GripVertical,
  Presentation as PresentationIcon,
  Image as ImageIcon,
  Type,
  Quote,
  Flag,
  Columns2,
  LayoutGrid,
  List,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  fetchPresentations,
  fetchSlides,
  createPresentation,
  updatePresentation,
  deletePresentation,
  upsertSlide,
  deleteSlide,
  reorderSlides,
  normalizePresentationText,
  type Presentation,
  type PresentationSlide,
  type PresentationLayout,
} from "@/lib/presentations-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LAYOUT_META: Record<
  PresentationLayout,
  { label: string; icon: any; hint: string }
> = {
  cover: { label: "Capa", icon: Flag, hint: "Título grande centralizado" },
  content: { label: "Conteúdo", icon: Type, hint: "Título + texto" },
  image: { label: "Imagem", icon: ImageIcon, hint: "Imagem tela cheia" },
  split: { label: "Dividido", icon: Columns2, hint: "Imagem + texto" },
  quote: { label: "Citação", icon: Quote, hint: "Frase de destaque" },
  cards: { label: "Cards", icon: LayoutGrid, hint: "Quadrados com dados" },
  closing: { label: "Encerramento", icon: Flag, hint: "Slide final com CTA" },
};

export function PresentationsManager({ canEdit = true }: { canEdit?: boolean }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Presentation> | null>(null);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["presentations"],
    queryFn: fetchPresentations,
  });

  const selectedItem = list.find((p) => p.id === selected) ?? list[0];

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (editing.id) return updatePresentation(editing.id, editing);
      return createPresentation(editing);
    },
    onSuccess: () => {
      toast.success("Apresentação salva");
      qc.invalidateQueries({ queryKey: ["presentations"] });
      setEditOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePresentation(id),
    onSuccess: () => {
      toast.success("Apresentação removida");
      qc.invalidateQueries({ queryKey: ["presentations"] });
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Loader2 className="size-5 animate-spin mx-auto" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/50">
            Apresentações
          </h3>
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing({ name: "", description: "", is_active: true });
                setEditOpen(true);
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          )}
        </div>
        {list.length === 0 && (
          <p className="text-xs text-foreground/40 px-2">
            Nenhuma apresentação ainda.
          </p>
        )}
        {list.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg border transition",
              selectedItem?.id === t.id
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted",
            )}
          >
            <div className="flex items-center gap-2">
              <PresentationIcon className="size-3 text-primary/60" />
              <span className="text-sm font-semibold truncate">{t.name}</span>
              {!t.is_active && (
                <span className="text-[9px] uppercase text-foreground/40">
                  inativa
                </span>
              )}
            </div>
            {t.description && (
              <p className="text-[10px] text-foreground/40 mt-0.5 truncate">
                {t.description}
              </p>
            )}
          </button>
        ))}
      </aside>

      <section>
        {selectedItem ? (
          <PresentationDetail
            item={selectedItem}
            canEdit={canEdit}
            onEdit={() => {
              setEditing(selectedItem);
              setEditOpen(true);
            }}
            onDelete={() => {
              if (confirm(`Remover "${selectedItem.name}"?`))
                deleteMut.mutate(selectedItem.id);
            }}
          />
        ) : (
          <div className="text-center py-20 text-foreground/40 text-sm">
            Selecione ou crie uma apresentação.
          </div>
        )}
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Editar apresentação" : "Nova apresentação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={editing?.name ?? ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={editing?.description ?? ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">Ativa</p>
                <p className="text-xs text-foreground/40">
                  Apresentações inativas ficam ocultas na ficha do cliente.
                </p>
              </div>
              <Switch
                checked={editing?.is_active ?? true}
                onCheckedChange={(v) =>
                  setEditing((p) => ({ ...p, is_active: v }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending && (
                <Loader2 className="size-4 animate-spin mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PresentationDetail({
  item,
  canEdit,
  onEdit,
  onDelete,
}: {
  item: Presentation;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [slideDraft, setSlideDraft] =
    useState<Partial<PresentationSlide> | null>(null);
  const [slideOpen, setSlideOpen] = useState(false);

  const { data: slides = [] } = useQuery({
    queryKey: ["presentation-slides", item.id],
    queryFn: () => fetchSlides(item.id),
  });

  const saveSlide = useMutation({
    mutationFn: () =>
      upsertSlide({
        ...slideDraft,
        presentation_id: item.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presentation-slides", item.id] });
      setSlideOpen(false);
      setSlideDraft(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSlide = useMutation({
    mutationFn: (id: string) => deleteSlide(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presentation-slides", item.id] });
    },
  });

  const move = useMutation({
    mutationFn: async (opts: { id: string; dir: -1 | 1 }) => {
      const idx = slides.findIndex((s) => s.id === opts.id);
      const target = idx + opts.dir;
      if (idx < 0 || target < 0 || target >= slides.length) return;
      const a = slides[idx];
      const b = slides[target];
      await reorderSlides([
        { id: a.id, order_index: b.order_index },
        { id: b.id, order_index: a.order_index },
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presentation-slides", item.id] });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-bold">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-foreground/60 mt-1">
              {item.description}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="size-3.5 text-rose-500" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40">
          Slides ({slides.length})
        </h4>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              setSlideDraft({
                layout: "content",
                title: "",
                body: "",
                order_index: slides.length,
              });
              setSlideOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Slide
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {slides.map((s, i) => {
          const meta = LAYOUT_META[s.layout];
          const Icon = meta.icon;
          return (
            <div
              key={s.id}
              className="flex items-start gap-3 border border-border rounded-lg p-3 bg-surface"
            >
              <div className="flex flex-col items-center gap-1 mt-0.5">
                <span className="text-[10px] font-mono-kasa text-foreground/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <GripVertical className="size-4 text-foreground/20" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono-kasa uppercase tracking-wider bg-muted text-foreground/60 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                    <Icon className="size-2.5" />
                    {meta.label}
                  </span>
                  <p className="text-sm font-semibold truncate">
                    {s.title || <em className="text-foreground/30">Sem título</em>}
                  </p>
                </div>
                {s.body && (
                  <p className="text-xs text-foreground/50 mt-1 line-clamp-2 whitespace-pre-line">
                    {s.body}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={i === 0}
                    onClick={() => move.mutate({ id: s.id, dir: -1 })}
                  >
                    <ArrowUp className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    disabled={i === slides.length - 1}
                    onClick={() => move.mutate({ id: s.id, dir: 1 })}
                  >
                    <ArrowDown className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => {
                      setSlideDraft(s);
                      setSlideOpen(true);
                    }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => removeSlide.mutate(s.id)}
                  >
                    <Trash2 className="size-3 text-rose-500" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {slides.length === 0 && (
          <p className="text-sm text-foreground/40 italic text-center py-8">
            Ainda não há slides. Adicione o primeiro.
          </p>
        )}
      </div>

      <Dialog open={slideOpen} onOpenChange={setSlideOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {slideDraft?.id ? "Editar slide" : "Novo slide"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Formato</Label>
              <Select
                value={slideDraft?.layout ?? "content"}
                onValueChange={(v) =>
                  setSlideDraft((p) => ({ ...p, layout: v as PresentationLayout }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LAYOUT_META) as PresentationLayout[]).map(
                    (k) => (
                      <SelectItem key={k} value={k}>
                        {LAYOUT_META[k].label} — {LAYOUT_META[k].hint}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rótulo pequeno (eyebrow)</Label>
              <Input
                placeholder="Ex.: Nosso plano · Etapa 01"
                value={slideDraft?.eyebrow ?? ""}
                onChange={(e) =>
                  setSlideDraft((p) => ({ ...p, eyebrow: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={slideDraft?.title ?? ""}
                onChange={(e) =>
                  setSlideDraft((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subtítulo</Label>
              <Input
                value={slideDraft?.subtitle ?? ""}
                onChange={(e) =>
                  setSlideDraft((p) => ({ ...p, subtitle: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Texto / corpo</Label>
              <Textarea
                rows={5}
                placeholder="Aceita quebras de linha. Use • para bullets."
                value={slideDraft?.body ?? ""}
                onChange={(e) =>
                  setSlideDraft((p) => ({
                    ...p,
                    body: normalizePresentationText(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>URL da imagem</Label>
              <Input
                placeholder="https://..."
                value={slideDraft?.image_url ?? ""}
                onChange={(e) =>
                  setSlideDraft((p) => ({ ...p, image_url: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CTA (texto)</Label>
                <Input
                  value={slideDraft?.cta_label ?? ""}
                  onChange={(e) =>
                    setSlideDraft((p) => ({ ...p, cta_label: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>CTA (link)</Label>
                <Input
                  placeholder="https://..."
                  value={slideDraft?.cta_url ?? ""}
                  onChange={(e) =>
                    setSlideDraft((p) => ({ ...p, cta_url: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlideOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveSlide.mutate()}
              disabled={saveSlide.isPending}
            >
              {saveSlide.isPending && (
                <Loader2 className="size-4 animate-spin mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
