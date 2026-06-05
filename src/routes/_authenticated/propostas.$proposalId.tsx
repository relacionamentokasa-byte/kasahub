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
  fetchLeads,
} from "@/lib/crm-api";
import { fetchClients } from "@/lib/ops-api";
import { fetchBankAccounts, fetchCategories } from "@/lib/finance-api";
import { fetchServices, fetchServiceTemplate, type Service } from "@/lib/services-api";
import { fetchContractTemplates, replaceContractVariables } from "@/lib/contracts-api";
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
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const { data: services = [] } = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => fetchServices({ onlyActive: true }),
  });
  const { data: contractTemplates = [] } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: fetchContractTemplates,
  });

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    client_id: "",
    lead_id: "",
    target_kind: "client" as "client" | "lead",
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
    scope: [] as string[],
    payment_method: "boleto",
    monthly_investment: 0,
    one_time_investment: 0,
    contract_template_id: "",
    contract_content: "",
    signature_client: "",
    signature_agency: "",
    notes: "",
  });

  useEffect(() => {
    if (proposal && !isEditing) {
      const p = proposal as any;
      setForm({
        title: proposal.title,
        client_id: p.client_id ?? "",
        lead_id: p.lead_id ?? "",
        target_kind: p.target_kind ?? (p.lead_id ? "lead" : "client"),
        client_name: proposal.client_name,
        client_email: proposal.client_email ?? "",
        intro: proposal.intro ?? "",
        valid_until: proposal.valid_until ?? "",
        status: proposal.status,
        responsible_id: p.responsible_id ?? "",
        commercial_id: p.commercial_id ?? "",
        operational_id: p.operational_id ?? p.responsible_id ?? "",
        contract_type: p.contract_type ?? "recurring",
        service_type: p.service_type ?? "",
        service_ids: p.service_ids ?? [],
        briefing: p.briefing ?? "",
        payment_kind: (p.payment_kind ?? "recurring") as any,
        installments: Number(p.installments ?? 1),
        first_due_date: p.first_due_date ?? "",
        billing_day: Number(p.billing_day ?? 5),
        account_id: p.account_id ?? "",
        category_id: p.category_id ?? "",
        auto_create_jobs: p.auto_create_jobs ?? true,
        recurring_months: Number(p.recurring_months ?? 12),
        scope: p.scope ?? [],
        payment_method: p.payment_method ?? "boleto",
        monthly_investment: Number(proposal.monthly_investment || 0),
        one_time_investment: Number(proposal.one_time_investment || 0),
        contract_template_id: p.contract_template_id ?? "",
        contract_content: p.contract_content ?? "",
        signature_client: p.signature_client ?? "",
        signature_agency: p.signature_agency ?? "",
        notes: p.notes ?? "",
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
        lead_id: f.lead_id || null,
        target_kind: f.target_kind,
        client_name: f.client_name,
        client_email: f.client_email || null,
        intro: f.intro || null,
        valid_until: f.valid_until || null,
        status: f.status,
        monthly_investment: f.monthly_investment,
        one_time_investment: f.one_time_investment,
        total: f.monthly_investment + f.one_time_investment,
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
        scope: f.scope,
        payment_method: f.payment_method,
        contract_template_id: f.contract_template_id || null,
        contract_content: f.contract_content || null,
        signature_client: f.signature_client || null,
        signature_agency: f.signature_agency || null,
        notes: f.notes || null,
      } as any);
    },
    onSuccess: (_d, vars) => {
      if (vars?.status) setForm((p) => ({ ...p, status: vars.status! }));
      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      recordProposalEvent(proposalId, vars?.status === "sent" ? "sent" : "edited").catch(() => {});
      toast.success("Proposta salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      await saveMut.mutateAsync(undefined);
      return approveProposal(supabase, proposalId);
    },
    onSuccess: (r) => {
      toast.success(`Proposta aprovada e convertida em contrato!`);
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
  });

  const delItemMut = useMutation({
    mutationFn: (id: string) => deleteProposalItem(id),
    onSuccess: async (_d, id) => {
      const next = items.filter((i) => i.id !== id);
      qc.setQueryData(["proposal", proposalId, "items"], next);
      await persistTotalsFor(next);
    },
  });

  function copyShareLink() {
    if (!proposal) return;
    const url = `${window.location.origin}/p/${proposal.public_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  if (!proposal) return <div className="p-10 text-foreground/60">Carregando…</div>;

  const containerCls = embedded ? "w-full" : "p-6 lg:p-10 max-w-6xl mx-auto w-full";

  return (
    <div className={containerCls}>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        {onBack ? (
          <button onClick={onBack} className="text-sm text-foreground/60 hover:text-primary flex items-center gap-2">
            <ArrowLeft className="size-4" /> Voltar
          </button>
        ) : <span />}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={copyShareLink} className="gap-2"><Copy className="size-4" /> Copiar link</Button>
          <Button variant="outline" onClick={() => saveMut.mutate({ status: "sent" })} className="gap-2"><Send className="size-4" /> Marcar como enviada</Button>
          <Button onClick={() => saveMut.mutate(undefined)} disabled={saveMut.isPending} variant="outline" className="gap-2"><Save className="size-4" /> Salvar</Button>
          {proposal.status !== "accepted" ? (
            <Button 
              onClick={() => {
                if (confirm("Esta ação irá:\n\n✓ Converter a proposta em Contrato Ativo\n✓ Vincular ao Cliente\n✓ Vincular os Serviços Contratados\n✓ Criar Projetos\n✓ Criar Jobs dos Templates\n✓ Criar lançamentos financeiros\n✓ Atualizar Cliente 360\n\nDeseja continuar?")) {
                  approveMut.mutate();
                }
              }} 
              disabled={approveMut.isPending} 
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2"
            >
              <CheckCircle2 className="size-4" /> Aprovar e Converter em Contrato
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => cancelMut.mutate(true)} className="gap-2"><RotateCcw className="size-4" /> Reabrir</Button>
              <Button variant="outline" onClick={() => confirm("Cancelar contrato e operação?") && cancelMut.mutate(false)} className="gap-2 text-destructive"><XCircle className="size-4" /> Cancelar contrato</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <span className="text-primary text-[10px] capitalize">Cabeçalho</span>
            <div className="grid gap-4 mt-3">
              <F label="Título"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></F>
              <div className="grid md:grid-cols-2 gap-4">
                <F label="Tipo de Destinatário">
                  <Select value={form.target_kind} onValueChange={(v: any) => setForm({ ...form, target_kind: v, client_id: "", lead_id: "" })}>
                    <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client" className="cursor-pointer">Cliente</SelectItem>
                      <SelectItem value="lead" className="cursor-pointer">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                <F label={form.target_kind === "client" ? "Cliente vinculado" : "Lead vinculado"}>
                  {form.target_kind === "client" ? (
                    <Select value={form.client_id || "__free__"} onValueChange={(v) => {
                      if (v === "__free__") { setForm({ ...form, client_id: "" }); return; }
                      const c = clients.find(x => x.id === v);
                      setForm({ ...form, client_id: v, client_name: c?.company || c?.name || "", client_email: c?.email || "" });
                    }}>
                      <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__free__" className="cursor-pointer">Cliente avulso</SelectItem>
                        {clients.map(c => <SelectItem key={c.id} value={c.id} className="cursor-pointer">{c.company || c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={form.lead_id || "__free__"} onValueChange={(v) => {
                      if (v === "__free__") { setForm({ ...form, lead_id: "" }); return; }
                      const l = leads.find(x => x.id === v);
                      setForm({ ...form, lead_id: v, client_name: l?.company || l?.name || "", client_email: l?.email || "" });
                    }}>
                      <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__free__" className="cursor-pointer">Lead avulso</SelectItem>
                        {leads.map(l => <SelectItem key={l.id} value={l.id} className="cursor-pointer">{l.company || l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </F>
              </div>
              <F label="Introdução">
                <Textarea 
                  placeholder="Descreva uma breve introdução da proposta..." 
                  value={form.intro} 
                  onChange={(e) => setForm({ ...form, intro: e.target.value })} 
                  rows={3}
                />
              </F>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <span className="text-primary text-[10px] capitalize">Configuração Comercial</span>
            <div className="grid gap-4 mt-4 md:grid-cols-2">
              <F label="Serviços contratados">
                <ServicesMultiSelect value={form.service_ids} onChange={async (ids) => {
                  let next = { ...form, service_ids: ids };
                  if (ids.length > form.service_ids.length) {
                    const addedId = ids.find(id => !form.service_ids.includes(id));
                    const s = services.find(x => x.id === addedId);
                    if (s) {
                      if (s.default_scope) next.scope = [...new Set([...next.scope, ...(s.default_scope as string[])])];
                      if ((s as any).contract_template_id && !next.contract_template_id) {
                        const { data: t } = await supabase.from("contract_templates").select("*").eq("id", (s as any).contract_template_id).single();
                        if (t) { next.contract_template_id = t.id; next.contract_content = t.content; }
                      }
                    }
                  }
                  setForm(next);
                }} />
              </F>
              <F label="Tipo de contrato">
                <Select value={form.contract_type === "recurring" ? "m" : "a"} onValueChange={(v) => setForm({ ...form, contract_type: v === "m" ? "recurring" : "one_time", payment_kind: v === "m" ? "recurring" : "one_time" })}>
                  <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m" className="cursor-pointer">Mensal</SelectItem>
                    <SelectItem value="a" className="cursor-pointer">Avulso</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-primary text-[10px] capitalize">Escopo</span>
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, scope: [...form.scope, ""] })}><Plus className="size-3" /> Item</Button>
            </div>
            <div className="space-y-2">
              {form.scope.map((it, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input value={it} onChange={(e) => { const n = [...form.scope]; n[idx] = e.target.value; setForm({ ...form, scope: n }); }} />
                  <Button variant="ghost" size="icon" onClick={() => { const n = [...form.scope]; n.splice(idx, 1); setForm({ ...form, scope: n }); }}><Trash2 className="size-4" /></Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <span className="text-primary text-[10px] capitalize">Condições de Pagamento</span>
            <div className="grid gap-4 mt-4 md:grid-cols-2">
              <F label="Método de Pagamento">
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boleto" className="cursor-pointer">Boleto</SelectItem>
                    <SelectItem value="pix" className="cursor-pointer">PIX</SelectItem>
                    <SelectItem value="cartao" className="cursor-pointer">Cartão de Crédito</SelectItem>
                    <SelectItem value="transferencia" className="cursor-pointer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="Dia do Faturamento">
                <Input type="number" value={form.billing_day} onChange={(e) => setForm({ ...form, billing_day: Number(e.target.value) })} />
              </F>
              <F label="Data do Primeiro Vencimento">
                <Input type="date" value={form.first_due_date} onChange={(e) => setForm({ ...form, first_due_date: e.target.value })} />
              </F>
              {form.contract_type === "recurring" ? (
                <F label="Prazo do Contrato (meses)">
                  <Input type="number" value={form.recurring_months} onChange={(e) => setForm({ ...form, recurring_months: Number(e.target.value) })} />
                </F>
              ) : (
                <F label="Número de Parcelas">
                  <Input type="number" value={form.installments} onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })} />
                </F>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <span className="text-primary text-[10px] capitalize">Contrato Jurídico</span>
            <div className="grid gap-4 mt-4">
              <F label="Template">
                <Select value={form.contract_template_id || "n"} onValueChange={(v) => {
                  if (v === "n") { setForm({ ...form, contract_template_id: "", contract_content: "" }); return; }
                  const t = contractTemplates.find(x => x.id === v);
                  if (t) setForm({ ...form, contract_template_id: v, contract_content: t.content });
                }}>
                  <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="n" className="cursor-pointer">Sem contrato</SelectItem>
                    {contractTemplates.map(t => <SelectItem key={t.id} value={t.id} className="cursor-pointer">{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              {form.contract_template_id && <Textarea rows={10} value={form.contract_content} onChange={(e) => setForm({ ...form, contract_content: e.target.value })} className="font-mono text-xs" />}
              <div className="grid grid-cols-2 gap-4">
                <F label="Assinatura Agência"><Input value={form.signature_agency} onChange={(e) => setForm({ ...form, signature_agency: e.target.value })} /></F>
                <F label="Assinatura Cliente"><Input value={form.signature_client} disabled placeholder="Aguardando..." /></F>
              </div>
              <F label="Observações Internas (Não aparecem para o cliente)">
                <Textarea 
                  placeholder="Anotações para a equipe..." 
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  rows={4}
                />
              </F>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 sticky top-6">
            <span className="text-primary text-[10px] capitalize">Investimento</span>
            <div className="grid gap-4 mt-4">
              {form.contract_type === "recurring" ? (
                <>
                  <F label="Investimento Mensal (R$)">
                    <Input 
                      type="number" 
                      step="0.01"
                      value={form.monthly_investment} 
                      onChange={(e) => setForm({ ...form, monthly_investment: Number(e.target.value) })} 
                      className="text-2xl font-bold text-primary"
                    />
                  </F>
                  <div className="pt-4 border-t border-border text-sm space-y-2">
                    <div className="flex justify-between"><span>Prazo</span><span>{form.recurring_months} meses</span></div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-border/50">
                      <span>Total do Contrato</span>
                      <span>{formatCurrency(form.monthly_investment * form.recurring_months)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <F label="Investimento Total (R$)">
                    <Input 
                      type="number" 
                      step="0.01"
                      value={form.one_time_investment} 
                      onChange={(e) => setForm({ ...form, one_time_investment: Number(e.target.value) })} 
                      className="text-2xl font-bold text-primary"
                    />
                  </F>
                  <div className="pt-4 border-t border-border text-sm">
                    <div className="flex justify-between"><span>Parcelas</span><span>{form.installments}x de {formatCurrency(form.one_time_investment / (form.installments || 1))}</span></div>
                  </div>
                </>
              )}
            </div>
          </div>

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
            <p className="mt-2 text-[10px]">Contrato Jurídico integrado com assinatura digital.</p>
          </div>

          <ProposalTimeline proposalId={proposalId} />
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] capitalize text-foreground/50">{label}</Label>
      {children}
    </div>
  );
}
