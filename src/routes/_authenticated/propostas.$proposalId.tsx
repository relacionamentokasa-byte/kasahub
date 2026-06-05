import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteProposalItem,
  fetchProposal,
  fetchProposalItems,
  formatCurrency,
  recalcProposalTotals,
  updateProposal,
  upsertProposalItem,
  type ProposalItem,
} from "@/lib/crm-api";
import { fetchClients } from "@/lib/ops-api";
import { fetchBankAccounts, fetchCategories } from "@/lib/finance-api";
import { supabase } from "@/integrations/supabase/client";
import { approveProposal, revertProposalApproval } from "@/lib/proposal-approval";
import { recordProposalEvent } from "@/lib/proposal-events";
import { ProposalTimeline } from "@/components/proposals/ProposalTimeline";
import { ServicesMultiSelect } from "@/components/proposals/ServicesMultiSelect";
import { JOB_TEMPLATE_OPTIONS } from "@/lib/job-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Copy,
  Plus,
  Save,
  Send,
  Trash2,
  CheckCircle2,
  Rocket,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/propostas/$proposalId")({
  head: () => ({ meta: [{ title: "Editor de proposta — KASA OS" }] }),
  component: ProposalEditorPage,
});

function ProposalEditorPage() {
  const { proposalId } = Route.useParams();
  const navigate = useNavigate();
  return (
    <ProposalEditorContent
      proposalId={proposalId}
      onBack={() => navigate({ to: "/propostas" })}
    />
  );
}

