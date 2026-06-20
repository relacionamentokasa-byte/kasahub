import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Presentation, FileDown, Copy, Trash2, ChevronUp, ChevronDown, Save, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { fetchReport, updateReport } from "@/lib/reports-api";
import { fetchClient } from "@/lib/ops-api";
import { ScaledSlide } from "@/components/reports/ScaledSlide";
import { SlideEditor } from "@/components/reports/SlideEditor";
import { BLOCK_LABELS, newSlide, type Slide, type SlideType } from "@/components/reports/types";

export const Route = createFileRoute("/_authenticated/relatorios/construtor/$reportId")({
  head: () => ({ meta: [{ title: "Editor — Construtor de Relatórios" }] }),
  component: ReportEditorPage,
});

function ReportEditorPage() {
  const { reportId } = Route.useParams();
  const navigate = useNavigate();

  const reportQ = useQuery({ queryKey: ["report", reportId], queryFn: () => fetchReport(reportId) });

  const [title, setTitle] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (reportQ.data && !initialized.current) {
      setTitle(reportQ.data.title);
      const s = (reportQ.data.slides as unknown as Slide[]) || [];
      setSlides(s);
      setSelectedId(s[0]?.id ?? null);
      initialized.current = true;
    }
  }, [reportQ.data]);

  const clientQ = useQuery({
    queryKey: ["client", reportQ.data?.client_id],
    queryFn: () => fetchClient(reportQ.data!.client_id!),
    enabled: !!reportQ.data?.client_id,
  });
  const brandColor = (clientQ.data as any)?.brand_primary || "#3DB6F2";
  const clientLogo = (clientQ.data as any)?.logo_url || null;
  const clientName = clientQ.data?.company || clientQ.data?.name || "";

  // Autosave (debounced)
  useEffect(() => {
    if (!initialized.current) return;
    setSaving(true);
    const handle = setTimeout(async () => {
      try {
        await updateReport(reportId, { title, slides });
        setSavedAt(new Date());
      } catch (e: any) {
        toast.error("Falha ao salvar: " + (e?.message ?? "erro"));
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(handle);
  }, [title, slides, reportId]);

  const selected = useMemo(() => slides.find((s) => s.id === selectedId) ?? null, [slides, selectedId]);
  const selectedIndex = selected ? slides.indexOf(selected) : -1;

  const update = (next: Slide) => setSlides(slides.map((s) => (s.id === next.id ? next : s)));
  const addSlide = (type: SlideType) => {
    const s = newSlide(type);
    setSlides([...slides, s]);
    setSelectedId(s.id);
  };
  const removeSlide = (id: string) => {
    const idx = slides.findIndex((s) => s.id === id);
    const next = slides.filter((s) => s.id !== id);
    setSlides(next);
    if (selectedId === id) setSelectedId(next[Math.max(0, idx - 1)]?.id ?? null);
  };
  const duplicateSlide = (id: string) => {
    const idx = slides.findIndex((s) => s.id === id);
    const orig = slides[idx];
    if (!orig) return;
    const copy: Slide = { ...orig, id: crypto.randomUUID(), props: structuredClone(orig.props) };
    setSlides([...slides.slice(0, idx + 1), copy, ...slides.slice(idx + 1)]);
    setSelectedId(copy.id);
  };
  const move = (id: string, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[idx], next[j]] = [next[j], next[idx]];
    setSlides(next);
  };

  if (reportQ.isLoading) return <div className="p-8 text-foreground/50">Carregando…</div>;
  if (!reportQ.data) return <div className="p-8 text-foreground/50">Relatório não encontrado.</div>;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/relatorios/construtor" className="text-foreground/50 hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Link>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-none shadow-none text-base font-display font-semibold focus-visible:ring-0 px-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-foreground/50 flex items-center gap-1.5">
            {saving ? (<><Save className="size-3 animate-pulse" /> Salvando…</>) : savedAt ? (<><Check className="size-3 text-emerald-600" /> Salvo</>) : null}
          </span>
          <Button variant="outline" size="sm" onClick={() => window.open(`/relatorios/construtor/${reportId}/pdf`, "_blank")}>
            <FileDown className="size-3.5 mr-1.5" /> Exportar PDF
          </Button>
          <Button size="sm" onClick={() => navigate({ to: "/relatorios/construtor/$reportId/apresentar", params: { reportId } })}>
            <Presentation className="size-3.5 mr-1.5" /> Apresentar
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar: slide list */}
        <aside className="w-64 border-r border-border flex flex-col shrink-0">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left rounded-lg border overflow-hidden transition-all ${
                    selectedId === s.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="aspect-video bg-neutral-900">
                    <ScaledSlide
                      slide={s}
                      brandColor={brandColor}
                      clientLogoUrl={clientLogo}
                      clientName={clientName}
                      pageNumber={i + 1}
                      totalPages={slides.length}
                    />
                  </div>
                  <div className="px-2 py-1.5 flex items-center justify-between text-[11px] text-foreground/60">
                    <span className="truncate">{i + 1}. {BLOCK_LABELS[s.type]}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border">
            <AddBlockButton onPick={addSlide} />
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 flex flex-col min-w-0 bg-neutral-900">
          <div className="flex-1 p-8 min-h-0">
            {selected ? (
              <ScaledSlide
                slide={selected}
                brandColor={brandColor}
                clientLogoUrl={clientLogo}
                clientName={clientName}
                pageNumber={selectedIndex + 1}
                totalPages={slides.length}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-foreground/40">Nenhum slide selecionado</div>
            )}
          </div>
          {selected && (
            <div className="h-12 border-t border-border bg-background flex items-center justify-between px-4 shrink-0">
              <div className="text-xs text-foreground/60">
                Slide {selectedIndex + 1} de {slides.length} · {BLOCK_LABELS[selected.type]}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-8" onClick={() => move(selected.id, -1)} disabled={selectedIndex === 0}>
                  <ChevronUp className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => move(selected.id, 1)} disabled={selectedIndex === slides.length - 1}>
                  <ChevronDown className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => duplicateSlide(selected.id)}>
                  <Copy className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 text-rose-600 hover:bg-rose-500/10" onClick={() => removeSlide(selected.id)} disabled={slides.length <= 1}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </main>

        {/* Right panel: edit fields */}
        <aside className="w-96 border-l border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/50">Bloco</p>
            <p className="font-display font-semibold">{selected ? BLOCK_LABELS[selected.type] : "—"}</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {selected ? (
                <SlideEditor slide={selected} reportId={reportId} onChange={update} />
              ) : null}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}

function AddBlockButton({ onPick }: { onPick: (t: SlideType) => void }) {
  const [open, setOpen] = useState(false);
  const types: SlideType[] = ["cover", "section", "text", "image", "gallery", "kpis", "deliverables", "comparison", "next-steps", "closing"];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="size-3.5 mr-1.5" /> Adicionar slide
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start" side="top">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => { onPick(t); setOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted"
          >
            {BLOCK_LABELS[t]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
