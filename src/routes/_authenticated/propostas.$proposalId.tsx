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
import { fetchPartners } from "@/lib/partners-api";
import { fetchBankAccounts, fetchCategories } from "@/lib/finance-api";
import { fetchServices, type Service } from "@/lib/services-api";
import { fetchContractTemplates, replaceContractVariables } from "@/lib/contracts-api";
import { supabase } from "@/integrations/supabase/client";
import { approveProposal, revertProposalApproval } from "@/lib/proposal-approval";
import { recordProposalEvent } from "@/lib/proposal-events";
import { createProposalVersion, cancelProposalWorkflow, reopenProposal } from "@/lib/proposal-versioning";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProposalTimeline } from "@/components/proposals/ProposalTimeline";
import { ProposalApprovalDialog } from "@/components/proposals/ProposalApprovalDialog";
import { ServicesMultiSelect } from "@/components/proposals/ServicesMultiSelect";
import { ScopeEditor } from "@/components/proposals/ScopeEditor";
// import { JOB_TEMPLATE_OPTIONS } from "@/lib/job-templates"; // removed
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
  Rocket,
  RotateCcw,
  XCircle,
  Ban,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/propostas/$proposalId")({
  head: () => ({ meta: [{ title: "Editor de proposta — KASA HUB" }] }),
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
  const navigate = useNavigate();

  const { data: proposal, isLoading: proposalLoading, isError: proposalError } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId),
    retry: 1,
  });
  const { data: items = [], isLoading: itemsLoading, isError: itemsError } = useQuery({
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
  const { data: representatives = [] } = useQuery({
    queryKey: ["partners", "representative"],
    queryFn: () => fetchPartners("representative"),
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
    scope_text: "",
    payment_method: "boleto",
    monthly_investment: 0,
    one_time_investment: 0,
    contract_template_id: "",
    contract_content: "",
    signature_client: "",
    signature_agency: "",
    notes: "",
  });

  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const [cancelType, setCancelType] = useState<"termination" | "archiving">("termination");
  const [cancelReason, setCancelReason] = useState("");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);


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
        scope_text: p.scope_text ?? (Array.isArray(p.scope) && p.scope.length > 0 ? (p.scope as string[]).map((i: string) => `- ${i}`).join("\n") : ""),
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
    mutationFn: async (overrides?: Partial<typeof form>) => {
      const f = { ...form, ...(overrides ?? {}) };
      
      // Bloqueio definitivo no front-end para evitar bypass
      if ((f.status === "accepted" || f.status === "converted" || f.status === "signed") && !f.signature_client) {
        throw new Error("Não é possível aprovar esta proposta manualmente sem a assinatura do cliente.");
      }

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
        responsible_id: f.responsible_id || null,
        commercial_id: f.commercial_id || null,

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
        scope_text: f.scope_text || null,
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


  const reopenCancelledMut = useMutation({
    mutationFn: () => reopenProposal(proposalId),
    onSuccess: () => {
      toast.success("Proposta reaberta para edição");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reopenMut = useMutation({
    mutationFn: () => createProposalVersion(proposalId),
    onSuccess: (newProposal) => {
      toast.success("Nova versão criada!");
      setShowReopenDialog(false);
      navigate({ to: "/propostas/$proposalId", params: { proposalId: newProposal.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelWorkflowMut = useMutation({
    mutationFn: () => cancelProposalWorkflow(proposalId, cancelReason),
    onSuccess: () => {
      toast.success("Proposta cancelada e toda a estrutura operacional vinculada foi removida com sucesso.");
      setShowCancelDialog(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) => {
      console.error("[UI] Erro ao cancelar proposta:", e);
      toast.error(`Falha ao remover estrutura: ${e.message}`);
    }
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

  if (proposalLoading || itemsLoading) return (
    <div className="p-10 flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-foreground/40 font-mono-kasa animate-pulse uppercase tracking-widest">Carregando detalhes da proposta...</p>
    </div>
  );
  
  if (proposalError || itemsError || !proposal) {
    return (
      <div className="p-10 text-center space-y-6 max-w-md mx-auto min-h-[400px] flex flex-col items-center justify-center">
        <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <XCircle className="size-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold">Proposta indisponível</h1>
          <p className="text-foreground/60 text-sm leading-relaxed">
            {proposalError || itemsError 
              ? "Ocorreu um erro ao carregar os dados. Por favor, tente novamente ou verifique sua conexão." 
              : "A proposta solicitada não existe ou foi removida."}
          </p>
        </div>
        <div className="flex flex-col w-full gap-2">
          <Button onClick={() => window.location.reload()} className="w-full">Tentar novamente</Button>
          <Button onClick={onBack} variant="outline" className="w-full">Voltar para a lista</Button>
        </div>
      </div>
    );
  }

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
          <Button onClick={() => saveMut.mutate(undefined)} disabled={saveMut.isPending} variant="outline" className="gap-2"><Save className="size-4" /> Salvar</Button>
          <Button variant="outline" onClick={copyShareLink} className="gap-2"><Copy className="size-4" /> Copiar link do cliente</Button>
          {proposal.status === "draft" && (
            <Button
              onClick={async () => {
                await saveMut.mutateAsync({ status: "sent", sent_at: new Date().toISOString() } as any);
                copyShareLink();
                toast.success("Proposta enviada. Link copiado — encaminhe ao cliente.");
              }}
              className="gap-2 bg-primary text-primary-foreground"
            >
              <Send className="size-4" /> Enviar para o Cliente
            </Button>
          )}
          {proposal.status !== "accepted" && proposal.status !== "converted" && proposal.status !== "cancelled" && (
            <Button
              onClick={() => setShowApprovalDialog(true)}
              className="gap-2 bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle2 className="size-4" /> Aprovar e Converter em Contrato
            </Button>
          )}
          {proposal.status !== "cancelled" && (
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <Ban className="size-4" /> Cancelar Proposta
            </Button>
          )}
          {proposal.status === 'accepted' && (
            <Button variant="outline" onClick={() => setShowReopenDialog(true)} className="gap-2"><RotateCcw className="size-4" /> Reabrir e Versionar</Button>
          )}
          {proposal.status === 'cancelled' && (
            <Button variant="outline" onClick={() => reopenCancelledMut.mutate()} disabled={reopenCancelledMut.isPending} className="gap-2"><RotateCcw className="size-4" /> Reabrir para Edição</Button>
          )}
        </div>
      </div>

      <ProposalApprovalDialog
        proposalId={proposalId}
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        onApproved={() => qc.invalidateQueries()}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-primary text-[10px] capitalize font-semibold tracking-wider">Cabeçalho</span>
              {proposal.version && (
                <div className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                  VERSÃO V{proposal.version}
                </div>
              )}
            </div>
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
              <F label="Representante Comercial (Comissão)">
                <Select value={form.commercial_id || "n"} onValueChange={(v) => setForm({ ...form, commercial_id: v === "n" ? "" : v })}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Sem representante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="n" className="cursor-pointer">Sem representante</SelectItem>
                    {representatives.map(r => <SelectItem key={r.id} value={r.id} className="cursor-pointer">{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-primary text-[10px] capitalize">Escopo dos Serviços</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Texto livre com Markdown. Use modelos prontos ou salve seus próprios.
                </p>
              </div>
            </div>
            <ScopeEditor
              value={form.scope_text}
              onChange={(v) => setForm({ ...form, scope_text: v })}
            />
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
                <F label="Assinatura Agência">
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-foreground/70">
                    Puxada automaticamente da assinatura cadastrada em <strong>Configurações → Assinatura</strong>.
                  </div>
                </F>
                <F label="Assinatura Cliente"><Input value={form.signature_client} disabled placeholder="Aguardando..." /></F>
              </div>

            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 sticky top-6">
            <span className="text-primary text-[10px] capitalize">Investimento</span>
            <div className="grid gap-4 mt-4">
              {form.contract_type === "recurring" ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <F label="Investimento Mensal (R$)">
                      <Input 
                        type="number" 
                        step="0.01"
                        value={form.monthly_investment} 
                        onChange={(e) => setForm({ ...form, monthly_investment: Number(e.target.value) })} 
                        className="text-2xl font-bold text-primary"
                      />
                    </F>
                    <F label="Investimento Único / Setup (R$)">
                      <Input 
                        type="number" 
                        step="0.01"
                        value={form.one_time_investment} 
                        onChange={(e) => setForm({ ...form, one_time_investment: Number(e.target.value) })} 
                        className="text-2xl font-bold"
                        placeholder="Ex: Taxa de adesão"
                      />
                    </F>
                  </div>
                  <div className="pt-4 border-t border-border text-sm space-y-2">
                    <div className="flex justify-between"><span>Prazo</span><span>{form.recurring_months} meses</span></div>
                    {form.one_time_investment > 0 && (
                      <div className="flex justify-between text-foreground/60 italic">
                        <span>Setup / Único</span>
                        <span>{formatCurrency(form.one_time_investment)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-border/50">
                      <span>Total do Contrato</span>
                      <span>{formatCurrency((form.monthly_investment * form.recurring_months) + form.one_time_investment)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
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
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-border/50">
                      <span>Total da Proposta</span>
                      <span>{formatCurrency(form.one_time_investment)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>


          {proposal.status === "converted" && (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-600" />
                <span className="text-green-600 text-[10px] uppercase font-bold tracking-widest">Assinatura Digital Confirmada</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-foreground/50 uppercase font-bold text-[9px]">Assinante</p>
                  <p className="font-semibold">{(proposal as any).accepted_name}</p>
                </div>
                <div>
                  <p className="text-foreground/50 uppercase font-bold text-[9px]">CPF</p>
                  <p className="font-semibold">{(proposal as any).client_cpf || '—'}</p>
                </div>
                <div>
                  <p className="text-foreground/50 uppercase font-bold text-[9px]">Cargo</p>
                  <p className="font-semibold">{(proposal as any).client_role || '—'}</p>
                </div>
                <div>
                  <p className="text-foreground/50 uppercase font-bold text-[9px]">Data/Hora</p>
                  <p className="font-semibold">{new Date(proposal.accepted_at!).toLocaleString("pt-BR")}</p>
                </div>
              </div>
              { (proposal as any).client_signature_data && (
                <div className="pt-4 border-t border-green-500/10 flex flex-col items-center">
                   <p className="text-foreground/50 uppercase font-bold text-[9px] w-full mb-2 text-left">Assinatura</p>
                   <img src={(proposal as any).client_signature_data} alt="Assinatura" className="max-h-16 object-contain grayscale brightness-50 contrast-125" />
                </div>
              )}
            </div>
          )}

          <ProposalTimeline proposalId={proposalId} />
        </div>
      </div>


      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reabrir Proposta</DialogTitle>
            <DialogDescription>
              Esta proposta já possui contrato e estrutura operacional vinculada. 
              Deseja criar uma nova versão (V{(proposal.version || 1) + 1})?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 text-sm text-foreground/70">
            <p>• A versão original (V{proposal.version || 1}) será mantida como aprovada.</p>
            <p>• O contrato e projeto atuais continuarão ativos até que a nova versão seja aprovada.</p>
            <p>• A nova aprovação gerará um aditivo contratual.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenDialog(false)}>Não, cancelar</Button>
            <Button onClick={() => reopenMut.mutate()} disabled={reopenMut.isPending}>Sim, criar nova versão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Ban className="size-5" /> Cancelar Contrato e Estrutura
            </DialogTitle>
            <DialogDescription className="font-bold text-foreground">
              ATENÇÃO: Esta ação removerá toda a estrutura criada automaticamente a partir desta proposta. Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3 text-sm text-foreground/70">
            <p className="font-semibold text-foreground">Estruturas que serão removidas:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Contrato vinculado e assinaturas</li>
              <li>Projeto operacional e cronograma</li>
              <li>Tarefas (Jobs) geradas</li>
              <li>Acessos ao Portal do Cliente</li>
            </ul>
            <p className="mt-4 italic">O cadastro do cliente e o histórico da proposta serão mantidos.</p>
          </div>

          <div className="space-y-2 mb-4">
            <Label className="text-sm">Motivo do cancelamento (Obrigatório)</Label>
            <Textarea 
              placeholder="Descreva o motivo para registro no histórico..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Manter contrato</Button>
            <Button 
              variant="destructive" 
              onClick={() => cancelWorkflowMut.mutate()} 
              disabled={cancelWorkflowMut.isPending || !cancelReason.trim()}
              className="gap-2"
            >
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