export function ProposalEditorContent({
  proposalId,
  onBack,
  embedded = false,
}: {
  proposalId: string;
  onBack?: () => void;
  embedded?: boolean;
}) {
  const qc = useQueryClient();

  const { data: proposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId),
  });
  const { data: items = [] } = useQuery({
    queryKey: ["proposal", proposalId, "items"],
    queryFn: () => fetchProposalItems(proposalId),
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: accounts = [] } = useQuery({ queryKey: ["bank_accounts"], queryFn: fetchBankAccounts });
  const { data: categories = [] } = useQuery({ queryKey: ["financial_categories"], queryFn: fetchCategories });
  const { data: team = [] } = useQuery({
    queryKey: ["team-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, full_name");
      return (data ?? []) as Array<{ id: string; display_name: string | null; full_name: string | null }>;
    },
  });

  const [form, setForm] = useState({
    title: "",
    client_id: "",
    client_name: "",
    client_email: "",
    intro: "",
    valid_until: "",
    status: "draft",
    responsible_id: "",
    commercial_id: "",
    operational_id: "",
    contract_type: "recurring",
    service_type: "",
    service_ids: [] as string[],
    briefing: "",
    payment_kind: "recurring" as "recurring" | "one_time" | "mixed",
    installments: 1,
    first_due_date: "",
    billing_day: 5,
    account_id: "",
    category_id: "",
    auto_create_jobs: true,
    recurring_months: 12,
  });

  useEffect(() => {
    if (proposal) {
      const p = proposal as typeof proposal & Record<string, unknown>;
      setForm({
        title: proposal.title,
        client_id: (p.client_id as string) ?? "",
        client_name: proposal.client_name,
        client_email: proposal.client_email ?? "",
        intro: proposal.intro ?? "",
        valid_until: proposal.valid_until ?? "",
        status: proposal.status,
        responsible_id: (p.responsible_id as string) ?? "",
        commercial_id: (p.commercial_id as string) ?? "",
        operational_id: (p.operational_id as string) ?? (p.responsible_id as string) ?? "",
        contract_type: (p.contract_type as string) ?? "recurring",
        service_type: (p.service_type as string) ?? "",
        service_ids: (p.service_ids as string[]) ?? [],
        briefing: (p.briefing as string) ?? "",
        payment_kind: ((p.payment_kind as string) ?? "recurring") as "recurring" | "one_time" | "mixed",
        installments: Number(p.installments ?? 1),
        first_due_date: (p.first_due_date as string) ?? "",
        billing_day: Number(p.billing_day ?? 5),
        account_id: (p.account_id as string) ?? "",
        category_id: (p.category_id as string) ?? "",
        auto_create_jobs: (p.auto_create_jobs as boolean) ?? true,
        recurring_months: Number(p.recurring_months ?? 12),
      });
    }
  }, [proposal]);

  const totals = useMemo(() => recalcProposalTotals(items), [items]);

  const saveMut = useMutation({
    mutationFn: (overrides?: Partial<typeof form>) => {
      const f = { ...form, ...(overrides ?? {}) };
      return updateProposal(proposalId, {
        title: f.title,
        client_id: f.client_id || null,
        client_name: f.client_name,
        client_email: f.client_email || null,
        intro: f.intro || null,
        valid_until: f.valid_until || null,
        status: f.status,
        monthly_investment: totals.monthly_investment,
        one_time_investment: totals.one_time_investment,
        total: totals.total,
        responsible_id: f.operational_id || f.responsible_id || null,
        commercial_id: f.commercial_id || null,
        operational_id: f.operational_id || null,
        contract_type: f.contract_type,
        service_type: f.service_type || null,
        service_ids: f.service_ids,
        briefing: f.briefing || null,
        payment_kind: f.payment_kind,
        installments: f.installments,
        first_due_date: f.first_due_date || null,
        billing_day: f.billing_day,
        account_id: f.account_id || null,
        category_id: f.category_id || null,
        auto_create_jobs: f.auto_create_jobs,
        recurring_months: f.recurring_months,
      } as Parameters<typeof updateProposal>[1]);
    },
    onSuccess: (_d, vars) => {
      if (vars?.status) setForm((p) => ({ ...p, status: vars.status! }));

      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["proposal", proposalId, "events"] });
      recordProposalEvent(proposalId, vars?.status === "sent" ? "sent" : "edited").catch(() => {});
      toast.success("Proposta salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      // ensure latest edits are persisted first
      await saveMut.mutateAsync(undefined);
      return approveProposal(supabase, proposalId);
    },
    onSuccess: (r) => {
      toast.success(
        `Proposta aprovada — ${r.jobs_created} jobs e ${r.transactions_created} lançamentos criados.`,
      );
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (reopen: boolean) => revertProposalApproval(supabase, proposalId, { reopen }),
    onSuccess: (_d, reopen) => {
      toast.success(reopen ? "Proposta reaberta" : "Proposta cancelada");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  async function persistTotalsFor(nextItems: ProposalItem[]) {
    const t = recalcProposalTotals(nextItems);
    await updateProposal(proposalId, {
      monthly_investment: t.monthly_investment,
      one_time_investment: t.one_time_investment,
      total: t.total,
    });
    qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
    qc.invalidateQueries({ queryKey: ["proposals"] });
  }

  const itemMut = useMutation({
    mutationFn: (item: Partial<ProposalItem> & { proposal_id: string; title: string }) =>
      upsertProposalItem(item),
    onSuccess: async (saved) => {
      const next = items.some((i) => i.id === saved.id)
        ? items.map((i) => (i.id === saved.id ? saved : i))
        : [...items, saved];
      qc.setQueryData(["proposal", proposalId, "items"], next);
      await persistTotalsFor(next);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delItemMut = useMutation({
    mutationFn: (id: string) => deleteProposalItem(id),
    onSuccess: async (_d, id) => {
      const next = items.filter((i) => i.id !== id);
      qc.setQueryData(["proposal", proposalId, "items"], next);
      await persistTotalsFor(next);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addItem(recurrence: "monthly" | "one_time") {
    itemMut.mutate({
      proposal_id: proposalId,
      title: recurrence === "monthly" ? "Serviço recorrente" : "Serviço pontual",
      quantity: 1,
      unit_price: 0,
      recurrence,
      order_index: items.length,
    });
  }

  function copyShareLink() {
    if (!proposal) return;
    const url = `${window.location.origin}/p/${proposal.public_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  if (!proposal) {
    return <div className="p-10 text-foreground/60">Carregando…</div>;
  }

  const containerCls = embedded
    ? "w-full"
    : "p-6 lg:p-10 max-w-6xl mx-auto w-full";

  return (
    <div className={containerCls}>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        {onBack ? (
          <button
            onClick={onBack}
            className="text-sm text-foreground/60 hover:text-primary flex items-center gap-2"
          >
            <ArrowLeft className="size-4" /> Voltar
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={copyShareLink} className="gap-2">
            <Copy className="size-4" /> Copiar link
          </Button>
          <Button
            variant="outline"
            onClick={() => saveMut.mutate({ status: "sent" })}
            className="gap-2"
          >
            <Send className="size-4" /> Marcar como enviada
          </Button>
          <Button
            onClick={() => {
              (document.activeElement as HTMLElement | null)?.blur();
              setTimeout(() => saveMut.mutate(undefined), 50);
            }}
            disabled={saveMut.isPending}
            variant="outline"
            className="gap-2"
          >
            <Save className="size-4" /> Salvar
          </Button>
          {proposal.status !== "accepted" ? (
            <Button
              onClick={() => approveMut.mutate()}
              disabled={approveMut.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2"
            >
              <Rocket className="size-4" /> Aprovar e gerar operação
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => cancelMut.mutate(true)}
                disabled={cancelMut.isPending}
                className="gap-2"
              >
                <RotateCcw className="size-4" /> Reabrir
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm("Cancelar a aprovação? Lançamentos pendentes, contrato e projeto vinculados serão revertidos.")) {
                    cancelMut.mutate(false);
                  }
                }}
                disabled={cancelMut.isPending}
                className="gap-2 text-destructive"
              >
                <XCircle className="size-4" /> Cancelar aprovação
              </Button>
            </>
          )}
        </div>
      </div>

      <div className={embedded ? "space-y-4" : "grid lg:grid-cols-3 gap-6"}>
        <div className={embedded ? "space-y-4" : "lg:col-span-2 space-y-4"}>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <span className="text-primary text-[10px] capitalize">
              Cabeçalho
            </span>
            <div className="grid gap-4 mt-3">
              <F label="Título">
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="text-lg font-display font-semibold h-12"
                />
              </F>
              <F label="Cliente vinculado">
                <Select
                  value={form.client_id || "__free__"}
                  onValueChange={(v) => {
                    if (v === "__free__") {
                      setForm({ ...form, client_id: "" });
                      return;
                    }
                    const c = clients.find((x) => x.id === v);
                    setForm({
                      ...form,
                      client_id: v,
                      client_name: c ? (c.company || c.name) : form.client_name,
                      client_email: c?.email ?? form.client_email,
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__free__">Cliente avulso (digitar nome)</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Nome para exibir">
                  <Input
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  />
                </F>
                <F label="E-mail">
                  <Input
                    value={form.client_email}
                    onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                  />
                </F>
              </div>

              <F label="Introdução">
                <Textarea
                  rows={4}
                  value={form.intro}
                  onChange={(e) => setForm({ ...form, intro: e.target.value })}
                />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Válida até">
                  <Input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  />
                </F>
                <F label="Status">
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="sent">Enviada</SelectItem>
                      <SelectItem value="viewed">Visualizada</SelectItem>
                      <SelectItem value="accepted">Aceita</SelectItem>
                      <SelectItem value="rejected">Recusada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <span className="text-primary text-[10px] capitalize">Configuração operacional</span>
            <p className="text-xs text-foreground/50 mt-1">
              Define o que será criado automaticamente quando a proposta for aprovada: projeto, jobs e lançamentos financeiros.
            </p>
            <div className="grid gap-4 mt-4 md:grid-cols-2">
              <F label="Responsável comercial">
                <Select
                  value={form.commercial_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, commercial_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {team.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.display_name || t.full_name || "—"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Responsável operacional">
                <Select
                  value={form.operational_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, operational_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {team.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.display_name || t.full_name || "—"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Serviços contratados">
                <ServicesMultiSelect
                  value={form.service_ids}
                  onChange={(ids) => setForm({ ...form, service_ids: ids })}
                />
              </F>
              <F label="Tipo de contrato">
                <Select
                  value={form.contract_type}
                  onValueChange={(v) => setForm({ ...form, contract_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Mensal / Recorrente</SelectItem>
                    <SelectItem value="one_time">Job Avulso</SelectItem>
                    <SelectItem value="project">Projeto Fechado</SelectItem>
                    <SelectItem value="consulting">Consultoria</SelectItem>
                    <SelectItem value="implementation">Implantação</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="Modelo de cobrança">
                <Select
                  value={form.payment_kind}
                  onValueChange={(v) => setForm({ ...form, payment_kind: v as typeof form.payment_kind })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Recorrente (mensal)</SelectItem>
                    <SelectItem value="one_time">Avulso (parcelado)</SelectItem>
                    <SelectItem value="mixed">Misto (mensal + avulso)</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="Conta bancária padrão">
                <Select
                  value={form.account_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, account_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem conta</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Categoria financeira">
                <Select
                  value={form.category_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, category_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {categories.filter((c) => c.kind === "income").map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="1º vencimento">
                <Input
                  type="date"
                  value={form.first_due_date}
                  onChange={(e) => setForm({ ...form, first_due_date: e.target.value })}
                />
              </F>
              <F label="Dia de cobrança (mensal)">
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={String(form.billing_day)}
                  onChange={(e) => setForm({ ...form, billing_day: Number(e.target.value) || 5 })}
                />
              </F>
              {(form.payment_kind === "one_time" || form.payment_kind === "mixed") && (
                <F label="Parcelas (valor avulso)">
                  <Input
                    type="number"
                    min={1}
                    max={36}
                    value={String(form.installments)}
                    onChange={(e) => setForm({ ...form, installments: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </F>
              )}
              {(form.payment_kind === "recurring" || form.payment_kind === "mixed") && (
                <F label="Meses de recorrência a gerar">
                  <Input
                    type="number"
                    min={1}
                    max={48}
                    value={String(form.recurring_months)}
                    onChange={(e) => setForm({ ...form, recurring_months: Math.max(1, Number(e.target.value) || 12) })}
                  />
                </F>
              )}
              <F label="Briefing do projeto">
                <Textarea
                  rows={3}
                  value={form.briefing}
                  onChange={(e) => setForm({ ...form, briefing: e.target.value })}
                  placeholder="Será copiado para o projeto criado."
                />
              </F>
              <div className="flex items-center gap-3 md:col-span-2">
                <Switch
                  id="auto_jobs"
                  checked={form.auto_create_jobs}
                  onCheckedChange={(v) => setForm({ ...form, auto_create_jobs: v })}
                />
                <Label htmlFor="auto_jobs" className="text-xs text-foreground/70">
                  Gerar jobs automaticamente a partir dos templates de cada item
                </Label>
              </div>
            </div>
          </div>


          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-primary text-[10px] capitalize">
                Itens · Escopo
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addItem("monthly")} className="gap-1">
                  <Plus className="size-3.5" /> Recorrente
                </Button>
                <Button size="sm" variant="outline" onClick={() => addItem("one_time")} className="gap-1">
                  <Plus className="size-3.5" /> Pontual
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((it) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  onChange={(patch) =>
                    itemMut.mutate({ ...it, ...patch, proposal_id: proposalId })
                  }
                  onDelete={() => delItemMut.mutate(it.id)}
                />
              ))}
              {items.length === 0 && (
                <p className="text-xs text-foreground/40 text-center py-6">
                  Adicione itens recorrentes (mensais) ou pontuais para compor o investimento.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 ${embedded ? "" : "sticky top-6"}`}>
            <span className="text-primary text-[10px] capitalize">
              Investimento Mensal
            </span>
            <div className="font-display text-4xl font-bold mt-2 text-primary">
              {formatCurrency(totals.monthly_investment)}
            </div>
            <div className="border-t border-border mt-4 pt-4 space-y-1.5 text-sm">
              <Row label="Pontual" value={formatCurrency(totals.one_time_investment)} />
              <Row label="Total" value={formatCurrency(totals.total)} bold />
            </div>
          </div>

          {proposal.status === "accepted" && (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5 text-sm">
              <CheckCircle2 className="size-5 text-green-400 mb-2" />
              <p className="font-semibold text-green-300">Proposta aceita</p>
              {proposal.accepted_name && (
                <p className="text-foreground/60 text-xs mt-1">
                  Por {proposal.accepted_name} em{" "}
                  {proposal.accepted_at &&
                    new Date(proposal.accepted_at).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          )}

          <ProposalTimeline proposalId={proposalId} />

          <div className="rounded-2xl border border-border bg-surface p-5 text-xs text-foreground/60">
            <p className="capitalize text-[10px] text-foreground/40 mb-2">
              Link público
            </p>
            <Link
              to="/propostas"
              className="text-[11px] break-all text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                copyShareLink();
              }}
            >
              /p/{proposal.public_token}
            </Link>
            <p className="mt-2">Aceite digital via link público entra na próxima fase.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onChange,
  onDelete,
}: {
  item: ProposalItem;
  onChange: (patch: Partial<ProposalItem>) => void;
  onDelete: () => void;
}) {
  const [local, setLocal] = useState(item);
  useEffect(() => setLocal(item), [item.id, item.title, item.quantity, item.unit_price, item.recurrence]);

  function commit(patch: Partial<ProposalItem>) {
    const merged = { ...local, ...patch };
    setLocal(merged);
    onChange(patch);
  }

  return (
    <div className="space-y-2 bg-background/40 border border-border rounded-lg p-2">
      <div className="grid grid-cols-12 gap-2 items-center">
        <Input
          value={local.title}
          onChange={(e) => setLocal({ ...local, title: e.target.value })}
          onBlur={() => commit({ title: local.title })}
          className="col-span-5 h-9 bg-transparent border-transparent hover:border-border focus:border-primary"
          placeholder="Item"
        />
        <Input
          type="number"
          value={String(local.quantity)}
          onChange={(e) => setLocal({ ...local, quantity: Number(e.target.value) })}
          onBlur={() => commit({ quantity: local.quantity })}
          className="col-span-1 h-9 text-right"
        />
        <Input
          type="number"
          value={String(local.unit_price)}
          onChange={(e) => setLocal({ ...local, unit_price: Number(e.target.value) })}
          onBlur={() => commit({ unit_price: local.unit_price })}
          className="col-span-3 h-9 text-right"
          placeholder="0,00"
        />
        <Select
          value={local.recurrence}
          onValueChange={(v) => commit({ recurrence: v })}
        >
          <SelectTrigger className="col-span-2 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Mensal</SelectItem>
            <SelectItem value="one_time">Pontual</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={onDelete}
          className="col-span-1 grid place-items-center text-foreground/40 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-12 gap-2 items-center">
        <Label className="col-span-3 text-[10px] capitalize text-foreground/40 pl-1">
          Template de jobs
        </Label>
        <Select
          value={(local.job_template as string | null) ?? "none"}
          onValueChange={(v) => commit({ job_template: v === "none" ? null : v } as Partial<ProposalItem>)}
        >
          <SelectTrigger className="col-span-9 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOB_TEMPLATE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[10px] capitalize text-foreground/40 pl-1">
          Entregáveis (um por linha)
        </Label>
        <Textarea
          rows={3}
          value={(Array.isArray(local.deliverables) ? (local.deliverables as string[]) : []).join("\n")}
          onChange={(e) => setLocal({ ...local, deliverables: e.target.value.split("\n") as unknown as ProposalItem["deliverables"] })}
          onBlur={() =>
            commit({
              deliverables: (Array.isArray(local.deliverables)
                ? (local.deliverables as string[])
                : []
              )
                .map((s) => s.trim())
                .filter(Boolean) as unknown as ProposalItem["deliverables"],
            })
          }
          className="mt-1 text-xs"
          placeholder="Ex: 12 posts/mês&#10;Relatório mensal&#10;Reunião estratégica"
        />
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] capitalize text-foreground/50">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-foreground/60">{label}</span>
      <span className={`font-mono ${bold ? "font-bold text-foreground" : "text-foreground/80"}`}>
        {value}
      </span>
    </div>
  );
}
