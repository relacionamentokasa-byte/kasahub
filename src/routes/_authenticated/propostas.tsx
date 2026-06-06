import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProposalDetailSheet } from "@/components/proposals/ProposalDetailSheet";
import { useState, useMemo } from "react";

import {
  fetchProposals,
  fetchLeads,
  createProposal,
  deleteProposal,
  duplicateProposal,
  updateProposal,
  formatCurrency,
  type Proposal,
} from "@/lib/crm-api";
import { fetchClients } from "@/lib/ops-api";
import { recordProposalEvent } from "@/lib/proposal-events";
import { fetchServices, type Service } from "@/lib/services-api";
import { ServicesMultiSelect } from "@/components/proposals/ServicesMultiSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendEmail } from "@/lib/email.functions";

import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Plus,
  Trash2,
  ArrowUpRight,
  MoreVertical,
  Eye,
  Pencil,
  Copy,
  Printer,
  Share2,
  MessageCircle,
  Mail,
  CheckCircle2,
  RotateCcw,
  Ban,
  Search,
} from "lucide-react";

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/propostas")({
  head: () => ({ meta: [{ title: "Propostas — KASA OS" }] }),
  component: ProposalsPage,
});

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-foreground/10 text-foreground/70" },
  sent: { label: "Enviada", cls: "bg-blue-500/15 text-blue-300" },
  viewed: { label: "Visualizada", cls: "bg-amber-500/15 text-amber-300" },
  waiting_signature: { label: "Aguardando Assinatura", cls: "bg-purple-500/15 text-purple-300" },
  accepted: { label: "Aprovada", cls: "bg-green-500/15 text-green-300" },
  rejected: { label: "Recusada", cls: "bg-red-500/15 text-red-300" },
  cancelled: { label: "Cancelada", cls: "bg-red-500/15 text-red-300" },
  removed: { label: "Removida", cls: "bg-gray-500/15 text-gray-300" },
};

function publicUrl(token: string) {
  return `${window.location.origin}/p/${token}`;
}

function ProposalsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();
  const sendEmailFn = useServerFn(sendEmail);
  const { data: proposals = [] } = useQuery({ queryKey: ["proposals"], queryFn: fetchProposals });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const { data: services = [] } = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => fetchServices({ onlyActive: true }),
  });
  const [open, setOpen] = useState(false);
  const emptyForm = {
    title: "",
    target_kind: "client" as "client" | "lead",
    client_id: "",
    lead_id: "",
    client_name: "",
    client_email: "",
    service_ids: [] as string[],
    contract_type: "mensal" as "mensal" | "avulso",
    monthly_investment: 0,
    one_time_investment: 0,
    contract_term: "",
    installments: 1,
    payment_method: "boleto",
    first_due_date: new Date().toISOString().split("T")[0],
    valid_until: "",
    intro: "Olá! É um prazer apresentar nossa proposta comercial. Nossa equipe está focada em entregar resultados excepcionais para sua marca.",
    notes: "",
    scope: [] as string[],
  };
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");

  const [emailDialog, setEmailDialog] = useState<{ proposal: Proposal } | null>(null);

  const [emailForm, setEmailForm] = useState({ to: "", subject: "", message: "" });

  const createMut = useMutation({
    mutationFn: async () => {
      const recurring_months =
        form.contract_type === "mensal"
          ? form.contract_term === "monthly" || !form.contract_term
            ? 12 // Default to 12 if "sem prazo" but recurring
            : form.contract_term === "3_months"
              ? 3
              : form.contract_term === "6_months"
                ? 6
                : form.contract_term === "12_months"
                  ? 12
                  : 12
          : 1;

      let contract_template_id: string | null = null;
      let contract_content: string | null = null;

      // If a single service is selected and it has a template, use it
      if (form.service_ids.length > 0) {
        const firstServiceId = form.service_ids[0];
        const { data: s } = await supabase.from("services").select("contract_template_id").eq("id", firstServiceId).single();
        if (s?.contract_template_id) {
          const { data: t } = await supabase.from("contract_templates").select("id, content").eq("id", s.contract_template_id).single();
          if (t) {
            contract_template_id = t.id;
            contract_content = t.content;
          }
        }
      }

      return createProposal({
        title: form.title,
        target_kind: form.target_kind,
        client_id: form.target_kind === "client" ? (form.client_id || null) : null,
        lead_id: form.target_kind === "lead" ? (form.lead_id || null) : null,
        client_name: form.client_name,
        client_email: form.client_email || null,
        intro: form.intro || null,
        service_ids: form.service_ids,
        valid_until: form.valid_until || null,
        monthly_investment: form.contract_type === "mensal" ? form.monthly_investment : 0,
        one_time_investment: form.contract_type === "avulso" ? form.one_time_investment : 0,
        total: form.contract_type === "mensal" ? form.monthly_investment : form.one_time_investment,
        contract_type: form.contract_type === "mensal" ? "recurring" : "one_time",
        payment_kind: form.contract_type === "mensal" ? "recurring" : "one_time",
        auto_create_jobs: true,
        contract_term: form.contract_term,
        installments: form.contract_type === "avulso" ? form.installments : 1,
        recurring_months: recurring_months,
        payment_method: form.payment_method,
        first_due_date: form.first_due_date,
        notes: form.notes || null,
        scope: form.scope,
        contract_template_id,
        contract_content,
      });
    },
    onSuccess: async (p) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      setOpen(false);
      setForm(emptyForm);
      await recordProposalEvent(p.id, "created", { target_kind: form.target_kind });
      toast.success("Proposta criada com sucesso!");
      setSelectedId(p.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const delMut = useMutation({
    mutationFn: (id: string) => deleteProposal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta excluída");
    },
  });

  const dupMut = useMutation({
    mutationFn: (id: string) => duplicateProposal(id),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta duplicada");
      setSelectedId(p.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateProposal(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const emailMut = useMutation({
    mutationFn: async () => {
      if (!emailDialog) return;
      const link = publicUrl(emailDialog.proposal.public_token);
      const html = `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
          <p>Olá, ${emailDialog.proposal.client_name},</p>
          <p style="white-space:pre-wrap">${emailForm.message.replace(/</g, "&lt;")}</p>
          <p>
            <a href="${link}" style="display:inline-block;background:#FFBC45;color:#0c1618;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
              Visualizar e assinar proposta
            </a>
          </p>
          <p style="font-size:12px;color:#64748b">Ou copie e cole no navegador: ${link}</p>
        </div>`;
      await sendEmailFn({
        data: {
          to: emailForm.to,
          subject: emailForm.subject,
          html,
        },
      });
    },
    onSuccess: () => {
      toast.success("E-mail enviado");
      if (emailDialog) {
        statusMut.mutate({ id: emailDialog.proposal.id, status: "sent" });
      }
      setEmailDialog(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function copyLink(p: Proposal) {
    navigator.clipboard.writeText(publicUrl(p.public_token));
    toast.success("Link copiado");
  }

  function openWhatsApp(p: Proposal) {
    const link = publicUrl(p.public_token);
    const text = `Olá, ${p.client_name}!%0A%0ASegue sua proposta comercial da Kasa Marketing Consultoria.%0AVocê pode visualizar e assinar através do link abaixo:%0A%0A${encodeURIComponent(link)}%0A%0AQualquer dúvida estou à disposição.`;
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function openPdf(p: Proposal) {
    window.open(`${publicUrl(p.public_token)}?print=1`, "_blank");
  }

  function openView(p: Proposal) {
    window.open(publicUrl(p.public_token), "_blank");
  }

  function openEmail(p: Proposal) {
    setEmailForm({
      to: p.client_email ?? "",
      subject: `Proposta comercial — ${p.title}`,
      message: `Segue sua proposta comercial.\nFico à disposição para qualquer dúvida.`,
    });
    setEmailDialog({ proposal: p });
  }

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // Status filter
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      
      // Client filter
      if (filterClient !== "all" && p.client_id !== filterClient) return false;

      // Search (title or client name)
      if (search) {
        const s = search.toLowerCase();
        const titleMatch = p.title.toLowerCase().includes(s);
        const clientMatch = p.client_name.toLowerCase().includes(s);
        if (!titleMatch && !clientMatch) return false;
      }

      return true;
    });
  }, [proposals, filterStatus, filterClient, search]);

  return (

    <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <span className="text-primary text-[10px] capitalize">Comercial · Propostas</span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-1">
            Propostas comerciais
          </h1>
          <p className="text-foreground/60 mt-2 max-w-xl text-sm">
            Construa propostas com destaque para o Investimento Mensal e envie por link
            compartilhável.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold h-10 px-5 gap-2">
              <Plus className="size-4" /> Nova proposta
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface border-border p-0 gap-0 w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] grid grid-rows-[auto_1fr_auto] overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-border flex-row items-center justify-between space-y-0 sticky top-0 bg-surface z-10">
              <DialogTitle className="font-display text-2xl">Nova proposta</DialogTitle>
              <div className="flex items-center gap-2 mr-8">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info("Templates em breve")}
                  className="gap-2"
                >
                  <FileText className="size-4" /> Templates
                </Button>
              </div>
            </DialogHeader>
            <div className="overflow-y-auto px-6 py-5">
              <div className="grid gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Dados Comerciais</h3>
                  <div className="grid gap-4">
                    <Field label="Título *">
                      <Input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Ex: Proposta · Marketing Performance"
                        autoFocus
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Destino">
                        <Select
                          value={form.target_kind}
                          onValueChange={(v: "client" | "lead") =>
                            setForm({
                              ...form,
                              target_kind: v,
                              client_id: "",
                              lead_id: "",
                              client_name: "",
                              client_email: "",
                            })
                          }
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client" className="cursor-pointer">Cliente</SelectItem>
                            <SelectItem value="lead" className="cursor-pointer">Lead</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      {form.target_kind === "client" ? (
                        <Field label="Cliente *">
                          <Select
                            value={form.client_id || "__free__"}
                            onValueChange={(v) => {
                              if (v === "__free__") {
                                setForm({ ...form, client_id: "", client_name: "", client_email: "" });
                                return;
                              }
                              const c = clients.find((x) => x.id === v);
                              setForm({
                                ...form,
                                client_id: v,
                                client_name: c ? (c.company || c.name) : "",
                                client_email: c?.email ?? "",
                              });
                            }}
                          >
                            <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__free__" className="cursor-pointer">Digitar nome...</SelectItem>
                              {clients.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="cursor-pointer">{c.company || c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      ) : (
                        <Field label="Lead *">
                          <Select
                            value={form.lead_id || "__none__"}
                            onValueChange={(v) => {
                              if (v === "__none__") {
                                setForm({ ...form, lead_id: "", client_name: "", client_email: "" });
                                return;
                              }
                              const l = leads.find((x) => x.id === v);
                              setForm({
                                ...form,
                                lead_id: v,
                                client_name: l ? (l.company || l.name) : "",
                                client_email: l?.email ?? "",
                              });
                            }}
                          >
                            <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {leads.map((l) => (
                                <SelectItem key={l.id} value={l.id} className="cursor-pointer">
                                  {l.name}{l.company ? ` · ${l.company}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    </div>

                    {!form.client_id && form.target_kind === "client" && (
                      <Field label="Nome do Cliente *">
                        <Input
                          placeholder="Nome da empresa ou pessoa"
                          value={form.client_name}
                          onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                        />
                      </Field>
                    )}

                    <Field label="Serviços Contratados *">
                      <ServicesMultiSelect
                        value={form.service_ids}
                        onChange={(ids) => {
                          const oldIds = form.service_ids;
                          const newIds = ids;
                          
                          // If adding a new service, pull its default scope
                          if (newIds.length > oldIds.length) {
                            const addedId = newIds.find(id => !oldIds.includes(id));
                            const service = services.find((s: Service) => s.id === addedId);
                            if (service && service.default_scope) {
                              const scopeToAdd = (service.default_scope as string[]).filter(
                                item => !form.scope.includes(item)
                              );
                              setForm({ 
                                ...form, 
                                service_ids: ids, 
                                scope: [...form.scope, ...scopeToAdd] 
                              });
                              return;
                            }
                          }
                          
                          setForm({ ...form, service_ids: ids });
                        }}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Tipo de Contrato *">
                        <Select
                          value={form.contract_type}
                          onValueChange={(v: "mensal" | "avulso") =>
                            setForm({ ...form, contract_type: v })
                          }
                        >
                          <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mensal" className="cursor-pointer">Mensal / Recorrente</SelectItem>
                            <SelectItem value="avulso" className="cursor-pointer">Job Avulso</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      
                      {form.contract_type === "mensal" ? (
                        <Field label="Valor Mensal *">
                          <Input
                            type="number"
                            value={form.monthly_investment || ""}
                            onChange={(e) => setForm({ ...form, monthly_investment: Number(e.target.value) })}
                            placeholder="0,00"
                          />
                        </Field>
                      ) : (
                        <Field label="Valor do Projeto *">
                          <Input
                            type="number"
                            value={form.one_time_investment || ""}
                            onChange={(e) => setForm({ ...form, one_time_investment: Number(e.target.value) })}
                            placeholder="0,00"
                          />
                        </Field>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">INVESTIMENTO</h3>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      {form.contract_type === "mensal" ? (
                        <>
                          <Field label="Prazo do Contrato">
                            <Select
                              value={form.contract_term}
                              onValueChange={(v) => setForm({ ...form, contract_term: v })}
                            >
                               <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Selecione o prazo" /></SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="monthly" className="cursor-pointer">Sem prazo definido</SelectItem>
                                <SelectItem value="3_months" className="cursor-pointer">3 meses</SelectItem>
                                <SelectItem value="6_months" className="cursor-pointer">6 meses</SelectItem>
                                <SelectItem value="12_months" className="cursor-pointer">12 meses</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Investimento Total">
                            <div className="h-10 px-3 flex items-center bg-primary/5 border border-primary/20 rounded-md font-semibold text-primary">
                              {formatCurrency(
                                form.monthly_investment * (
                                  form.contract_term === "3_months" ? 3 :
                                  form.contract_term === "6_months" ? 6 :
                                  form.contract_term === "12_months" ? 12 : 
                                  form.contract_term === "monthly" ? 12 : 1
                                )
                              )}
                            </div>
                          </Field>
                        </>
                      ) : (
                        <>
                          <Field label="Parcelamento">
                            <Select
                              value={String(form.installments)}
                              onValueChange={(v) => setForm({ ...form, installments: Number(v) })}
                            >
                              <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                                  <SelectItem key={n} value={String(n)} className="cursor-pointer">{n}x</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Valor da Parcela">
                            <div className="h-10 px-3 flex items-center bg-primary/5 border border-primary/20 rounded-md font-semibold text-primary">
                              {formatCurrency(form.one_time_investment / (form.installments || 1))}
                            </div>
                          </Field>
                        </>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Forma de Pagamento">
                        <Select
                          value={form.payment_method}
                          onValueChange={(v) => setForm({ ...form, payment_method: v })}
                        >
                          <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="boleto" className="cursor-pointer">Boleto Bancário</SelectItem>
                            <SelectItem value="pix" className="cursor-pointer">PIX</SelectItem>
                            <SelectItem value="credit_card" className="cursor-pointer">Cartão de Crédito</SelectItem>
                            <SelectItem value="transfer" className="cursor-pointer">Transferência</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="1º Vencimento">
                        <Input
                          type="date"
                          value={form.first_due_date}
                          onChange={(e) => setForm({ ...form, first_due_date: e.target.value })}
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Itens / Escopo</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1 px-2"
                      onClick={() => setForm({ ...form, scope: [...form.scope, ""] })}
                    >
                      <Plus className="size-3" /> Adicionar Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {form.scope.length === 0 && (
                      <p className="text-[11px] text-foreground/40 italic">
                        Selecione serviços para carregar o escopo automático ou adicione itens manualmente.
                      </p>
                    )}
                    {form.scope.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center group">
                        <div className="size-4 rounded border border-primary/30 bg-primary/5 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="size-2.5 text-primary" />
                        </div>
                        <Input
                          value={item}
                          onChange={(e) => {
                            const newScope = [...form.scope];
                            newScope[idx] = e.target.value;
                            setForm({ ...form, scope: newScope });
                          }}
                          className="h-8 text-sm"
                          placeholder="Descreva o item do escopo..."
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-foreground/30 hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            const newScope = [...form.scope];
                            newScope.splice(idx, 1);
                            setForm({ ...form, scope: newScope });
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Outras Informações</h3>
                  <div className="grid gap-4">
                    <Field label="Introdução">
                      <Textarea
                        rows={3}
                        value={form.intro}
                        onChange={(e) => setForm({ ...form, intro: e.target.value })}
                        placeholder="Breve introdução da proposta..."
                      />
                    </Field>
                    <Field label="Observações Internas">
                      <Textarea
                        rows={2}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Informações relevantes para a operação..."
                      />
                    </Field>
                    <Field label="Validade da Proposta">
                      <Input
                        type="date"
                        value={form.valid_until}
                        onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-border bg-surface sticky bottom-0 gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                disabled={!form.title || !form.client_name || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                Salvar rascunho
              </Button>
              <Button
                disabled={!form.title || !form.client_name || createMut.isPending}
                onClick={() => createMut.mutate()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                Criar e editar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6 mb-8">
        {/* Search and simple client filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome da proposta ou cliente..." 
              className="pl-9 bg-surface border-border"
            />
          </div>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="bg-surface border-border">
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "Todas" },
            { id: "waiting_signature", label: "Aguardando Assinatura" },
            { id: "accepted", label: "Aprovadas" },
            { id: "rejected", label: "Rejeitadas" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilterStatus(chip.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                filterStatus === chip.id 
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20" 
                  : "bg-surface border border-border text-foreground/60 hover:border-primary/50"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {filteredProposals.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <div className="size-14 rounded-2xl bg-primary/10 ring-1 ring-primary/30 grid place-items-center mx-auto mb-4">
            <FileText className="size-6 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold mb-1">
            {search || filterStatus !== "all" || filterClient !== "all" 
              ? "Nenhuma proposta encontrada" 
              : "Nenhuma proposta ainda"}
          </h2>
          <p className="text-foreground/60 text-sm">
            {search || filterStatus !== "all" || filterClient !== "all" 
              ? "Tente ajustar seus filtros de busca." 
              : "Crie sua primeira proposta ou gere uma a partir de um lead no CRM."}
          </p>
        </div>
      ) : (

        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] capitalize text-foreground/50 border-b border-border">
                  <th className="px-5 py-3">Proposta</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3 text-right">Mensal</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map((p) => {

                  const s = STATUS_LABELS[p.status] ?? STATUS_LABELS.draft;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-0 hover:bg-surface-elevated transition"
                    >
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setSelectedId(p.id)}
                          className="font-semibold hover:text-primary flex items-center gap-1 text-left"
                        >
                          {p.title}
                          <ArrowUpRight className="size-3.5 opacity-60" />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-foreground/70">{p.client_name}</td>
                      <td className="px-5 py-3 text-right text-primary">
                        {formatCurrency(Number(p.monthly_investment))}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatCurrency(Number(p.total))}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] capitalize px-2 py-1 rounded ${s.cls}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ActionsMenu
                          proposal={p}
                          onView={() => openView(p)}
                          onEdit={() => setSelectedId(p.id)}
                          onDuplicate={() => dupMut.mutate(p.id)}
                          onPdf={() => openPdf(p)}
                          onShare={() => copyLink(p)}
                          onWhatsApp={() => openWhatsApp(p)}
                          onEmail={() => openEmail(p)}
                          onApprove={() => statusMut.mutate({ id: p.id, status: "accepted" })}
                          onReopen={() => statusMut.mutate({ id: p.id, status: "reopened" })}
                          onCancel={() => statusMut.mutate({ id: p.id, status: "cancelled" })}
                          onDelete={() => {
                            if (confirm("Excluir proposta?")) delMut.mutate(p.id);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredProposals.map((p) => {
              const s = STATUS_LABELS[p.status] ?? STATUS_LABELS.draft;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className="font-semibold hover:text-primary flex-1 text-left"
                    >
                      {p.title}
                    </button>
                    <ActionsMenu
                      proposal={p}
                      onView={() => openView(p)}
                      onEdit={() => setSelectedId(p.id)}
                      onDuplicate={() => dupMut.mutate(p.id)}
                      onPdf={() => openPdf(p)}
                      onShare={() => copyLink(p)}
                      onWhatsApp={() => openWhatsApp(p)}
                      onEmail={() => openEmail(p)}
                      onApprove={() => statusMut.mutate({ id: p.id, status: "accepted" })}
                      onReopen={() => statusMut.mutate({ id: p.id, status: "reopened" })}
                      onCancel={() => statusMut.mutate({ id: p.id, status: "cancelled" })}
                      onDelete={() => {
                        if (confirm("Excluir proposta?")) delMut.mutate(p.id);
                      }}
                    />
                  </div>
                  <p className="text-xs text-foreground/60 mt-1">{p.client_name}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-[10px] px-2 py-1 rounded ${s.cls}`}>
                      {s.label}
                    </span>
                    <div className="text-right">
                      <p className="text-[10px] text-foreground/40">Mensal</p>
                      <p className="text-sm font-semibold text-primary">
                        {formatCurrency(Number(p.monthly_investment))}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Email dialog */}
      <Dialog open={!!emailDialog} onOpenChange={(v) => !v && setEmailDialog(null)}>
        <DialogContent className="bg-surface border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Enviar por e-mail</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Destinatário">
              <Input
                type="email"
                value={emailForm.to}
                onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
              />
            </Field>
            <Field label="Assunto">
              <Input
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              />
            </Field>
            <Field label="Mensagem">
              <Textarea
                rows={5}
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
              />
            </Field>
            <p className="text-[11px] text-foreground/50">
              O link público da proposta será incluído automaticamente no e-mail.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmailDialog(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!emailForm.to || !emailForm.subject || emailMut.isPending}
              onClick={() => emailMut.mutate()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2"
            >
              <Mail className="size-4" /> Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProposalDetailSheet
        proposalId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function ActionsMenu({
  proposal,
  onView,
  onEdit,
  onDuplicate,
  onPdf,
  onShare,
  onWhatsApp,
  onEmail,
  onApprove,
  onReopen,
  onCancel,
  onDelete,
}: {
  proposal: Proposal;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onPdf: () => void;
  onShare: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onApprove: () => void;
  onReopen: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="size-8 grid place-items-center rounded-md text-foreground/60 hover:text-foreground hover:bg-surface-elevated transition"
          aria-label="Ações"
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase text-foreground/40">
          Proposta
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={onView}>
          <Eye className="size-4" /> Visualizar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="size-4" /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPdf}>
          <Printer className="size-4" /> Gerar PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase text-foreground/40">
          Compartilhar
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={onShare}>
          <Share2 className="size-4" /> Copiar link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onWhatsApp}>
          <MessageCircle className="size-4" /> Enviar por WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEmail}>
          <Mail className="size-4" /> Enviar por E-mail
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase text-foreground/40">
          Status
        </DropdownMenuLabel>
        {proposal.status !== "accepted" && (
          <DropdownMenuItem onClick={onApprove}>
            <CheckCircle2 className="size-4 text-green-400" /> Aprovar
          </DropdownMenuItem>
        )}
        {proposal.status !== "draft" && (
          <DropdownMenuItem onClick={onReopen}>
            <RotateCcw className="size-4" /> Reabrir
          </DropdownMenuItem>
        )}
        {proposal.status !== "cancelled" && (
          <DropdownMenuItem onClick={onCancel}>
            <Ban className="size-4" /> Cancelar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="size-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] capitalize text-foreground/60">{label}</Label>
      {children}
    </div>
  );
}
