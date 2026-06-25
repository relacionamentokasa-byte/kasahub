import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, Clapperboard, Clock, ExternalLink } from "lucide-react";
import type { ScriptScene } from "@/lib/scripts-api";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  scenes: ScriptScene[];
}

export function ScriptPresentation({ open, onOpenChange, title, scenes }: Props) {
  const [idx, setIdx] = useState(0);
  const ordered = [...scenes].sort((a, b) => a.scene_number - b.scene_number);
  const total = ordered.length;
  const current = ordered[idx];

  useEffect(() => {
    if (!open) setIdx(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setIdx((i) => Math.min(i + 1, total - 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, total, onOpenChange]);

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 border-0 bg-[#0C1618] text-white sm:rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Clapperboard className="size-5 text-[#FFBC45]" />
            <span className="font-display font-bold text-sm uppercase tracking-widest text-[#FFBC45]">Apresentação</span>
            <span className="text-white/40 text-sm">·</span>
            <span className="text-sm text-white/70 truncate max-w-[40vw]">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-white/60">{idx + 1} / {total}</span>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10">
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Scene body */}
        <div className="flex-1 overflow-y-auto px-12 py-8 grid lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="space-y-8 max-w-4xl">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-[#FFBC45] text-[#0C1618] grid place-items-center font-display font-bold text-3xl">
                {current.scene_number}
              </div>
              {current.duration_sec != null && (
                <Badge className="bg-white/10 text-white border-white/20 gap-1.5 text-base py-1 px-3">
                  <Clock className="size-4" /> {current.duration_sec}s
                </Badge>
              )}
            </div>

            {current.visual && (
              <div>
                <div className="text-xs uppercase tracking-widest text-[#FFBC45] font-bold mb-2">Visual</div>
                <p className="text-2xl leading-relaxed text-white/95 whitespace-pre-wrap">{current.visual}</p>
              </div>
            )}
            {current.speech && (
              <div>
                <div className="text-xs uppercase tracking-widest text-[#FFBC45] font-bold mb-2">Fala / Narração</div>
                <p className="text-3xl leading-relaxed font-display text-white whitespace-pre-wrap">"{current.speech}"</p>
              </div>
            )}
            {current.production_notes && (
              <div>
                <div className="text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Produção</div>
                <p className="text-lg leading-relaxed text-white/70 whitespace-pre-wrap">{current.production_notes}</p>
              </div>
            )}
            {current.reference_url && (
              <a href={current.reference_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#FFBC45] hover:underline text-sm">
                <ExternalLink className="size-4" /> Abrir referência
              </a>
            )}
          </div>

          {current.reference_image_url && (
            <img
              src={current.reference_image_url}
              alt="Referência"
              className="rounded-2xl max-h-[70vh] object-contain border border-white/10 bg-black"
            />
          )}
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-white/10 bg-black/30">
          <Button
            variant="outline"
            onClick={() => setIdx((i) => Math.max(i - 1, 0))}
            disabled={idx === 0}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            <ChevronLeft className="size-4 mr-1" /> Anterior
          </Button>
          <div className="flex gap-1.5">
            {ordered.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-[#FFBC45]" : "w-1.5 bg-white/20 hover:bg-white/40"}`}
                aria-label={`Cena ${i + 1}`}
              />
            ))}
          </div>
          <Button
            onClick={() => setIdx((i) => Math.min(i + 1, total - 1))}
            disabled={idx === total - 1}
            className="bg-[#FFBC45] text-[#0C1618] hover:bg-[#FFBC45]/90"
          >
            Próxima <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
