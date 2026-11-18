import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Link2, Trash2, Maximize2, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NODE_LABELS, NODE_TYPES, createEdge, createNode, deleteEdge, deleteNode, fetchStrategicMap, updateNode,
  type NodeType, type StrategicNode,
} from "@/lib/strategic-map-api";

const NODE_W = 200;
const NODE_H = 84;
const MIN_Z = 0.4;
const MAX_Z = 2;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const TYPE_STYLE: Record<NodeType, string> = {
  objective: "border-primary", evidence: "border-muted-foreground", idea: "border-accent-foreground",
  hypothesis: "border-ring", direction: "border-secondary-foreground", action: "border-foreground", result: "border-primary",
};

/** Caminho Bézier entre o centro direito da origem e o centro esquerdo do destino. */
function edgePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2;
  const dx = Math.max(40, Math.abs(x2 - x1) / 2);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

export function StrategicCanvas({ clientId, clientName }: { clientId: string; clientName: string }) {
  const qc = useQueryClient();
  const key = ["strategic-map", clientId];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => fetchStrategicMap(clientId) });

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const view = useRef({ x: 40, y: 40, z: 1 });
  const pos = useRef(new Map<string, { x: number; y: number }>());
  const nodeEls = useRef(new Map<string, HTMLDivElement>());
  const raf = useRef(0);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoomLabel, setZoomLabel] = useState(100);

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];
  for (const n of nodes) if (!pos.current.has(n.id)) pos.current.set(n.id, { x: Number(n.position_x), y: Number(n.position_y) });

  /** Aplica transformações direto no DOM, fora do ciclo do React. */
  const paint = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const { x, y, z } = view.current;
      if (worldRef.current) worldRef.current.style.transform = `translate3d(${x}px,${y}px,0) scale(${z})`;
      nodeEls.current.forEach((el, id) => {
        const p = pos.current.get(id);
        if (p) el.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
      });
      worldRef.current?.querySelectorAll<SVGPathElement>("path[data-s]").forEach((path) => {
        const a = pos.current.get(path.dataset.s!), b = pos.current.get(path.dataset.t!);
        if (a && b) path.setAttribute("d", edgePath(a, b));
      });
    });
  };
  useEffect(paint);

  const zoomAt = (next: number, px: number, py: number) => {
    const v = view.current, nz = clamp(next, MIN_Z, MAX_Z), k = nz / v.z;
    view.current = { z: nz, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    setZoomLabel(Math.round(nz * 100));
    paint();
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey || !e.shiftKey) {
        const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
        if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) < 1) {
          zoomAt(view.current.z * Math.exp(-dy * 0.0015), e.clientX - r.left, e.clientY - r.top);
          return;
        }
      }
      view.current.x -= e.deltaX; view.current.y -= e.deltaY; paint();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isLoading]);

  const savePos = useMutation({
    mutationFn: ({ id, x, y }: { id: string; x: number; y: number }) => updateNode(id, { position_x: Math.round(x), position_y: Math.round(y) }),
    onError: () => toast.error("Não foi possível salvar a posição."),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  const addNode = useMutation({
    mutationFn: (type: NodeType) => {
      const r = viewportRef.current!.getBoundingClientRect(), v = view.current;
      return createNode(data!.plan.id, type, (r.width / 2 - v.x) / v.z - NODE_W / 2, (r.height / 2 - v.y) / v.z - NODE_H / 2);
    },
    onSuccess: invalidate, onError: () => toast.error("Erro ao criar bloco."),
  });
  const removeNode = useMutation({ mutationFn: deleteNode, onSuccess: () => { setSelected(null); invalidate(); } });
  const addEdge = useMutation({
    mutationFn: ({ s, t }: { s: string; t: string }) => createEdge(data!.plan.id, s, t),
    onSuccess: invalidate, onError: () => toast.error("Essa conexão já existe."),
  });
  const removeEdge = useMutation({ mutationFn: deleteEdge, onSuccess: invalidate });
  const rename = useMutation({ mutationFn: ({ id, title }: { id: string; title: string }) => updateNode(id, { title }), onSuccess: invalidate });

  /** Pan do fundo. */
  const onBgDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.bg) return;
    setSelected(null); setConnectFrom(null);
    const el = e.currentTarget as HTMLElement; el.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY, ox = view.current.x, oy = view.current.y;
    const move = (ev: PointerEvent) => { view.current.x = ox + ev.clientX - sx; view.current.y = oy + ev.clientY - sy; paint(); };
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up);
  };

  /** Arrasto de bloco, persistido apenas ao soltar. */
  const onNodeDown = (e: React.PointerEvent, n: StrategicNode) => {
    if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
    e.stopPropagation();
    if (connectFrom && connectFrom !== n.id) { addEdge.mutate({ s: connectFrom, t: n.id }); setConnectFrom(null); return; }
    setSelected(n.id);
    const el = e.currentTarget as HTMLElement; el.setPointerCapture(e.pointerId);
    const start = { ...pos.current.get(n.id)! }, sx = e.clientX, sy = e.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => {
      moved = true;
      pos.current.set(n.id, { x: start.x + (ev.clientX - sx) / view.current.z, y: start.y + (ev.clientY - sy) / view.current.z });
      paint();
    };
    const up = () => {
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up);
      const p = pos.current.get(n.id)!;
      if (moved) savePos.mutate({ id: n.id, x: p.x, y: p.y });
    };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up);
  };

  if (isLoading) return <div className="h-[600px] grid place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  if (error || !data) return <p className="text-sm text-destructive p-6">Não foi possível carregar o mapa estratégico.</p>;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">O que está acontecendo com {clientName}?</h2>
        <p className="text-xs text-muted-foreground">Arraste os blocos, use a roda do mouse para zoom e conecte ideias.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {NODE_TYPES.map((t) => (
          <Button key={t} size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={addNode.isPending} onClick={() => addNode.mutate(t)}>
            <Plus className="size-3" /> {NODE_LABELS[t]}
          </Button>
        ))}
      </div>
      <div
        ref={viewportRef}
        onPointerDown={onBgDown}
        data-bg="1"
        className={cn("relative h-[620px] overflow-hidden rounded-lg border border-border/60 bg-muted/30 touch-none select-none", connectFrom ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing")}
        style={{ backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
      >
        <div ref={worldRef} className="absolute left-0 top-0 will-change-transform" style={{ transformOrigin: "0 0" }}>
          <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" width="1" height="1">
            <defs><marker id="sm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" /></marker></defs>
            {edges.map((e) => (
              <path key={e.id} data-s={e.source_node_id} data-t={e.target_node_id} className="stroke-muted-foreground fill-none pointer-events-auto cursor-pointer hover:stroke-destructive" strokeWidth={2} markerEnd="url(#sm-arrow)"
                onPointerDown={(ev) => { ev.stopPropagation(); if (confirm("Remover esta conexão?")) removeEdge.mutate(e.id); }} />
            ))}
          </svg>
          {nodes.map((n) => (
            <div
              key={n.id}
              ref={(el) => { if (el) nodeEls.current.set(n.id, el); else nodeEls.current.delete(n.id); }}
              onPointerDown={(e) => onNodeDown(e, n)}
              className={cn("absolute left-0 top-0 rounded-lg border-2 bg-card p-3 shadow-sm will-change-transform cursor-move", TYPE_STYLE[n.type],
                selected === n.id && "ring-2 ring-ring ring-offset-2 ring-offset-background", connectFrom === n.id && "ring-2 ring-primary")}
              style={{ width: NODE_W, minHeight: NODE_H }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">{NODE_LABELS[n.type]}</span>
                {selected === n.id && (
                  <div data-nodrag className="flex gap-0.5">
                    <button aria-label="Conectar" className="p-1 rounded hover:bg-muted" onClick={() => { setConnectFrom(n.id); toast("Clique no bloco de destino."); }}><Link2 className="size-3" /></button>
                    <button aria-label="Excluir" className="p-1 rounded hover:bg-muted text-destructive" onClick={() => removeNode.mutate(n.id)}><Trash2 className="size-3" /></button>
                  </div>
                )}
              </div>
              <div
                data-nodrag={selected === n.id ? "1" : undefined}
                contentEditable={selected === n.id}
                suppressContentEditableWarning
                onBlur={(e) => { const t = e.currentTarget.textContent?.trim(); if (t && t !== n.title) rename.mutate({ id: n.id, title: t }); }}
                className="mt-1 text-sm font-medium text-foreground outline-none break-words"
              >{n.title}</div>
            </div>
          ))}
        </div>
        {nodes.length === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground pointer-events-none">Adicione o primeiro bloco usando os botões acima.</p>}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md border border-border/60 bg-card p-1 shadow-sm">
          {[{ i: ZoomOut, f: 1 / 1.2, l: "Diminuir zoom" }, { i: ZoomIn, f: 1.2, l: "Aumentar zoom" }].map(({ i: Icon, f, l }) => (
            <button key={l} aria-label={l} className="p-1.5 rounded hover:bg-muted" onClick={() => { const r = viewportRef.current!.getBoundingClientRect(); zoomAt(view.current.z * f, r.width / 2, r.height / 2); }}><Icon className="size-3.5" /></button>
          ))}
          <span className="text-[10px] font-mono-kasa w-9 text-center">{zoomLabel}%</span>
          <button aria-label="Centralizar" className="p-1.5 rounded hover:bg-muted" onClick={() => { view.current = { x: 40, y: 40, z: 1 }; setZoomLabel(100); paint(); }}><Maximize2 className="size-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
