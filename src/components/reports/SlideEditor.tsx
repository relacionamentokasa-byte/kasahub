import { useRef } from "react";
import type { Slide, KpiItem, DeliverableItem, ChartType, ChartSeries } from "./types";
import { PLATFORMS } from "./platform-icons";
import { PlatformIcon } from "./PlatformIcon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Upload, ImageIcon, BarChart3, LineChart as LineIcon, AreaChart as AreaIcon, PieChart as PieIcon } from "lucide-react";
import { uploadReportImage } from "@/lib/reports-api";
import { toast } from "sonner";

export function SlideEditor({
  slide,
  reportId,
  onChange,
}: {
  slide: Slide;
  reportId: string;
  onChange: (next: Slide) => void;
}) {
  const update = (patch: Partial<Slide["props"]>) =>
    onChange({ ...slide, props: { ...slide.props, ...patch } });

  const p = slide.props;

  return (
    <div className="space-y-4">
      {("title" in p || hasField(slide.type, "title")) && (
        <Field label="Título">
          <Input value={p.title ?? ""} onChange={(e) => update({ title: e.target.value })} />
        </Field>
      )}

      {hasField(slide.type, "kicker") && (
        <Field label="Eyebrow (texto pequeno acima)">
          <Input value={p.kicker ?? ""} onChange={(e) => update({ kicker: e.target.value })} />
        </Field>
      )}

      {hasField(slide.type, "subtitle") && (
        <Field label="Subtítulo">
          <Textarea rows={2} value={p.subtitle ?? ""} onChange={(e) => update({ subtitle: e.target.value })} />
        </Field>
      )}

      {hasField(slide.type, "period") && (
        <Field label="Período / etiqueta (ex.: Jun/2026)">
          <Input value={p.period ?? ""} onChange={(e) => update({ period: e.target.value })} />
        </Field>
      )}

      {hasField(slide.type, "body") && (
        <Field label="Conteúdo (suporta **negrito**, *itálico*, listas com -)">
          <Textarea rows={10} value={p.body ?? ""} onChange={(e) => update({ body: e.target.value })} />
        </Field>
      )}

      {slide.type === "image" && (
        <>
          <ImagePickerField
            reportId={reportId}
            value={p.imageUrl}
            onChange={(url) => update({ imageUrl: url })}
          />
          <Field label="Legenda">
            <Input value={p.caption ?? ""} onChange={(e) => update({ caption: e.target.value })} />
          </Field>
        </>
      )}

      {slide.type === "gallery" && (
        <Field label={`Imagens (${(p.images || []).length}/4)`}>
          <div className="grid grid-cols-2 gap-2">
            {(p.images || []).map((url, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-video">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  className="absolute top-1 right-1 size-7 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100"
                  onClick={() => update({ images: (p.images || []).filter((_, j) => j !== i) })}
                >
                  <Trash2 className="size-3.5 mx-auto" />
                </button>
              </div>
            ))}
            {(p.images || []).length < 4 && (
              <UploadButton
                reportId={reportId}
                onUploaded={(url) => update({ images: [...(p.images || []), url] })}
                compact
              />
            )}
          </div>
        </Field>
      )}

      {slide.type === "kpis" && (
        <ListEditor
          label="Indicadores"
          items={(p.items || []) as KpiItem[]}
          empty={{ label: "Indicador", value: "0", delta: "", platform: "" }}
          max={4}
          onChange={(items) => update({ items })}
          renderItem={(it, set) => (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Label" value={it.label} onChange={(e) => set({ ...it, label: e.target.value })} />
                <Input placeholder="Valor" value={it.value} onChange={(e) => set({ ...it, value: e.target.value })} />
                <Input placeholder="Variação" value={it.delta ?? ""} onChange={(e) => set({ ...it, delta: e.target.value })} />
              </div>
              <PlatformPicker
                value={it.platform ?? ""}
                onChange={(v) => set({ ...it, platform: v })}
                placeholder="Plataforma (opcional)"
              />
            </div>
          )}
        />
      )}

      {slide.type === "chart" && (
        <ChartEditor
          chartType={p.chartType ?? "bar"}
          categories={p.chartCategories ?? []}
          categoryPlatforms={p.chartCategoryPlatforms ?? []}
          series={p.chartSeries ?? []}
          note={p.chartNote ?? ""}
          onChange={(patch) => update(patch)}
        />
      )}

      {slide.type === "deliverables" && (
        <ListEditor
          label="Entregas"
          items={(p.items || []) as DeliverableItem[]}
          empty={{ label: "Nova entrega", done: true }}
          onChange={(items) => update({ items })}
          renderItem={(it, set) => (
            <div className="flex items-center gap-2">
              <Switch checked={it.done} onCheckedChange={(v) => set({ ...it, done: v })} />
              <Input value={it.label} onChange={(e) => set({ ...it, label: e.target.value })} />
            </div>
          )}
        />
      )}

      {slide.type === "comparison" && (
        <>
          <Field label="Coluna esquerda — título">
            <Input value={p.leftTitle ?? ""} onChange={(e) => update({ leftTitle: e.target.value })} />
          </Field>
          <Field label="Coluna esquerda — conteúdo">
            <Textarea rows={6} value={p.leftBody ?? ""} onChange={(e) => update({ leftBody: e.target.value })} />
          </Field>
          <Field label="Coluna direita — título">
            <Input value={p.rightTitle ?? ""} onChange={(e) => update({ rightTitle: e.target.value })} />
          </Field>
          <Field label="Coluna direita — conteúdo">
            <Textarea rows={6} value={p.rightBody ?? ""} onChange={(e) => update({ rightBody: e.target.value })} />
          </Field>
        </>
      )}

      {slide.type === "next-steps" && (
        <ListEditor
          label="Próximos passos"
          items={(p.items || []) as string[]}
          empty={"Nova ação"}
          onChange={(items) => update({ items })}
          renderItem={(it, set) => (
            <Input value={it} onChange={(e) => set(e.target.value)} />
          )}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-foreground/60">{label}</Label>
      {children}
    </div>
  );
}

function ListEditor<T>({
  label,
  items,
  empty,
  max,
  onChange,
  renderItem,
}: {
  label: string;
  items: T[];
  empty: T;
  max?: number;
  onChange: (items: T[]) => void;
  renderItem: (item: T, set: (next: T) => void) => React.ReactNode;
}) {
  return (
    <Field label={label}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">{renderItem(it, (next) => onChange(items.map((x, j) => (j === i ? next : x))))}</div>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        {(!max || items.length < max) && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => onChange([...items, structuredClone(empty)])}>
            <Plus className="size-3.5 mr-1.5" /> Adicionar
          </Button>
        )}
      </div>
    </Field>
  );
}

