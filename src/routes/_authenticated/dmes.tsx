import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, Link as LinkIcon, Check, X, Loader2, Sparkles, Search, Filter, Briefcase, Layers, PlusCircle, FileDown, Pencil, AlertTriangle,
} from "lucide-react";
import {
  fetchExtraDemands, createExtraDemandsBatch, deleteExtraDemand,
  approveExtraDemand, rejectExtraDemand, getDmePublicUrl, fetchClients,
  updateExtraDemandWithFinance,
} from "@/lib/ops-api";
import { createDmeBatch, getDmeBatchPublicUrl, addDmeToConsolidatedBatch, addDmeToConsolidatedTransaction, deleteDmeBatch } from "@/lib/dme-batches-api";
import { generateDmeBatchPdf, generateConsolidatedTxPdf, generateSingleDmePdf } from "@/lib/dme-batch-pdf";
import { supabase } from "@/integrations/supabase/client";
import { NewJobDialog } from "@/components/jobs/NewJobDialog";
import { fetchContracts } from "@/lib/finance-api";
import { fetchProfiles } from "@/lib/profile-api";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableRowsSkeleton } from "@/components/ui/loading-skeletons";
import { brl } from "@/lib/utils-format";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/dmes")({
  head: () => ({ meta: [{ title: "Demandas Extras — KASA HUB" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    clientId: (s.clientId as string) || undefined,
  }),
  component: DmesPage,
});

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft:      { label: "Rascunho",  cls: "text-muted-foreground border-border/80 bg-background" },
  sent:       { label: "Enviada",   cls: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5" },
  pending:    { label: "Aguardando", cls: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5" },
  approved:   { label: "Aprovada",  cls: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5" },
  rejected:   { label: "Recusada",  cls: "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/5" },
  in_production: { label: "Em produção", cls: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/5" },
  completed:  { label: "Concluída", cls: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5" },
};

function DmesPage() {
  const { clientId: prefClientId } = useSearch({ from: "/_authenticated/dmes" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [jobForDme, setJobForDme] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [addItemFor, setAddItemFor] = useState<any | null>(null);
  const [editingDme, setEditingDme] = useState<any | null>(null);
  const [unconsolidatingBatch, setUnconsolidatingBatch] = useState<any | null>(null);
  const [viewingBatch, setViewingBatch] = useState<any | null>(null);

  const { data: dmes = [], isLoading } = useQuery({
    queryKey: ["extra_demands", { status: statusFilter, clientId: prefClientId }],
    queryFn: () => fetchExtraDemands({ status: statusFilter, clientId: prefClientId }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const dmeIdsKey = useMemo(() => dmes.map((d: any) => d.id).sort().join(","), [dmes]);
  const { data: jobsByDme = {} } = useQuery({
    queryKey: ["jobs-by-dme", dmeIdsKey],
    enabled: dmeIdsKey.length > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const ids = dmeIdsKey.split(",");
      const { data, error } = await supabase
        .from("jobs")
        .select("id, dme_id, title")
        .in("dme_id", ids);
      if (error) throw error;
      const map: Record<string, { id: string; title: string }> = {};
      (data ?? []).forEach((j: any) => { if (j.dme_id) map[j.dme_id] = { id: j.id, title: j.title }; });
      return map;
    },
  });

  const { data: batchByDme = {} } = useQuery<Record<string, { id: string; status: string; total_value: number; consolidated_transaction_id: string | null; friendly_number?: string }>>({
    queryKey: ["batches-by-dme", dmeIdsKey],
    enabled: dmeIdsKey.length > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const ids = dmeIdsKey.split(",");
      const { data, error } = await supabase
        .from("dme_batch_items" as any)
        .select("extra_demand_id, dme_batches(id, status, total_value, consolidated_transaction_id, friendly_number)")
        .in("extra_demand_id", ids);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data ?? []).forEach((i: any) => {
        if (i.extra_demand_id && i.dme_batches) map[i.extra_demand_id] = i.dme_batches;
      });
      return map;
    },
  });
  // Todos os lotes ativos (independente dos filtros da tabela) — para permitir
  // adicionar uma nova DME ao lote mesmo que nenhuma DME do lote esteja visível.
  const { data: activeBatchesRaw = [] } = useQuery<any[]>({
    queryKey: ["dme-batches-active"],
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dme_batches" as any)
        .select("id, public_token, status, total_value, consolidated_transaction_id, client_id, created_at, friendly_number, clients(name, company), dme_batch_items(extra_demand_id), transactions!dme_batches_consolidated_transaction_id_fkey(due_date, valor_previsto, amount)")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Deduplicação estrita por dme_batch.id para garantir que cada lote apareça uma única vez
      const rawRows = (data ?? []) as any[];
      const uniqueBatchesMap = new Map();
      rawRows.forEach(row => {
        if (!uniqueBatchesMap.has(row.id)) {
          uniqueBatchesMap.set(row.id, row);
        }
      });
      const rows = Array.from(uniqueBatchesMap.values());

      const txIds = rows.map((r) => r.consolidated_transaction_id).filter(Boolean);
      let txMap = new Map<string, string>();
      if (txIds.length) {
        const { data: txs } = await supabase.from("transactions").select("id, status").in("id", txIds);
        txMap = new Map((txs ?? []).map((t: any) => [t.id, t.status]));
      }
      return rows.map((r) => ({ ...r, _tx_status: r.consolidated_transaction_id ? txMap.get(r.consolidated_transaction_id) ?? null : null }));
    },
  });
  const activeBatches = useMemo(() => activeBatchesRaw.filter((b: any) => b._tx_status !== "paid"), [activeBatchesRaw]);
  const paidBatches = useMemo(() => activeBatchesRaw.filter((b: any) => b._tx_status === "paid"), [activeBatchesRaw]);


  // DMEs consolidadas via `consolidated_transaction_id` em extra_demands
  // que NÃO possuem um registro correspondente em dme_batches.
  // Isso acontece quando DMEs são vinculadas manualmente no financeiro 
  // sem passar pela criação formal de um Lote.
  const { data: legacyConsolidatedTxGroups = [] } = useQuery<any[]>({
    queryKey: ["dmes-consolidated-tx-groups"],
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      // 1. Buscamos todas as DMEs que possuem transação consolidada
      const { data: dmeRows, error: dmeError } = await supabase
        .from("extra_demands")
        .select("id, client_id, consolidated_transaction_id, clients(name, company)")
        .not("consolidated_transaction_id", "is", null);
      if (dmeError) throw dmeError;
      if (!dmeRows || dmeRows.length === 0) return [];

      // 2. Buscamos os IDs das transações consolidadas que já estão vinculadas a algum lote
      // via tabela dme_batch_items (o vínculo definitivo entre DME e Lote)
      const { data: batchItems, error: itemsError } = await supabase
        .from("dme_batch_items" as any)
        .select("extra_demand_id, batch_id");
      if (itemsError) throw itemsError;

      const dmeToBatchId = new Map((batchItems ?? []).map((i: any) => [i.extra_demand_id, i.batch_id]));
      
      // 3. Identificamos quais transações consolidadas pertencem a DMEs que estão em lotes
      const txIdsInBatches = new Set<string>();
      dmeRows.forEach(row => {
        if (row.consolidated_transaction_id && dmeToBatchId.has(row.id)) {
          txIdsInBatches.add(row.consolidated_transaction_id);
        }
      });

      // 4. Também verificamos o vínculo direto na tabela dme_batches (se existir)
      const { data: batchesDirect, error: batchesError } = await supabase
        .from("dme_batches" as any)
        .select("consolidated_transaction_id")
        .not("consolidated_transaction_id", "is", null);
      if (!batchesError && batchesDirect) {
        batchesDirect.forEach((b: any) => txIdsInBatches.add(b.consolidated_transaction_id));
      }

      // 5. Agora filtramos as transações para o fluxo legado
      const uniqueTxIds = Array.from(new Set(dmeRows.map((r) => r.consolidated_transaction_id)));
      // IMPORTANTE: Filtragem definitiva. Se a transação está em QUALQUER lote, ela sai daqui.
      const legacyTxIds = uniqueTxIds.filter(id => id && !txIdsInBatches.has(id));
      
      if (legacyTxIds.length === 0) return [];

      const { data: txs, error: txError } = await supabase
        .from("transactions")
        .select("id, amount, status")
        .in("id", legacyTxIds);
      if (txError) throw txError;
      
      const txMap = new Map((txs ?? []).map((t: any) => [t.id, t]));

      const groups: Record<string, any> = {};
      for (const r of dmeRows) {
        const txId = r.consolidated_transaction_id;
        if (!txId || txIdsInBatches.has(txId)) continue;
        
        const tx = txMap.get(txId);
        if (!tx || tx.status === "cancelled" || tx.status === "paid") continue;

        if (!groups[txId]) {
          groups[txId] = {
            consolidated_transaction_id: txId,
            client_id: r.client_id,
            clients: r.clients,
            total_value: Number(tx.amount || 0),
            count: 0,
          };
        }
        groups[txId].count += 1;
      }
      return Object.values(groups);
    },
  });

  const filtered = useMemo(
    () =>
      dmes.filter((d: any) => {
        // DMEs já agrupadas em um lote ou consolidadas numa cobrança do
        // financeiro não aparecem individualmente — o lote consolidado já é
        // exibido no card "Lotes ativos" acima, mostrando apenas o total.
        if (batchByDme[d.id]) return false;
        if (d.consolidated_transaction_id) return false;
        if (search) {
          const q = search.toLowerCase();
          if (
            !d.title?.toLowerCase().includes(q) &&
            !d.number_display?.toLowerCase().includes(q)
          ) return false;
        }
        return true;
      }),
    [dmes, search, batchByDme]
  );

  const approveMut = useMutation({
    mutationFn: (id: string) => approveExtraDemand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("DME aprovada · lançamento financeiro gerado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectExtraDemand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      toast.success("DME recusada");
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteExtraDemand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      toast.success("DME removida");
    },
  });
  const deleteBatchMut = useMutation({
    mutationFn: ({ id, restore }: { id: string, restore: boolean }) => deleteDmeBatch(id, restore),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["dme-batches-active"] });
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      qc.invalidateQueries({ queryKey: ["batches-by-dme"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      
      const msg = data.count_restored > 0 
        ? `Lote ${data.friendly_number} excluído. ${data.count_restored} lançamento(s) financeiro(s) restaurado(s).`
        : `Lote ${data.friendly_number} excluído.`;
      toast.success(msg);
      setUnconsolidatingBatch(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir lote."),
  });

  function copyLink(token: string) {
    navigator.clipboard.writeText(getDmePublicUrl(token));
    toast.success("Link copiado!");
  }

  // Batch selection helpers
  const ELIGIBLE = ["draft", "pending", "sent", "pending_approval", "approved"];
  const selectedDmes = useMemo(
    () => dmes.filter((d: any) => selectedIds.has(d.id)),
    [dmes, selectedIds]
  );
  const lockedClientId = selectedDmes[0]?.client_id ?? null;
  const selectedTotal = selectedDmes.reduce((acc: number, d: any) => acc + Number(d.value || 0), 0);

  function toggleOne(d: any) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(d.id)) next.delete(d.id);
      else next.add(d.id);
      return next;
    });
  }

  function isSelectable(d: any) {
    if (!ELIGIBLE.includes(d.status)) return false;
    // Já está em um lote ativo ou consolidado no financeiro? não pode reagrupar
    if (batchByDme[d.id]) return false;
    if (d.consolidated_transaction_id) return false;
    if (lockedClientId && d.client_id !== lockedClientId) return false;
    return true;
  }

  async function handleCreateBatch() {
    if (selectedDmes.length < 2) {
      toast.error("Selecione ao menos 2 DMEs para gerar o lote.");
      return;
    }
    setCreatingBatch(true);
    try {
      const batch = await createDmeBatch({
        client_id: lockedClientId!,
        extra_demand_ids: selectedDmes.map((d: any) => d.id),
      });
      const url = getDmeBatchPublicUrl(batch.public_token);
      await navigator.clipboard.writeText(url);
      toast.success(`Link do lote copiado! (${selectedDmes.length} DMEs · ${brl(selectedTotal)})`);
      setSelectedIds(new Set());
      // Já gera o PDF para envio ao cliente
      try { await generateDmeBatchPdf(batch.id); } catch (e) { console.error(e); }
      qc.invalidateQueries({ queryKey: ["dme-batches-active"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar lote.");
    } finally {
      setCreatingBatch(false);
    }
  }

  async function handleDownloadBatchPdf(
    batchId: string,
    mode: "approval" | "approved" | "all" = "all",
  ) {
    try {
      await generateDmeBatchPdf(batchId, mode);
      toast.success("PDF gerado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar PDF.");
    }
  }

  async function handleDownloadSinglePdf(dmeId: string) {
    try {
      await generateSingleDmePdf(dmeId);
      toast.success("PDF da DME gerado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar PDF.");
    }
  }


  // KPIs rápidos de DMEs
  const kpiStats = useMemo(() => {
    let pendingCount = 0;
    let pendingVal = 0;
    let approvedCount = 0;
    let approvedVal = 0;
    let completedVal = 0;

    dmes.forEach((d: any) => {
      const v = Number(d.value || 0);
      if (d.status === "completed" || d.paid_at) {
        completedVal += v;
      } else if (d.status === "approved" || d.status === "in_production") {
        approvedCount += 1;
        approvedVal += v;
      } else if (d.status !== "rejected" && d.status !== "cancelled") {
        pendingCount += 1;
        pendingVal += v;
      }
    });

    return {
      pendingCount,
      pendingVal,
      approvedCount,
      approvedVal,
      completedVal,
      totalActive: pendingCount + approvedCount,
    };
  }, [dmes]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full mx-auto space-y-6 animate-reveal">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa uppercase tracking-widest font-semibold">
            Receita Avulsa & Operação
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight mt-1">
            Demandas Extras (DME)
          </h1>
          <p className="text-muted-foreground text-xs lg:text-sm mt-1">
            Solicitações fora do escopo do contrato. Cada aprovação alimenta o faturamento avulso no financeiro.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setOpenNew(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium h-10 px-5 gap-2 shadow-xs transition-colors cursor-pointer">
            <Plus className="size-4 shrink-0" /> Nova DME
          </Button>
        </div>
      </div>

      {/* KPI Ribbon Executivo - Grid 2x2 no Mobile e 4 cols no Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
            Aguardando Aprovação
          </span>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2 flex-wrap">
            <span className="font-mono-kasa text-sm sm:text-xl font-bold text-foreground tabular-nums truncate">
              {brl(kpiStats.pendingVal)}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa">
              ({kpiStats.pendingCount})
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
            Aprovadas / Execução
          </span>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2 flex-wrap">
            <span className="font-mono-kasa text-sm sm:text-xl font-bold text-foreground tabular-nums truncate">
              {brl(kpiStats.approvedVal)}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa">
              ({kpiStats.approvedCount})
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
            Lotes Ativos
          </span>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2 flex-wrap">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {activeBatches.length + legacyConsolidatedTxGroups.length}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa">
              cobranças
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
            Liquidado
          </span>
          <div className="mt-0.5 sm:mt-1 font-mono-kasa text-sm sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
            {brl(kpiStats.completedVal)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-card border-border/80 rounded-lg text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-9 bg-card border-border/80 rounded-lg text-xs font-medium">
            <Filter className="size-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativas (em andamento)</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Aguardando aprovação</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="completed">Pagas / concluídas</SelectItem>
            <SelectItem value="rejected">Recusadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.size > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-sm">
            <Layers className="size-5 text-primary" />
            <span className="font-medium">
              {selectedIds.size} DME{selectedIds.size > 1 ? "s" : ""} selecionada{selectedIds.size > 1 ? "s" : ""}
            </span>
            <span className="text-muted-foreground">
              · Total <span className="font-mono-kasa font-semibold text-foreground">{brl(selectedTotal)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Limpar
            </Button>
            <Button size="sm" onClick={handleCreateBatch} disabled={creatingBatch || selectedIds.size < 2} className="gap-2">
              {creatingBatch ? <Loader2 className="size-4 animate-spin" /> : <LinkIcon className="size-4" />}
              Gerar link de aprovação em lote
            </Button>
          </div>
        </div>
      )}

      {(activeBatches.length > 0 || legacyConsolidatedTxGroups.length > 0) && (
        <div className="rounded-2xl border border-border/80 bg-muted/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-foreground text-sm uppercase tracking-wider font-mono-kasa">
              <Layers className="size-4 text-primary" /> Lotes Ativos de Cobrança
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block font-mono-kasa">
              Agrupamentos de DMEs unificadas no financeiro
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeBatches.map((b: any) => {
              const count = (b.dme_batch_items ?? []).length;
              const clientName = b.clients?.company || b.clients?.name || "Clientes diversos";
              const formattedBatch = String(b.friendly_number || "").padStart(4, '0');
              const dueDate = b.transactions?.due_date ? new Date(b.transactions.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR') : '—';

              return (
                <div key={b.id} className="group relative flex flex-col rounded-xl border border-border/80 bg-card p-4 transition-all hover:shadow-xs hover:border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono-kasa mb-0.5">
                        Lote #{formattedBatch}
                      </div>
                      <h3 className="font-semibold text-xs text-foreground truncate pr-2" title={clientName}>
                        {clientName}
                      </h3>
                    </div>
                    <div className="text-right shrink-0 font-mono-kasa">
                      <div className="text-xs font-bold text-foreground tabular-nums">
                        {brl(Number(b.total_value || 0))}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {count} DME{count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono-kasa text-muted-foreground pb-2.5 border-t border-border/40 pt-2">
                      <div className="flex items-center gap-1">
                        <span>Vencimento:</span>
                        <strong className="text-foreground">{dueDate}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        className="col-span-2 gap-2 h-8 text-xs font-medium cursor-pointer"
                        onClick={() => setAddItemFor({
                          client_id: b.client_id,
                          clients: b.clients,
                          contract_id: null,
                          _batch: b,
                        })}
                      >
                        <PlusCircle className="size-3.5" /> Adicionar DME
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-[11px] border-border/80">
                            <FileDown className="size-3" /> PDF
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-mono-kasa">Gerar PDF do Lote</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-xs py-1.5" onClick={() => handleDownloadBatchPdf(b.id, "approval")}>
                            Solicitação de aprovação (pendentes)
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs py-1.5" onClick={() => handleDownloadBatchPdf(b.id, "approved")}>
                            Apenas DMEs já aprovadas
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs py-1.5" onClick={() => handleDownloadBatchPdf(b.id, "all")}>
                            Lote completo (todas)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-[11px] border-border/80"
                        onClick={() => setViewingBatch(b)}
                      >
                        <Layers className="size-3" /> Ver DMEs
                      </Button>
                    </div>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setUnconsolidatingBatch(b)}
                      title="Excluir Lote"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {legacyConsolidatedTxGroups.map((g: any) => {
              const clientName = g.clients?.company || g.clients?.name || "Clientes diversos";
              return (
                <div key={g.consolidated_transaction_id} className="group flex flex-col rounded-xl border border-border/80 bg-card p-4 transition-all hover:shadow-xs hover:border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono-kasa mb-0.5">
                        Consolidado Financeiro
                      </div>
                      <h3 className="font-semibold text-xs text-foreground truncate pr-2" title={clientName}>
                        {clientName}
                      </h3>
                    </div>
                    <div className="text-right shrink-0 font-mono-kasa">
                      <div className="text-xs font-bold text-foreground tabular-nums">
                        {brl(Number(g.total_value || 0))}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {g.count} DME{g.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="col-span-2 gap-2 h-8 text-xs font-medium cursor-pointer"
                      onClick={() => setAddItemFor({
                        client_id: g.client_id,
                        clients: g.clients,
                        contract_id: null,
                        _consolidatedTx: g,
                      })}
                    >
                      <PlusCircle className="size-3.5" /> Adicionar DME
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="col-span-2 gap-1.5 h-7 text-[11px] border-border/80"
                      onClick={async () => {
                        try {
                          await generateConsolidatedTxPdf(g.consolidated_transaction_id);
                          toast.success("PDF gerado.");
                        } catch (e: any) {
                          toast.error(e?.message ?? "Erro ao gerar PDF.");
                        }
                      }}
                    >
                      <FileDown className="size-3" /> Gerar PDF Consolidado
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {paidBatches.length > 0 && (
        <details className="rounded-xl border border-border/80 bg-card p-4">
          <summary className="cursor-pointer font-semibold text-xs text-foreground flex items-center gap-2 font-mono-kasa uppercase tracking-wider">
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" /> Lotes Pagos ({paidBatches.length}) — Histórico
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/40">
            {paidBatches.map((b: any) => {
              const count = (b.dme_batch_items ?? []).length;
              const clientName = b.clients?.company || b.clients?.name || "Cliente";
              return (
                <div key={b.id} className="rounded-xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate text-foreground">{clientName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono-kasa">
                      Lote #{b.friendly_number || b.id.slice(0, 8)} · {count} DMEs · {brl(Number(b.total_value || 0))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadBatchPdf(b.id)}
                    className="gap-1.5 h-7 text-[11px] border-border/80 shrink-0"
                  >
                    <FileDown className="size-3" /> PDF
                  </Button>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Tabela no Desktop */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="border-border/80 hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead className="font-mono-kasa text-[11px] uppercase">Nº</TableHead>
              <TableHead className="font-mono-kasa text-[11px] uppercase">Demanda</TableHead>
              <TableHead className="font-mono-kasa text-[11px] uppercase">Cliente</TableHead>
              <TableHead className="font-mono-kasa text-[11px] uppercase">Contrato</TableHead>
              <TableHead className="text-right font-mono-kasa text-[11px] uppercase">Valor</TableHead>
              <TableHead className="font-mono-kasa text-[11px] uppercase">Vencimento</TableHead>
              <TableHead className="font-mono-kasa text-[11px] uppercase">Status</TableHead>
              <TableHead className="text-right font-mono-kasa text-[11px] uppercase">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRowsSkeleton rows={5} columns={9} />
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Sparkles className="size-8 opacity-30" />
                  <div>
                    <div className="font-medium text-foreground text-sm">Nenhuma DME pendente individual</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Todas as demandas estão consolidadas em lotes ou concluídas.</div>
                  </div>
                  <Button onClick={() => setOpenNew(true)} size="sm" className="gap-2 mt-2">
                    <Plus className="size-3.5" /> Nova DME
                  </Button>
                </div>
              </TableCell></TableRow>
            ) : filtered.map((d: any) => {
              const st = STATUS_LABEL[d.status] ?? { label: d.status, cls: "text-muted-foreground border-border bg-muted" };
              const isPending = d.status !== "approved" && d.status !== "rejected" && d.status !== "completed";
              const selectable = isSelectable(d);
              const checked = selectedIds.has(d.id);
              return (
                <TableRow key={d.id} className={checked ? "bg-primary/5 border-border/80" : "border-border/80"}>
                  <TableCell>
                    <Checkbox
                      checked={checked}
                      disabled={!selectable && !checked}
                      onCheckedChange={() => toggleOne(d)}
                      title={
                        !selectable
                          ? lockedClientId && d.client_id !== lockedClientId
                            ? "Apenas DMEs do mesmo cliente"
                            : "Só é possível agrupar DMEs ainda não aprovadas"
                          : "Incluir no lote"
                      }
                    />
                  </TableCell>
                  <TableCell className="font-mono-kasa text-xs text-muted-foreground">{d.number_display}</TableCell>
                  <TableCell>
                    <div className="font-medium text-xs text-foreground flex items-center gap-2 flex-wrap">
                      {d.title}
                      {(() => {
                        const b = batchByDme[d.id];
                        if (!b || b.status === "cancelled") return null;
                        return (
                          <>
                            <span className="font-mono-kasa text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/80">
                              LOTE #{b.friendly_number || b.id.slice(0, 8)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAddItemFor({ ...d, _batch: b })}
                              className="h-5 px-1.5 gap-1 border-border/80 text-foreground hover:bg-muted text-[10px]"
                              title="Adicionar nova DME a este lote"
                            >
                              <PlusCircle className="size-3" /> Add ao lote
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                    {d.description && <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{d.description}</div>}
                  </TableCell>

                  <TableCell className="text-xs text-foreground font-medium">{d.clients?.company || d.clients?.name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.contracts?.title || "—"}</TableCell>
                  <TableCell className="text-right font-mono-kasa font-bold text-xs text-foreground tabular-nums">{brl(Number(d.value))}</TableCell>
                  <TableCell className="text-xs font-mono-kasa text-muted-foreground">{d.due_date ? new Date(d.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`text-[10px] font-mono-kasa px-2 py-0.5 rounded-md border font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                      {d.paid_at && (
                        <span className="text-[10px] font-mono-kasa text-emerald-600 dark:text-emerald-400">
                          Liquidado em {new Date(d.paid_at).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(() => {
                        const linkedJob = jobsByDme[d.id];
                        if (linkedJob) {
                          return (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-blue-500 size-7"
                              onClick={() => navigate({ to: "/jobs", search: { openJobId: linkedJob.id } })}
                              title={`Abrir Job: ${linkedJob.title}`}
                            >
                              <Briefcase className="size-3.5" />
                            </Button>
                          );
                        }
                        return (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setJobForDme(d)}
                            title="Criar Job a partir desta DME"
                          >
                            <Briefcase className="size-3.5" />
                          </Button>
                        );
                      })()}
                      {d.public_token && (
                        <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-foreground" onClick={() => copyLink(d.public_token)} title="Copiar link de aprovação">
                          <LinkIcon className="size-3.5" />
                        </Button>
                      )}
                      {(() => {
                        const batch = batchByDme[d.id];
                        if (!batch || batch.status === "cancelled") return null;
                        return (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAddItemFor({ ...d, _batch: batch })}
                            className="gap-1 border-border/80 h-7 text-[11px]"
                            title="Adicionar nova DME a este lote"
                          >
                            <PlusCircle className="size-3" /> Add ao lote
                          </Button>
                        );
                      })()}
                      {isPending && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => approveMut.mutate(d.id)} className="size-7 text-emerald-600" title="Aprovar internamente">
                            <Check className="size-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => rejectMut.mutate(d.id)} className="size-7 text-rose-500" title="Recusar">
                            <X className="size-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownloadSinglePdf(d.id)}
                        className="size-7 text-muted-foreground hover:text-foreground"
                        title="Baixar PDF individual"
                      >
                        <FileDown className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingDme(d)}
                        className="size-7 text-muted-foreground hover:text-foreground"
                        title="Editar demanda"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir esta DME?")) delMut.mutate(d.id); }} className="size-7 text-rose-500">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Cards no Mobile */}
      <div className="md:hidden space-y-2.5">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Carregando demandas...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-xl">
            Nenhuma DME individual encontrada.
          </div>
        ) : (
          filtered.map((d: any) => {
            const st = STATUS_LABEL[d.status] ?? { label: d.status, cls: "text-muted-foreground border-border bg-muted" };
            const isPending = d.status !== "approved" && d.status !== "rejected" && d.status !== "completed";
            const selectable = isSelectable(d);
            const checked = selectedIds.has(d.id);
            const linkedJob = jobsByDme[d.id];
            const batch = batchByDme[d.id];

            return (
              <div
                key={d.id}
                className={cn(
                  "p-3.5 rounded-xl border bg-card shadow-xs flex flex-col gap-2.5 transition-all",
                  checked ? "border-primary/40 bg-primary/5" : "border-border/80"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {selectable && (
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleOne(d)}
                        className="shrink-0"
                      />
                    )}
                    <span className="text-[10px] font-mono-kasa text-muted-foreground tabular-nums">
                      {d.number_display}
                    </span>
                    <span className={`text-[9px] font-mono-kasa px-1.5 py-0.5 rounded-md border font-semibold uppercase ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>

                  <span className="font-mono-kasa font-bold text-xs text-foreground tabular-nums">
                    {brl(Number(d.value))}
                  </span>
                </div>

                <div>
                  <h4 className="font-medium text-xs text-foreground">{d.title}</h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono-kasa mt-0.5">
                    <span className="truncate">{d.clients?.company || d.clients?.name || "Cliente"}</span>
                    {d.contracts?.title && (
                      <>
                        <span>·</span>
                        <span className="truncate">{d.contracts.title}</span>
                      </>
                    )}
                  </div>
                  {d.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{d.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] font-mono-kasa">
                  <span className="text-muted-foreground">
                    Venc: {d.due_date ? new Date(d.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </span>

                  <div className="flex items-center gap-1">
                    {d.public_token && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground"
                        onClick={() => copyLink(d.public_token)}
                        title="Copiar link"
                      >
                        <LinkIcon className="size-3.5" />
                      </Button>
                    )}
                    {linkedJob ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-blue-500 size-7"
                        onClick={() => navigate({ to: "/jobs", search: { openJobId: linkedJob.id } })}
                        title="Ver Job"
                      >
                        <Briefcase className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground"
                        onClick={() => setJobForDme(d)}
                        title="Criar Job"
                      >
                        <Briefcase className="size-3.5" />
                      </Button>
                    )}
                    {isPending && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => approveMut.mutate(d.id)}
                          className="size-7 text-emerald-600"
                          title="Aprovar"
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => rejectMut.mutate(d.id)}
                          className="size-7 text-rose-500"
                          title="Recusar"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDownloadSinglePdf(d.id)}
                      className="size-7 text-muted-foreground"
                      title="PDF"
                    >
                      <FileDown className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingDme(d)}
                      className="size-7 text-muted-foreground"
                      title="Editar"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { if (confirm("Excluir esta DME?")) delMut.mutate(d.id); }}
                      className="size-7 text-rose-500"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <NewDmeDialog open={openNew} onOpenChange={setOpenNew} defaultClientId={prefClientId} />

      <NewJobDialog
        stage={null}
        open={!!jobForDme}
        onOpenChange={(o) => { if (!o) setJobForDme(null); }}
        defaultClientId={jobForDme?.client_id}
        defaultDmeId={jobForDme?.id}
        defaultContractId={jobForDme?.contract_id ?? undefined}
        defaultTitle={jobForDme?.title ?? ""}
        defaultDescription={jobForDme?.description ?? ""}
        defaultDueDate={jobForDme?.due_date ?? ""}
        onCreated={(job) => {
          setJobForDme(null);
          navigate({ to: "/jobs", search: { openJobId: (job as any).id } });
        }}
      />

      <EditDmeDialog dme={editingDme} onOpenChange={(o) => { if (!o) setEditingDme(null); }} />

      <AddDmeToBatchDialog dme={addItemFor} onOpenChange={(o) => { if (!o) setAddItemFor(null); }} />

      <UnconsolidateDialog 
        batch={unconsolidatingBatch} 
        onOpenChange={(o) => { if (!o) setUnconsolidatingBatch(null); }}
        isPending={deleteBatchMut.isPending}
        onConfirm={(restore) => deleteBatchMut.mutate({ id: unconsolidatingBatch.id, restore })}
      />

      <ViewBatchDmesDialog
        batch={viewingBatch}
        onOpenChange={(o) => { if (!o) setViewingBatch(null); }}
      />
    </div>
  );
}

function AddDmeToBatchDialog({ dme, onOpenChange }: { dme: any | null; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");

  const batch = dme?._batch;
  const consolidatedTx = dme?._consolidatedTx;
  const totalValue = Number(batch?.total_value ?? consolidatedTx?.total_value ?? 0);

  const mut = useMutation({
    mutationFn: async () => {
      const v = Number((value || "").toString().replace(",", "."));
      if (batch?.id) {
        await addDmeToConsolidatedBatch({
          batch_id: batch.id,
          title,
          description: description || null,
          value: v,
          contract_id: dme?.contract_id ?? null,
        });
      } else if (consolidatedTx?.consolidated_transaction_id) {
        await addDmeToConsolidatedTransaction({
          consolidated_transaction_id: consolidatedTx.consolidated_transaction_id,
          client_id: consolidatedTx.client_id,
          title,
          description: description || null,
          value: v,
          contract_id: dme?.contract_id ?? null,
        });
      } else {
        throw new Error("Lote não encontrado.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["batches-by-dme"] });
      qc.invalidateQueries({ queryKey: ["dmes-consolidated-tx-groups"] });
      qc.invalidateQueries({ queryKey: ["dme-batches-active"] });
      toast.success("DME criada e somada à cobrança consolidada.");
      setTitle("");
      setDescription("");
      setValue("");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao adicionar DME ao lote"),
  });

  return (
    <Dialog open={!!dme} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="size-5 text-primary" /> Adicionar nova DME ao lote
          </DialogTitle>
          <DialogDescription>
            Lote do cliente <strong>{dme?.clients?.company || dme?.clients?.name || "—"}</strong>
            <br />
            <span className="text-xs">
              Total atual do lote: <strong>{brl(totalValue)}</strong>. A nova DME será criada já aprovada, vinculada ao mesmo lote e somada à cobrança consolidada no financeiro.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Título da nova DME *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Edição extra de vídeo institucional" />
          </div>
          <div>
            <Label className="text-xs">Descrição (escopo)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Detalhe o que será entregue..." />
          </div>
          <div>
            <Label className="text-xs">Valor (R$) *</Label>
            <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-2">
            {mut.isPending && <Loader2 className="size-4 animate-spin" />}
            Adicionar ao lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Dialog =============
type Draft = {
  client_id: string;
  contract_id: string;
  responsible_id: string;
  title: string;
  description: string;
  value: string;
  deadline_days: string;
  due_date: string;
};

const blankDraft = (clientId?: string): Draft => ({
  client_id: clientId ?? "",
  contract_id: "",
  responsible_id: "",
  title: "",
  description: "",
  value: "",
  deadline_days: "7",
  due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
});

function NewDmeDialog({ open, onOpenChange, defaultClientId }: { open: boolean; onOpenChange: (o: boolean) => void; defaultClientId?: string }) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Draft[]>([blankDraft(defaultClientId)]);

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  function patch(i: number, p: Partial<Draft>) {
    setDrafts((d) => d.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  }
  function addRow() { setDrafts((d) => [...d, blankDraft(defaultClientId)]); }
  function removeRow(i: number) { setDrafts((d) => d.length > 1 ? d.filter((_, idx) => idx !== i) : d); }

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = drafts.map((d) => {
        if (!d.client_id) throw new Error("Selecione um cliente em todas as linhas.");
        if (!d.title.trim()) throw new Error("Informe o título de todas as DMEs.");
        const value = Number((d.value || "").toString().replace(",", "."));
        if (!value || value <= 0) throw new Error("Toda DME precisa ter valor > 0.");
        if (!d.due_date) throw new Error("Informe a data de vencimento.");
        return {
          client_id: d.client_id,
          contract_id: d.contract_id || null,
          responsible_id: d.responsible_id || null,
          title: d.title.trim(),
          description: d.description.trim() || null,
          value,
          deadline_days: d.deadline_days ? Number(d.deadline_days) : null,
          due_date: d.due_date,
          status: "pending",
        };
      });
      return createExtraDemandsBatch(payload as any);
    },
    onSuccess: (rows) => {
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      toast.success(`${rows.length} DME${rows.length > 1 ? "s criadas" : " criada"}. Copie o link e envie ao cliente.`);
      setDrafts([blankDraft(defaultClientId)]);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[920px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /> Nova(s) Demanda(s) Extra(s)</DialogTitle>
          <DialogDescription>Adicione uma ou várias DMEs de uma vez. Cada uma terá seu próprio link de aprovação.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {drafts.map((d, i) => (
            <DmeDraftRow
              key={i}
              index={i}
              total={drafts.length}
              draft={d}
              clients={clients}
              profiles={profiles}
              onPatch={(p) => patch(i, p)}
              onRemove={() => removeRow(i)}
            />
          ))}
          <Button variant="outline" onClick={addRow} className="w-full gap-2 border-dashed">
            <Plus className="size-4" /> Adicionar outra demanda
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="gap-2">
            {saveMut.isPending && <Loader2 className="size-4 animate-spin" />}
            Criar {drafts.length > 1 ? `${drafts.length} demandas` : "demanda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DmeDraftRow({
  index, total, draft, clients, profiles, onPatch, onRemove,
}: {
  index: number; total: number; draft: Draft;
  clients: any[]; profiles: any[];
  onPatch: (p: Partial<Draft>) => void; onRemove: () => void;
}) {
  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", { clientId: draft.client_id }],
    queryFn: () => draft.client_id ? fetchContracts({ clientId: draft.client_id }) : Promise.resolve([]),
    enabled: !!draft.client_id,
  });

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Item {index + 1} de {total}</span>
        {total > 1 && (
          <Button size="icon" variant="ghost" onClick={onRemove} className="size-7 text-red-500">
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Cliente *</Label>
          <Select value={draft.client_id} onValueChange={(v) => onPatch({ client_id: v, contract_id: "" })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {clients.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Contrato (opcional)</Label>
          <Select value={draft.contract_id || "none"} onValueChange={(v) => onPatch({ contract_id: v === "none" ? "" : v })} disabled={!draft.client_id}>
            <SelectTrigger><SelectValue placeholder={draft.client_id ? "Sem contrato" : "Escolha o cliente"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Avulsa (sem contrato)</SelectItem>
              {contracts.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Título *</Label>
        <Input value={draft.title} onChange={(e) => onPatch({ title: e.target.value })} placeholder="Ex: Campanha de Black Friday — 5 artes" />
      </div>

      <div>
        <Label className="text-xs">Descrição (escopo)</Label>
        <Textarea value={draft.description} onChange={(e) => onPatch({ description: e.target.value })} rows={2} placeholder="Detalhe o que será entregue..." />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Valor *</Label>
          <Input type="number" step="0.01" value={draft.value} onChange={(e) => onPatch({ value: e.target.value })} placeholder="0,00" />
        </div>
        <div>
          <Label className="text-xs">Prazo (dias)</Label>
          <Input type="number" value={draft.deadline_days} onChange={(e) => onPatch({ deadline_days: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Vencimento da cobrança *</Label>
          <Input type="date" value={draft.due_date} onChange={(e) => onPatch({ due_date: e.target.value })} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Responsável interno</Label>
        <Select value={draft.responsible_id || "none"} onValueChange={(v) => onPatch({ responsible_id: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Quem cuida desta DME?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem responsável</SelectItem>
            {profiles.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.display_name || p.full_name || "Sem nome"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============= Edição de DME (inclusive aprovada) =============
function EditDmeDialog({ dme, onOpenChange }: { dme: any | null; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Draft>(blankDraft());

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", { clientId: form.client_id }],
    queryFn: () => (form.client_id ? fetchContracts({ clientId: form.client_id }) : Promise.resolve([])),
    enabled: !!form.client_id,
  });

  // Lançamento financeiro vinculado (por ID) — usado apenas para bloquear
  // alterações quando já estiver pago.
  const { data: linkedTx } = useQuery<any | null>({
    queryKey: ["dme-linked-tx", dme?.id],
    enabled: !!dme?.id,
    queryFn: async () => {
      const txId = dme.consolidated_transaction_id || dme.transaction_id;
      if (txId) {
        const { data } = await supabase.from("transactions").select("id, status, amount, due_date").eq("id", txId).maybeSingle();
        return data ?? null;
      }
      const { data } = await supabase
        .from("transactions")
        .select("id, status, amount, due_date")
        .eq("extra_demand_id", dme.id)
        .neq("status", "cancelled")
        .maybeSingle();
      return data ?? null;
    },
  });

  const dmeKey = dme?.id ?? "";
  const [loadedKey, setLoadedKey] = useState("");
  if (dme && dmeKey !== loadedKey) {
    setLoadedKey(dmeKey);
    setForm({
      client_id: dme.client_id ?? "",
      contract_id: dme.contract_id ?? "",
      responsible_id: dme.responsible_id ?? "",
      title: dme.title ?? "",
      description: dme.description ?? "",
      value: dme.value != null ? String(dme.value) : "",
      deadline_days: dme.deadline_days != null ? String(dme.deadline_days) : "",
      due_date: dme.due_date ?? "",
    });
  }

  const financePaid = linkedTx?.status === "paid";
  const isApproved = dme?.status === "approved";

  const mut = useMutation({
    mutationFn: async () => {
      if (!dme) throw new Error("Demanda não encontrada.");
      if (!form.title.trim()) throw new Error("Informe o título da demanda.");
      const value = Number((form.value || "").toString().replace(",", "."));
      if (!value || value <= 0) throw new Error("A demanda precisa ter valor maior que zero.");
      if (!form.due_date) throw new Error("Informe a data de vencimento.");
      return updateExtraDemandWithFinance(dme.id, {
        title: form.title,
        description: form.description,
        client_id: form.client_id,
        contract_id: form.contract_id || null,
        responsible_id: form.responsible_id || null,
        deadline_days: form.deadline_days ? Number(form.deadline_days) : null,
        // Campos financeiros não são enviados quando o lançamento está pago.
        ...(financePaid ? {} : { value, due_date: form.due_date }),
      });
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dmes-consolidated-tx-groups"] });
      qc.invalidateQueries({ queryKey: ["dme-batches-active"] });
      qc.invalidateQueries({ queryKey: ["batches-by-dme"] });
      toast.success("Demanda atualizada com sucesso.");
      if (res?.financeSynced) toast.info("Lançamento financeiro vinculado atualizado.");
      if (res?.financeWarning) toast.warning(res.financeWarning);
      setLoadedKey("");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar demanda"),
  });

  return (
    <Dialog open={!!dme} onOpenChange={(o) => { if (!o) { setLoadedKey(""); onOpenChange(false); } }}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-primary" /> Editar {dme?.number_display ?? "DME"}
          </DialogTitle>
          <DialogDescription>
            Atualize os dados desta demanda. O número e o status
            {isApproved ? " (Aprovada)" : ""} permanecem inalterados.
          </DialogDescription>
        </DialogHeader>

        {financePaid && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>
              Esta demanda possui um lançamento financeiro já pago. Não é possível alterar o valor automaticamente.
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v, contract_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Contrato (opcional)</Label>
              <Select
                value={form.contract_id || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, contract_id: v === "none" ? "" : v }))}
                disabled={!form.client_id}
              >
                <SelectTrigger><SelectValue placeholder="Sem contrato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Avulsa (sem contrato)</SelectItem>
                  {contracts.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Título *</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>

          <div>
            <Label className="text-xs">Descrição (escopo)</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Valor *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.value}
                disabled={financePaid}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Prazo (dias)</Label>
              <Input type="number" value={form.deadline_days} onChange={(e) => setForm((f) => ({ ...f, deadline_days: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Vencimento da cobrança *</Label>
              <Input
                type="date"
                value={form.due_date}
                disabled={financePaid}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Responsável interno</Label>
            <Select value={form.responsible_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, responsible_id: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Quem cuida desta DME?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {profiles.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.display_name || p.full_name || "Sem nome"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setLoadedKey(""); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-2">
            {mut.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnconsolidateDialog({ batch, onOpenChange, onConfirm, isPending }: { 
  batch: any; 
  onOpenChange: (open: boolean) => void; 
  onConfirm: (restore: boolean) => void;
  isPending: boolean;
}) {
  if (!batch) return null;

  return (
    <Dialog open={!!batch} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            Desfazer lote?
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p>
              Este lote (Lote {batch.friendly_number || batch.id.slice(0, 8)}) possui DMEs com lançamentos financeiros individuais que foram cancelados durante a consolidação.
            </p>
            <p className="font-medium text-foreground">
              Como deseja tratar esses lançamentos?
            </p>
            <div className="text-xs bg-muted p-3 rounded-lg border space-y-2">
              <p>
                <strong>Restaurar:</strong> Reativa as transações individuais originais para "Pendente". Apenas as que foram efetivamente canceladas no momento da consolidação serão afetadas.
              </p>
              <p>
                <strong>Manter:</strong> As transações individuais continuarão canceladas. As DMEs serão desvinculadas mas sem lançamento financeiro ativo.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isPending}
            className="sm:order-1"
          >
            Cancelar
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => onConfirm(false)} 
            disabled={isPending}
            className="sm:order-2"
          >
            Manter lançamentos cancelados
          </Button>
          <Button 
            variant="default" 
            onClick={() => onConfirm(true)} 
            disabled={isPending}
            className="gap-2 sm:order-3 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Restaurar lançamentos individuais
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewBatchDmesDialog({ batch, onOpenChange }: { 
  batch: any; 
  onOpenChange: (open: boolean) => void; 
}) {
  const { data: dmes = [], isLoading } = useQuery({
    queryKey: ["batch-dmes", batch?.id],
    enabled: !!batch?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dme_batch_items" as any)
        .select("extra_demands(*, clients(name, company))")
        .eq("batch_id", batch.id);
      if (error) throw error;
      return (data || []).map((i: any) => i.extra_demands).filter(Boolean);
    },
  });

  if (!batch) return null;

  const totalValue = dmes.reduce((acc, d) => acc + Number(d.value || 0), 0);
  const formattedBatch = String(batch.friendly_number || "").padStart(4, '0');

  return (
    <Dialog open={!!batch} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            Visualizar DMEs — Lote {formattedBatch}
          </DialogTitle>
          <DialogDescription>
            {batch.clients?.company || batch.clients?.name || "Cliente"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRowsSkeleton rows={3} columns={4} />
                ) : dmes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma DME vinculada a este lote.
                    </TableCell>
                  </TableRow>
                ) : (
                  dmes.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.number_display}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="font-medium truncate" title={d.title}>{d.title}</div>
                        {d.description && <div className="text-[10px] text-muted-foreground truncate">{d.description}</div>}
                      </TableCell>
                      <TableCell className="text-right font-mono">{brl(Number(d.value))}</TableCell>
                      <TableCell className="text-sm">
                        {d.due_date ? new Date(d.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between px-2">
            <div className="text-xs text-muted-foreground">
              Total: <strong>{dmes.length} DME{dmes.length !== 1 ? 's' : ''}</strong>
            </div>
            <div className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="text-xs font-normal text-muted-foreground">Soma do Lote:</span>
              {brl(totalValue)}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
