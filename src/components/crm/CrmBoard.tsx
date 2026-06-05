import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Plus, Trophy, Search } from "lucide-react";
import {
  fetchStages,
  fetchLeads,
  moveLead,
  formatCurrency,
  type Lead,
  type Stage,
} from "@/lib/crm-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewLeadDialog } from "./NewLeadDialog";
import { LeadSheet } from "./LeadSheet";
import { toast } from "sonner";

export function CrmBoard() {
  const qc = useQueryClient();
  const { data: stages = [] } = useQuery({ queryKey: ["crm", "stages"], queryFn: fetchStages });
  const { data: leads = [] } = useQuery({ queryKey: ["crm", "leads"], queryFn: fetchLeads });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [newLeadStage, setNewLeadStage] = useState<Stage | null>(null);
  const [query, setQuery] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.company ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q),
    );
  }, [leads, query]);

  const byStage = useMemo(() => {
    const m = new Map<string, Lead[]>();
    for (const s of stages) m.set(s.id, []);
    for (const l of filtered) {
      if (l.stage_id && m.has(l.stage_id)) m.get(l.stage_id)!.push(l);
    }
    return m;
  }, [stages, filtered]);

  const moveMut = useMutation({
    mutationFn: async ({ id, stageId, stage }: { id: string; stageId: string; stage: Stage }) => {
      const extras = stage.is_won ? { won_at: new Date().toISOString() } : { won_at: null };
      return moveLead(id, stageId, extras);
    },
    onMutate: async ({ id, stageId }) => {
      await qc.cancelQueries({ queryKey: ["crm", "leads"] });
      const prev = qc.getQueryData<Lead[]>(["crm", "leads"]);
      qc.setQueryData<Lead[]>(["crm", "leads"], (old) =>
        (old ?? []).map((l) => (l.id === id ? { ...l, stage_id: stageId } : l)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["crm", "leads"], ctx.prev);
      toast.error("Não foi possível mover o lead");
    },
    onSuccess: (_, { stage }) => {
      if (stage.is_won) toast.success("🎉 Lead fechado! Gere a proposta na aba Propostas.");
    },
  });

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    const id = String(e.active.id);
    if (!overId) return;
    const stage = stages.find((s) => s.id === overId);
    const lead = leads.find((l) => l.id === id);
    if (!stage || !lead || lead.stage_id === overId) return;
    moveMut.mutate({ id, stageId: overId, stage });
  }

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="text-primary text-[10px] capitalize">
            Comercial · CRM
          </span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-1">
            Funil comercial
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar lead, empresa, e-mail…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 w-72 bg-surface border-border"
            />
          </div>
          <Button
            onClick={() => setNewLeadStage(stages[0] ?? null)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold h-10 px-5 gap-2"
          >
            <Plus className="size-4" /> Novo lead
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-6 lg:px-10 pb-10">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-4 min-w-max h-full">
            {stages.map((stage) => {
              const cards = byStage.get(stage.id) ?? [];
              const total = cards.reduce((acc, l) => acc + Number(l.value), 0);
              return (
                <Column
                  key={stage.id}
                  stage={stage}
                  total={total}
                  count={cards.length}
                  onAdd={() => setNewLeadStage(stage)}
                >
                  {cards.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onClick={() => setOpenLead(lead)} />
                  ))}
                </Column>
              );
            })}
          </div>
          <DragOverlay>
            {activeLead ? <LeadCardInner lead={activeLead} dragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {newLeadStage && (
        <NewLeadDialog
          stage={newLeadStage}
          onOpenChange={(o) => !o && setNewLeadStage(null)}
        />
      )}
      <LeadSheet lead={openLead} stages={stages} onClose={() => setOpenLead(null)} />
    </div>
  );
}

function Column({
  stage,
  total,
  count,
  onAdd,
  children,
}: {
  stage: Stage;
  total: number;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div className="w-[300px] shrink-0 flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ background: stage.color }}
          />
          <span className="font-display font-semibold text-sm tracking-tight">{stage.name}</span>
          {stage.is_won && <Trophy className="size-3.5 text-primary" />}
          <span className="text-[10px] text-foreground/40">{count}</span>
        </div>
        <button
          onClick={onAdd}
          className="size-6 rounded-md hover:bg-surface-elevated grid place-items-center text-foreground/50 hover:text-primary transition"
          aria-label={`Adicionar em ${stage.name}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <div className="text-[10px] text-foreground/40 mb-2 px-1 capitalize">
        {formatCurrency(total)}
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border border-dashed p-2 space-y-2 transition-colors ${
          isOver ? "border-primary/60 bg-primary/5" : "border-border/60 bg-surface/40"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <LeadCardInner lead={lead} />
    </div>
  );
}

function LeadCardInner({ lead, dragging }: { lead: Lead; dragging?: boolean }) {
  return (
    <div
      className={`bg-surface-elevated border border-border rounded-lg p-3 hover:border-primary/50 transition ${
        dragging ? "shadow-2xl rotate-1" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{lead.name}</div>
          {lead.company && (
            <div className="text-[11px] text-foreground/50 truncate">{lead.company}</div>
          )}
        </div>
        {Number(lead.value) > 0 && (
          <span className="text-[11px] text-primary shrink-0">
            {formatCurrency(Number(lead.value))}
          </span>
        )}
      </div>
      {lead.source && (
        <span className="inline-block mt-2 text-[10px] capitalize text-foreground/40 border border-border rounded px-1.5 py-0.5">
          {lead.source}
        </span>
      )}
    </div>
  );
}
