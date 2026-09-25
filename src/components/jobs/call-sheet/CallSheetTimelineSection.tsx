import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Trash2, Clapperboard, Coffee, ArrowDownUp, Sparkles, MapPin } from "lucide-react";
import { getScriptByJob, listScenes } from "@/lib/scripts-api";
import {
  type CallSheetTimelineItem,
  type CallSheetBlockType,
  CALL_SHEET_BLOCK_LABELS,
} from "@/types/call-sheet";

interface Props {
  jobId: string;
  timeline: CallSheetTimelineItem[];
  onChange: (timeline: CallSheetTimelineItem[]) => void;
}

export function CallSheetTimelineSection({ jobId, timeline, onChange }: Props) {
  // Consulta de cenas do roteiro associado ao Job (se houver)
  const { data: script } = useQuery({
    queryKey: ["job-script", jobId],
    queryFn: () => getScriptByJob(jobId),
  });

  const { data: scenes = [] } = useQuery({
    queryKey: ["script-scenes", script?.id],
    queryFn: () => (script ? listScenes(script.id) : []),
    enabled: !!script?.id,
  });

  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newType, setNewType] = useState<CallSheetBlockType>("shooting");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedSceneId, setSelectedSceneId] = useState<string>("none");

  const handleAddBlock = () => {
    if (!newTitle.trim()) return;

    let sceneNumber: number | null = null;
    if (selectedSceneId !== "none") {
      const found = scenes.find((s) => s.id === selectedSceneId);
      if (found) sceneNumber = found.scene_number;
    }

    const newItem: CallSheetTimelineItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      time_start: newStart,
      time_end: newEnd,
      type: newType,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      scene_id: selectedSceneId !== "none" ? selectedSceneId : null,
      scene_number: sceneNumber,
    };

    onChange([...timeline, newItem]);
    setNewTitle("");
    setNewDesc("");
    setSelectedSceneId("none");
  };

  const handleUpdate = (id: string, patch: Partial<CallSheetTimelineItem>) => {
    onChange(timeline.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemove = (id: string) => {
    onChange(timeline.filter((item) => item.id !== id));
  };

  const handleSelectScene = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    if (sceneId === "none") return;

    const scene = scenes.find((s) => s.id === sceneId);
    if (scene) {
      setNewTitle(`Cena ${scene.scene_number}: ${scene.visual?.slice(0, 40) || "Gravação"}`);
      setNewDesc(scene.production_notes || scene.speech || "");
      setNewType("shooting");
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground tracking-tight">Cronograma da Diária (Linha do Tempo)</h3>
          <span className="text-[10px] font-mono-kasa bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">
            {timeline.length} {timeline.length === 1 ? "bloco" : "blocos"}
          </span>
        </div>

        {script && (
          <Badge variant="outline" className="text-[10px] font-mono-kasa gap-1 py-0.5">
            <Clapperboard className="size-3 text-primary" /> Roteiro Vinculado ({scenes.length} cenas)
          </Badge>
        )}
      </div>

      {/* Lista de Blocos */}
      {timeline.length === 0 ? (
        <div className="py-6 border border-dashed border-border/60 rounded-lg text-center bg-muted/10">
          <p className="text-xs text-muted-foreground">Nenhum bloco de horário cadastrado.</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Monte o cronograma da diária abaixo para organizar montagem, cenas e pausas.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {timeline.map((item, idx) => {
            const config = CALL_SHEET_BLOCK_LABELS[item.type] || CALL_SHEET_BLOCK_LABELS.prep;
            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border transition-all ${config.bg} ${config.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
              >
                <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                  {/* Horário */}
                  <div className="flex items-center gap-1 shrink-0 font-mono-kasa text-xs font-bold text-foreground bg-background/80 px-2 py-1 rounded border border-border/60 shadow-xs">
                    <Clock className="size-3 text-muted-foreground" />
                    <span>{item.time_start}</span>
                    {item.time_end && (
                      <>
                        <span className="text-muted-foreground">-</span>
                        <span>{item.time_end}</span>
                      </>
                    )}
                  </div>

                  {/* Informações do Bloco */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{item.title}</span>
                      <span className={`text-[9px] font-mono-kasa font-medium uppercase px-1.5 py-0.2 rounded border ${config.border} ${config.color} bg-background/50`}>
                        {config.label}
                      </span>
                      {item.scene_number && (
                        <Badge variant="secondary" className="text-[9px] font-mono-kasa h-4 px-1.5">
                          Cena {item.scene_number}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemove(item.id)}
                    className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                    title="Excluir bloco"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário de Adição de Bloco */}
      <div className="pt-3 border-t border-border/40 space-y-2">
        <div className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
          <Plus className="size-3 text-primary" /> Adicionar Bloco ao Cronograma
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
          {/* Horário Início e Fim */}
          <div className="sm:col-span-2 flex items-center gap-1">
            <Input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/60 font-mono-kasa p-1 text-center"
              title="Início"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <Input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/60 font-mono-kasa p-1 text-center"
              title="Fim"
            />
          </div>

          {/* Tipo de Bloco */}
          <div className="sm:col-span-3">
            <Select value={newType} onValueChange={(v) => setNewType(v as CallSheetBlockType)}>
              <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CALL_SHEET_BLOCK_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor Rápido de Cena do Roteiro (se houver) */}
          {scenes.length > 0 && (
            <div className="sm:col-span-3">
              <Select value={selectedSceneId} onValueChange={handleSelectScene}>
                <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/60">
                  <SelectValue placeholder="Vincular cena..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    Sem cena vinculada
                  </SelectItem>
                  {scenes.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      Cena {s.scene_number}: {s.visual?.slice(0, 25) || "Tomada"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Título do Bloco */}
          <div className={scenes.length > 0 ? "sm:col-span-3" : "sm:col-span-6"}>
            <Input
              placeholder="Título da atividade ou cena..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/60"
            />
          </div>

          {/* Botão Adicionar */}
          <div className="sm:col-span-1">
            <Button
              type="button"
              size="sm"
              onClick={handleAddBlock}
              disabled={!newTitle.trim()}
              className="h-8 w-full text-xs"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Detalhes / Observações adicionais do bloco */}
        <Input
          placeholder="Descrição, enquadramento ou observações do bloco (opcional)..."
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="h-7 text-[11px] bg-muted/10 border-border/40"
        />
      </div>
    </div>
  );
}
