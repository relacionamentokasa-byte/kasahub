import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScopeEditor } from "@/components/proposals/ScopeEditor";
import { ProposalDetailSheet } from "@/components/proposals/ProposalDetailSheet";
import { useState, useMemo } from "react";

import {
  fetchProposals,
  fetchLeads,
  createProposal,
  deleteProposal,
  restoreProposal,
  duplicateProposal,
  updateProposal,
  formatCurrency,
  type Proposal,
} from "@/lib/crm-api";
import { fetchClients } from "@/lib/ops-api";
import { recordProposalEvent } from "@/lib/proposal-events";
import { fetchServices, type Service } from "@/lib/services-api";
import { ymd, safeBillingDay } from "@/lib/proposal-approval";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  XCircle,
  Filter,
  Loader2,
} from "lucide-react";

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/propostas/")({
  head: () => ({ meta: [{ title: "Propostas — KASA HUB" }] }),
  component: ProposalsPage,
});

const STATUS_LABELS: Record<string, { label: string; cls: string; dot: string }> = {
  Rascunho: { label: "Rascunho", cls: "bg-zinc-200 text-zinc-800 ring-1 ring-zinc-300", dot: "bg-zinc-500" },
  Enviada: { label: "Enviada", cls: "bg-blue-500 text-white shadow-sm shadow-blue-500/30", dot: "bg-white" },
  Aprovada: { label: "Aprovada", cls: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30", dot: "bg-white" },
  Recusada: { label: "Recusada", cls: "bg-red-500 text-white shadow-sm shadow-red-500/30", dot: "bg-white" },
  Encerrada: { label: "Encerrada", cls: "bg-slate-700 text-white ring-1 ring-slate-500/40", dot: "bg-slate-300" },
};

const STATUS_ORDER = ["Rascunho", "Enviada", "Aprovada", "Recusada", "Encerrada"];

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "agora";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const mo = Math.floor(d / 30);
  return `há ${mo}mo`;
}

type ProposalEventSummary = {
  lastSent?: string;
  lastViewed?: string;
  viewCount: number;
  lastStatusAt?: string;
};

function ProposalStatusLine({
  status,
  summary,
  createdAt,
}: {
  status: string;
  summary?: ProposalEventSummary;
  createdAt?: string | null;
}) {
  if (status === "Enviada") {
    if (summary?.lastViewed) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <Eye className="size-3" />
          Cliente visualizou {timeAgo(summary.lastViewed)}
          {summary.viewCount > 1 ? ` · ${summary.viewCount} views` : ""}
        </span>
      );
    }
    const sentAt = summary?.lastSent ?? createdAt;
    if (sentAt) {
      return (
        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          Enviada {timeAgo(sentAt)} · sem visualização
        </span>
      );
    }
  }
  if (status === "Aprovada" && summary?.lastStatusAt) {
    return <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Aprovada {timeAgo(summary.lastStatusAt)}</span>;
  }
  if (status === "Recusada" && summary?.lastStatusAt) {
    return <span className="text-[11px] text-red-600 dark:text-red-400">Recusada {timeAgo(summary.lastStatusAt)}</span>;
  }
  if (status === "Encerrada" && summary?.lastStatusAt) {
    return <span className="text-[11px] text-slate-500">Encerrada {timeAgo(summary.lastStatusAt)}</span>;
  }
  if (status === "Rascunho" && createdAt) {
    return <span className="text-[11px] text-foreground/40">Criada {timeAgo(createdAt)}</span>;
  }
  return null;
}

function publicUrl(token: string) {
  return `${window.location.origin}/proposta/${token}`;
}

function ProposalsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();
  const sendEmailFn = useServerFn(sendEmail);
  const { data: proposals = [] } = useQuery({ queryKey: ["proposals", "active"], queryFn: () => fetchProposals(false) });
  const { data: trashedProposals = [] } = useQuery({ queryKey: ["proposals", "trashed"], queryFn: () => fetchProposals(true) });
  const [showTrash, setShowTrash] = useState(false);
  
  const proposalsToDisplay = showTrash ? trashedProposals.filter(p => p.deleted_at !== null) : proposals;

  const proposalIds = useMemo(() => proposalsToDisplay.map((p) => p.id), [proposalsToDisplay]);
  const { data: proposalEvents = [] } = useQuery({
    queryKey: ["proposal_events", "summary", proposalIds],
    enabled: proposalIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_events")
        .select("proposal_id, type, created_at")
        .in("proposal_id", proposalIds)
        .in("type", ["sent", "viewed", "approved", "rejected", "cancelled"]);
      if (error) throw error;
      return data ?? [];
    },
  });

  const eventSummary = useMemo(() => {
    const map = new Map<string, ProposalEventSummary>();
    for (const e of proposalEvents) {
      const s = map.get(e.proposal_id) ?? { viewCount: 0 };
      if (e.type === "sent" && (!s.lastSent || e.created_at > s.lastSent)) s.lastSent = e.created_at;
      if (e.type === "viewed") {
        s.viewCount += 1;
        if (!s.lastViewed || e.created_at > s.lastViewed) s.lastViewed = e.created_at;
      }
      if ((e.type === "approved" || e.type === "rejected" || e.type === "cancelled") &&
          (!s.lastStatusAt || e.created_at > s.lastStatusAt)) {
        s.lastStatusAt = e.created_at;
      }
      map.set(e.proposal_id, s);
    }
    return map;
  }, [proposalEvents]);

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
    valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],

    intro: "Olá! É um prazer apresentar nossa proposta comercial. Nossa equipe está focada em entregar resultados excepcionais para sua marca.",
    notes: "",
    scope: "",
    status: "Rascunho",
  };
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");

  const [emailDialog, setEmailDialog] = useState<{ proposal: Proposal } | null>(null);

  const [emailForm, setEmailForm] = useState({ to: "", subject: "", message: "" });


  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterClient("all");
  };

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
        valid_until: form.valid_until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        monthly_investment: form.contract_type === "mensal" ? form.monthly_investment : 0,
        one_time_investment: form.contract_type === "avulso" ? form.one_time_investment : 0,
        total: form.contract_type === "mensal" ? form.monthly_investment : form.one_time_investment,
        contract_type: form.contract_type === "mensal" ? "recurring" : "one_time",
        payment_kind: form.contract_type === "mensal" ? "recurring" : "one_time",
        auto_create_jobs: false,
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
    mutationFn: ({ id, permanent }: { id: string; permanent?: boolean }) => deleteProposal(id, permanent),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success(variables.permanent ? "Proposta excluída permanentemente" : "Proposta enviada para a lixeira");
    },
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => restoreProposal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta restaurada");
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
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // Bloqueio extra no front-end para garantir que não aprovem sem assinatura
      if (status === "Aprovada") {
        const { data: p } = await supabase.from("proposals").select("signature_client").eq("id", id).single();
        if (!p?.signature_client) {
          throw new Error("Não é possível aprovar uma proposta sem a assinatura digital do cliente.");
        }
      }
      return updateProposal(id, { status });
    },
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
        statusMut.mutate({ id: emailDialog.proposal.id, status: "Enviada" });
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
    return proposalsToDisplay.filter((p) => {
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
  }, [proposalsToDisplay, filterStatus, filterClient, search]);

  return (

    <div className="p-4 lg:p-10 max-w-7xl mx-auto w-full pb-20 md:pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-primary text-[10px] uppercase font-bold tracking-wider">Comercial · Propostas</span>
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight mt-1">
            {showTrash ? "Lixeira" : "Propostas"}
          </h1>
          <p className="text-foreground/60 mt-2 max-w-xl text-sm">
            {showTrash 
              ? "Visualize e restaure propostas excluídas ou remova-as permanentemente."
              : "Construa propostas com destaque para o Investimento Mensal e envie por link compartilhável."
            }
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setShowTrash(!showTrash)}
            className="flex-1 sm:flex-none rounded-full font-semibold h-11 sm:h-10 px-5 gap-2"
          >
            {showTrash ? <ArrowUpRight className="size-4 rotate-180" /> : <Trash2 className="size-4" />}
            {showTrash ? "Voltar" : "Lixeira"}
          </Button>
          {!showTrash && (
            <Dialog open={open} onOpenChange={setOpen}>

          <DialogTrigger asChild>
            <Button className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold h-11 sm:h-10 px-5 gap-2">
              <Plus className="size-4 shrink-0" /> Nova
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface border-border p-0 gap-0 w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] grid grid-rows-[auto_1fr_auto] overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-border flex-row items-center justify-between space-y-0 sticky top-0 bg-surface z-10">
              <DialogTitle className="font-display text-2xl">Nova proposta</DialogTitle>
              <div className="flex items-center gap-2 mr-8">
                {/* Botão de templates removido (limpeza operacional) */}
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
                              const scopeToAdd = (service.default_scope as string[])
                                .map(item => `<p>${item}</p>`)
                                .join("");
                              
                              setForm({ 
                                ...form, 
                                service_ids: ids, 
                                scope: form.scope + scopeToAdd 
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
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Itens / Escopo</h3>
                  <ScopeEditor
                    value={form.scope || ""}
                    onChange={(v: string) => setForm({ ...form, scope: v })}
                  />
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Padrão: 7 dias a partir da emissão.
                      </p>
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
          )}
        </div>
      </div>

      {!showTrash && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-surface border border-border p-3 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-3 w-full">
            <div className="relative w-full md:w-80">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título ou cliente..." 
                className="pl-10 h-10 text-sm bg-background/50 border-border focus:bg-background rounded-xl"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-48">
                <Filter className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 z-10" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-10 pl-9 text-sm bg-background/50 border-border rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-10 text-sm bg-background/50 border-border rounded-xl md:w-56">
                  <SelectValue placeholder="Todos os Clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(search || filterStatus !== "all" || filterClient !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-10 px-3 text-foreground/60 hover:text-foreground gap-2 rounded-xl"
                >
                  <XCircle className="size-4" />
                  <span className="hidden sm:inline">Limpar</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {filteredProposals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface/50 p-20 text-center animate-reveal">
          <div className="size-20 rounded-3xl bg-primary/10 ring-1 ring-primary/30 grid place-items-center mx-auto mb-6 shadow-xl shadow-primary/5">
            <Search className="size-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">
            {showTrash 
              ? "A lixeira está vazia"
              : "Nenhuma proposta encontrada"
            }
          </h2>
          <p className="text-foreground/60 text-sm max-w-md mx-auto mb-8">
            {showTrash
              ? "As propostas que você excluir aparecerão aqui para serem restauradas ou removidas permanentemente."
              : (search || filterStatus !== "all" || filterClient !== "all" 
                ? "Não encontramos resultados para os filtros aplicados. Tente ajustar sua busca ou limpar os filtros abaixo." 
                : "Você ainda não criou nenhuma proposta comercial. Comece criando uma nova agora!")
            }
          </p>
          {(search || filterStatus !== "all" || filterClient !== "all") && !showTrash && (
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="rounded-full px-8 h-12 font-semibold gap-2 border-primary/20 hover:bg-primary/5"
            >
              <RotateCcw className="size-4" /> Limpar Filtros
            </Button>
          )}
        </div>
      ) : (

        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] capitalize text-foreground/50 border-b border-border">
                  <th className="px-5 py-3 w-20">Nº</th>
                  <th className="px-5 py-3">Proposta</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3 text-right">Investimento</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map((p: Proposal) => {
                  const s = STATUS_LABELS[p.status] ?? STATUS_LABELS.Rascunho;
                  const summary = eventSummary.get(p.id);

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-0 hover:bg-surface-elevated transition"
                    >
                      <td className="px-5 py-3 font-mono text-xs opacity-40">
                        {p.number_display}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setSelectedId(p.id)}
                          className="font-semibold hover:text-primary flex items-center gap-1 text-left"
                        >
                          {p.title}
                          <ArrowUpRight className="size-3.5 opacity-60" />
                        </button>
                        <div className="mt-0.5">
                          <ProposalStatusLine status={p.status} summary={summary} createdAt={p.created_at} />
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        {p.client_id ? (
                          <Link 
                            to="/clientes/$clientId" 
                            params={{ clientId: p.client_id }}
                            data-testid="client-link"
                            className="text-foreground/70 hover:text-primary hover:underline cursor-pointer transition-colors font-medium"
                          >
                            {p.client_name}
                          </Link>
                        ) : (
                          <span className="text-foreground/70">{p.client_name}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-primary">
                        {p.contract_type === 'recurring' 
                          ? formatCurrency(Number(p.monthly_investment || 0)) 
                          : formatCurrency(Number(p.one_time_investment || 0))}
                        <span className="text-[10px] block opacity-40 uppercase font-bold">
                          {p.contract_type === 'recurring' ? 'Mensal' : 'Avulso'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatCurrency(Number(p.total || 0))}
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border-none", s.cls)}>
                          <span className={cn("size-1.5 rounded-full", s.dot)} />
                          {s.label}
                          {summary && summary.viewCount > 0 && p.status === "Enviada" && (
                            <Eye className="size-3 ml-0.5" />
                          )}
                        </Badge>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <ActionsMenu
                          proposal={p}
                          isTrashed={showTrash}
                          onView={() => openView(p)}
                          onEdit={() => setSelectedId(p.id)}
                          onDuplicate={() => dupMut.mutate(p.id)}
                          onPdf={() => openPdf(p)}
                          onShare={() => copyLink(p)}
                          onWhatsApp={() => openWhatsApp(p)}
                          onEmail={() => openEmail(p)}
                          onReopen={() => statusMut.mutate({ id: p.id, status: "Rascunho" })}
                          onCancel={() => statusMut.mutate({ id: p.id, status: "Encerrada" })}
                          onRestore={() => restoreMut.mutate(p.id)}
                          onDelete={() => {
                            if (showTrash) {
                              if (confirm("Excluir permanentemente? Esta ação não pode ser desfeita.")) {
                                delMut.mutate({ id: p.id, permanent: true });
                              }
                            } else {
                              if (confirm("Mover para a lixeira?")) {
                                delMut.mutate({ id: p.id, permanent: false });
                              }
                            }
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
                {filteredProposals.map((p: Proposal) => {
                    const s = STATUS_LABELS[p.status] ?? STATUS_LABELS.Rascunho;
                    const summary = eventSummary.get(p.id);


              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono opacity-40">{p.number_display}</span>
                      </div>
                      <button
                        onClick={() => setSelectedId(p.id)}
                        className="font-semibold hover:text-primary text-left"
                      >
                        {p.title}
                      </button>
                    </div>
                    <ActionsMenu
                      proposal={p}
                      isTrashed={showTrash}
                      onView={() => openView(p)}
                      onEdit={() => setSelectedId(p.id)}
                      onDuplicate={() => dupMut.mutate(p.id)}
                      onPdf={() => openPdf(p)}
                      onShare={() => copyLink(p)}
                      onWhatsApp={() => openWhatsApp(p)}
                      onEmail={() => openEmail(p)}
                      onReopen={() => statusMut.mutate({ id: p.id, status: "Rascunho" })}
                      onCancel={() => statusMut.mutate({ id: p.id, status: "Encerrada" })}
                      onRestore={() => restoreMut.mutate(p.id)}
                      onDelete={() => {
                        if (showTrash) {
                          if (confirm("Excluir permanentemente? Esta ação não pode ser desfeita.")) {
                            delMut.mutate({ id: p.id, permanent: true });
                          }
                        } else {
                          if (confirm("Mover para a lixeira?")) {
                            delMut.mutate({ id: p.id, permanent: false });
                          }
                        }
                      }}
                    />
                  </div>
                  {p.client_id ? (
                    <Link 
                      to="/clientes/$clientId" 
                      params={{ clientId: p.client_id }}
                      className="text-xs text-foreground/60 mt-1 hover:text-primary hover:underline cursor-pointer transition-colors block w-fit"
                    >
                      {p.client_name}
                    </Link>
                  ) : (
                    <p className="text-xs text-foreground/60 mt-1">{p.client_name}</p>
                  )}
                  <div className="mt-1">
                    <ProposalStatusLine status={p.status} summary={summary} createdAt={p.created_at} />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Badge className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border-none", s.cls)}>
                      <span className={cn("size-1.5 rounded-full", s.dot)} />
                      {s.label}
                      {summary && summary.viewCount > 0 && p.status === "Enviada" && (
                        <Eye className="size-3 ml-0.5" />
                      )}
                    </Badge>

                    <div className="text-right">
                      <p className="text-[10px] text-foreground/40">{p.contract_type === 'recurring' ? 'Mensal' : 'Avulso'}</p>
                      <p className="text-sm font-semibold text-primary">
                        {p.contract_type === 'recurring' 
                          ? formatCurrency(Number(p.monthly_investment)) 
                          : formatCurrency(Number(p.one_time_investment))}
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
  isTrashed,
  onView,
  onEdit,
  onDuplicate,
  onPdf,
  onShare,
  onWhatsApp,
  onEmail,
  onReopen,
  onCancel,
  onRestore,
  onDelete,
}: {
  proposal: Proposal;
  isTrashed?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onPdf: () => void;
  onShare: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onReopen: () => void;
  onCancel: () => void;
  onRestore: () => void;
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
        {!isTrashed ? (
          <>
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
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" /> Mover para lixeira
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={onRestore}>
              <RotateCcw className="size-4" /> Restaurar Proposta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive font-bold"
            >
              <Trash2 className="size-4" /> Excluir permanentemente
            </DropdownMenuItem>
          </>
        )}
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