function ImagePickerField({ reportId, value, onChange }: { reportId: string; value?: string; onChange: (url: string) => void }) {
  return (
    <Field label="Imagem">
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img src={value} alt="" className="w-full aspect-video object-cover" />
          <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={() => onChange("")}>
            Remover
          </Button>
        </div>
      ) : (
        <UploadButton reportId={reportId} onUploaded={onChange} />
      )}
    </Field>
  );
}

function UploadButton({ reportId, onUploaded, compact }: { reportId: string; onUploaded: (url: string) => void; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const onPick = async (f: File | undefined) => {
    if (!f) return;
    try {
      const url = await uploadReportImage(reportId, f);
      onUploaded(url);
    } catch (e: any) {
      toast.error("Falha no upload: " + (e?.message ?? "erro"));
    }
  };
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={
          compact
            ? "aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center text-foreground/50 hover:bg-muted"
            : "w-full aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-foreground/60 hover:bg-muted"
        }
      >
        {compact ? <ImageIcon className="size-5" /> : (
          <>
            <Upload className="size-6" />
            <span className="text-sm">Enviar imagem</span>
          </>
        )}
      </button>
    </>
  );
}

function hasField(type: Slide["type"], field: string): boolean {
  const map: Record<string, string[]> = {
    cover: ["title", "subtitle", "kicker", "period"],
    section: ["title", "kicker"],
    text: ["title", "body"],
    image: ["title"],
    gallery: ["title"],
    kpis: ["title"],
    chart: ["title"],
    deliverables: ["title"],
    comparison: ["title"],
    "next-steps": ["title"],
    closing: ["title", "subtitle"],
  };
  return map[type]?.includes(field) ?? false;
}

