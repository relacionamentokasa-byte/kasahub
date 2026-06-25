import { useState } from "react";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GripVertical, Plus, Trash2, Image as ImageIcon, Link as LinkIcon, X } from "lucide-react";
import { toast } from "sonner";
import {
  addScene, updateScene, deleteScene, reorderScenes, uploadSceneReference, type ScriptScene,
} from "@/lib/scripts-api";

function SceneItem({ scene, disabled }: { scene: ScriptScene; disabled?: boolean }) {
  const qc = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: scene.id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [local, setLocal] = useState(scene);

  const save = useMutation({
    mutationFn: (patch: Partial<ScriptScene>) => updateScene(scene.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["script-scenes", scene.script_id] }),
  });
  const del = useMutation({
    mutationFn: () => deleteScene(scene.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["script-scenes", scene.script_id] }),
  });

  return (
    <Card ref={setNodeRef} style={style} className="bg-surface border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab text-foreground/40 hover:text-foreground" disabled={disabled}>
          <GripVertical className="size-4" />
        </button>
        <span className="font-mono-kasa text-xs text-primary">Cena {scene.scene_number}</span>
        <Input
          type="number"
          value={local.duration_sec ?? ""}
          onChange={(e) => setLocal({ ...local, duration_sec: e.target.value ? Number(e.target.value) : null })}
          onBlur={() => save.mutate({ duration_sec: local.duration_sec })}
          placeholder="Duração (s)"
          className="bg-background h-7 w-32 ml-auto text-xs"
          disabled={disabled}
        />
        {!disabled && (
          <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => { if (confirm("Excluir cena?")) del.mutate(); }}>
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Visual / Enquadramento</Label>
          <Textarea
            value={local.visual}
            onChange={(e) => setLocal({ ...local, visual: e.target.value })}
            onBlur={() => save.mutate({ visual: local.visual })}
            rows={3}
            className="bg-background text-sm"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fala / Texto</Label>
          <Textarea
            value={local.speech ?? ""}
            onChange={(e) => setLocal({ ...local, speech: e.target.value })}
            onBlur={() => save.mutate({ speech: local.speech })}
            rows={3}
            className="bg-background text-sm"
            disabled={disabled}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Observações de produção</Label>
        <Textarea
          value={local.production_notes ?? ""}
          onChange={(e) => setLocal({ ...local, production_notes: e.target.value })}
          onBlur={() => save.mutate({ production_notes: local.production_notes })}
          rows={2}
          className="bg-background text-sm"
          placeholder="Trilha, transição, elementos gráficos…"
          disabled={disabled}
        />
      </div>

      {/* Referência visual */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <Label className="text-xs flex items-center gap-1.5 text-foreground/70">
          <ImageIcon className="size-3.5" /> Referência visual
        </Label>
        <div className="flex flex-wrap items-start gap-3">
          {local.reference_image_url ? (
            <div className="relative group">
              <img src={local.reference_image_url} alt="Ref" className="size-24 rounded-md object-cover border border-border" />
              {!disabled && (
                <button
                  onClick={() => { setLocal({ ...local, reference_image_url: null }); save.mutate({ reference_image_url: null }); }}
                  className="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-destructive-foreground grid place-items-center opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remover imagem"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ) : (
            !disabled && (
              <label className="size-24 rounded-md border border-dashed border-border grid place-items-center text-foreground/40 hover:text-primary hover:border-primary cursor-pointer transition">
                <ImageIcon className="size-5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const url = await uploadSceneReference(scene.script_id, f);
                      setLocal({ ...local, reference_image_url: url });
                      save.mutate({ reference_image_url: url });
                    } catch (err: any) {
                      toast.error(err.message ?? "Falha no upload");
                    }
                  }}
                />
              </label>
            )
          )}
          <div className="flex-1 min-w-[180px] space-y-1">
            <div className="relative">
              <LinkIcon className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
              <Input
                value={local.reference_url ?? ""}
                onChange={(e) => setLocal({ ...local, reference_url: e.target.value || null })}
                onBlur={() => save.mutate({ reference_url: local.reference_url })}
                placeholder="Pinterest, Drive, YouTube..."
                className="bg-background h-8 text-xs pl-8"
                disabled={disabled}
              />
            </div>
            <p className="text-[10px] text-foreground/40">Cole um link de referência ou anexe um frame/print</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface Props {
  scriptId: string;
  scenes: ScriptScene[];
  disabled?: boolean;
}

export function ScenesEditor({ scriptId, scenes, disabled }: Props) {
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const add = useMutation({
    mutationFn: () => addScene(scriptId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["script-scenes", scriptId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderScenes(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["script-scenes", scriptId] }),
  });

  const handleEnd = (e: DragEndEvent) => {
    if (!e.over || e.over.id === e.active.id) return;
    const oldIndex = scenes.findIndex(s => s.id === e.active.id);
    const newIndex = scenes.findIndex(s => s.id === e.over!.id);
    const next = arrayMove(scenes, oldIndex, newIndex);
    reorder.mutate(next.map(s => s.id));
  };

  const totalDuration = scenes.reduce((acc, s) => acc + (s.duration_sec ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">Cenas</h3>
        <span className="text-xs text-foreground/60 font-mono-kasa">
          Total estimado: {totalDuration}s ({scenes.length} cenas)
        </span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
        <SortableContext items={scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {scenes.map(s => <SceneItem key={s.id} scene={s} disabled={disabled} />)}
          </div>
        </SortableContext>
      </DndContext>
      {!disabled && (
        <Button variant="outline" className="w-full" onClick={() => add.mutate()} disabled={add.isPending}>
          <Plus className="size-4 mr-1" /> Adicionar cena
        </Button>
      )}
    </div>
  );
}