const CHART_OPTIONS: { type: ChartType; label: string; Icon: typeof BarChart3 }[] = [
  { type: "bar", label: "Barras", Icon: BarChart3 },
  { type: "line", label: "Linha", Icon: LineIcon },
  { type: "area", label: "Área", Icon: AreaIcon },
  { type: "pie", label: "Pizza", Icon: PieIcon },
];

function ChartEditor({
  chartType,
  categories,
  categoryPlatforms,
  series,
  note,
  onChange,
}: {
  chartType: ChartType;
  categories: string[];
  categoryPlatforms: string[];
  series: ChartSeries[];
  note: string;
  onChange: (patch: {
    chartType?: ChartType;
    chartCategories?: string[];
    chartCategoryPlatforms?: string[];
    chartSeries?: ChartSeries[];
    chartNote?: string;
  }) => void;
}) {
  const setCategories = (next: string[]) => {
    const fixed = series.map((s) => ({
      ...s,
      values: Array.from({ length: next.length }, (_, i) => s.values[i] ?? 0),
    }));
    const fixedPlatforms = Array.from({ length: next.length }, (_, i) => categoryPlatforms[i] ?? "");
    onChange({ chartCategories: next, chartCategoryPlatforms: fixedPlatforms, chartSeries: fixed });
  };
  const setCategoryPlatform = (i: number, v: string) => {
    const next = Array.from({ length: categories.length }, (_, j) => categoryPlatforms[j] ?? "");
    next[i] = v;
    onChange({ chartCategoryPlatforms: next });
  };
  const setSeries = (next: ChartSeries[]) => onChange({ chartSeries: next });

  return (
    <div className="space-y-4">
      <Field label="Tipo de gráfico">
        <div className="grid grid-cols-4 gap-2">
          {CHART_OPTIONS.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ chartType: type })}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition ${
                chartType === type ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground/70 hover:bg-muted"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label={chartType === "pie" ? "Fatias" : "Categorias (eixo X)"}>
        <div className="space-y-2">
          {categories.map((cat, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-border/60 p-2">
              <div className="flex items-center gap-2">
                <Input
                  value={cat}
                  placeholder={`Item ${i + 1}`}
                  onChange={(e) => setCategories(categories.map((c, j) => (j === i ? e.target.value : c)))}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setCategories(categories.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <PlatformPicker
                value={categoryPlatforms[i] ?? ""}
                onChange={(v) => setCategoryPlatform(i, v)}
                placeholder="Plataforma (opcional)"
              />
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={() => setCategories([...categories, ""])}>
            <Plus className="size-3.5 mr-1.5" /> Adicionar item
          </Button>
        </div>
      </Field>


      <Field label={chartType === "pie" ? "Valores" : `Séries (${series.length})`}>
        <div className="space-y-3">
          {series.map((s, si) => (
            <div key={si} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={s.name}
                  placeholder="Nome da série (ex.: 2025)"
                  onChange={(e) => setSeries(series.map((x, j) => (j === si ? { ...x, name: e.target.value } : x)))}
                />
                {chartType !== "pie" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => setSeries(series.filter((_, j) => j !== si))}
                    disabled={series.length <= 1}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {categories.map((cat, ci) => (
                  <div key={ci} className="flex items-center gap-1.5">
                    <span className="text-[11px] text-foreground/50 w-16 truncate">{cat || `#${ci + 1}`}</span>
                    <Input
                      type="number"
                      value={Number.isFinite(s.values[ci]) ? s.values[ci] : 0}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const newVals = [...s.values];
                        newVals[ci] = Number.isFinite(v) ? v : 0;
                        setSeries(series.map((x, j) => (j === si ? { ...x, values: newVals } : x)));
                      }}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {chartType !== "pie" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                setSeries([
                  ...series,
                  { name: `Série ${series.length + 1}`, values: Array.from({ length: categories.length }, () => 0) },
                ])
              }
            >
              <Plus className="size-3.5 mr-1.5" /> Adicionar série (comparativo)
            </Button>
          )}
        </div>
      </Field>

      <Field label="Legenda / observação (opcional)">
        <Input value={note} onChange={(e) => onChange({ chartNote: e.target.value })} />
      </Field>
    </div>
  );
}
