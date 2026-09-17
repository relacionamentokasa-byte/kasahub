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
  Rascunho: { label: "Rascunho", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  Enviada: { label: "Enviada", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20", dot: "bg-blue-500" },
  Aprovada: { label: "Aprovada", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20", dot: "bg-emerald-500" },
  Recusada: { label: "Recusada", cls: "bg-destructive/10 text-destructive border border-destructive/20", dot: "bg-destructive" },
  Encerrada: { label: "Encerrada", cls: "bg-muted text-muted-foreground border border-border/60", dot: "bg-muted-foreground" },
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

  // Métricas comerciais executivas
  const stats = useMemo(() => {
    const active = proposals.filter((p) => p.deleted_at === null);

    // Propostas Enviadas / Em negociação
    const sent = active.filter((p) => p.status === "Enviada");
    const sentMonthly = sent.reduce((acc, p) => acc + (p.contract_type === "recurring" ? Number(p.monthly_investment || 0) : 0), 0);
    const sentOneTime = sent.reduce((acc, p) => acc + (p.contract_type !== "recurring" ? Number(p.one_time_investment || 0) : 0), 0);
    const sentTotal = sent.reduce((acc, p) => acc + Number(p.total || 0), 0);

    // Propostas Aprovadas
    const approved = active.filter((p) => p.status === "Aprovada");
    const approvedMonthly = approved.reduce((acc, p) => acc + (p.contract_type === "recurring" ? Number(p.monthly_investment || 0) : 0), 0);
    const approvedTotal = approved.reduce((acc, p) => acc + Number(p.total || 0), 0);

    // Propostas Visualizadas pelo cliente
    const viewedCount = sent.filter((p) => {
      const s = eventSummary.get(p.id);
      return s && s.viewCount > 0;
    }).length;

    // Contagens para as abas rápidas
    const counts = {
      all: active.length,
      Enviada: sent.length,
      Aprovada: approved.length,
      Rascunho: active.filter((p) => p.status === "Rascunho").length,
      Recusada: active.filter((p) => p.status === "Recusada").length,
    };

    return {
      sentCount: sent.length,
      sentMonthly,
      sentOneTime,
      sentTotal,
      approvedCount: approved.length,
      approvedMonthly,
      approvedTotal,
      viewedCount,
      counts,
    };
  }, [proposals, eventSummary]);

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
        one_time_investment: form.one_time_investment || 0,
        total:
          form.contract_type === "mensal"
            ? form.monthly_investment * (
                form.contract_term === "3_months" ? 3 :
                form.contract_term === "6_months" ? 6 :
                form.contract_term === "12_months" ? 12 : 12
              ) + Number(form.one_time_investment || 0)
            : form.one_time_investment,
        contract_type: form.contract_type === "mensal" ? "recurring" : "one_time",
        payment_kind: form.contract_type === "mensal" ? "recurring" : "one_time",
        auto_create_jobs: false,
        contract_term: form.contract_term,
        installments: form.installments || 1,
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full mx-auto pb-20 md:pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <span className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block font-medium">Comercial · Propostas</span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight mt-0.5">
            {showTrash ? "Lixeira" : "Propostas"}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {showTrash
              ? "Gerencie e restaure propostas excluídas."
              : "Acompanhe e envie propostas comerciais com link seguro de assinatura."
            }
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowTrash(!showTrash)}
            className="flex-1 sm:flex-none rounded-md border-border/60 h-8 px-3 text-xs gap-1.5 font-mono-kasa"
          >
            {showTrash ? <ArrowUpRight className="size-3.5 rotate-180" /> : <Trash2 className="size-3.5" />}
            {showTrash ? "Voltar" : "Lixeira"}
          </Button>
          {!showTrash && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium h-8 px-3 text-xs gap-1.5 font-mono-kasa shadow-xs">
                  <Plus className="size-3.5 shrink-0" /> Nova proposta
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border/60 p-0 gap-0 w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] grid grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg shadow-xl">
                <DialogHeader className="px-5 py-4 border-b border-border/60 flex-row items-center justify-between space-y-0 sticky top-0 bg-card z-10">
                  <div>
                    <span className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block">
                      Nova Proposta
                    </span>
                    <DialogTitle className="font-display text-lg font-bold mt-0.5">
                      Criar Proposta Comercial
                    </DialogTitle>
                  </div>
                </DialogHeader>
                <div className="overflow-y-auto px-5 py-4 space-y-4">
                  <div className="space-y-3">
                    <Field label="Título da Proposta *">
                      <Input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Ex: Proposta · Marketing de Performance"
                        className="h-8 text-xs bg-muted/20 border-border/60"
                        autoFocus
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Destino">
                        <div className="flex items-center gap-1 p-0.5 bg-muted/40 border border-border/60 rounded h-8">
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                target_kind: "client",
                                client_id: "",
                                lead_id: "",
                                client_name: "",
                                client_email: "",
                              })
                            }
                            className={cn(
                              "flex-1 h-full text-xs font-mono-kasa rounded transition-colors cursor-pointer",
                              form.target_kind === "client"
                                ? "bg-card text-foreground font-semibold shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Cliente
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                target_kind: "lead",
                                client_id: "",
                                lead_id: "",
                                client_name: "",
                                client_email: "",
                              })
                            }
                            className={cn(
                              "flex-1 h-full text-xs font-mono-kasa rounded transition-colors cursor-pointer",
                              form.target_kind === "lead"
                                ? "bg-card text-foreground font-semibold shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            Lead (CRM)
                          </button>
                        </div>
                      </Field>

                      {form.target_kind === "client" ? (
                        <Field label="Cliente da Base *">
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
                            <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/60 cursor-pointer">
                              <SelectValue placeholder="Selecione o cliente" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__free__" className="text-xs cursor-pointer">Digitar nome manual...</SelectItem>
                              {clients.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer">{c.company || c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      ) : (
                        <Field label="Lead do CRM *">
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
                            <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/60 cursor-pointer">
                              <SelectValue placeholder="Selecione o lead" />
                            </SelectTrigger>
                            <SelectContent>
                              {leads.map((l) => (
                                <SelectItem key={l.id} value={l.id} className="text-xs cursor-pointer">
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
                          className="h-8 text-xs bg-muted/20 border-border/60"
                        />
                      </Field>
                    )}

                    <Field label="Serviços Contratados *">
                      <ServicesMultiSelect
                        value={form.service_ids}
                        onChange={(ids) => {
                          const oldIds = form.service_ids;
                          const newIds = ids;

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

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
                      <Field label="Tipo de Contrato *">
                        <Select
                          value={form.contract_type}
                          onValueChange={(v: "mensal" | "avulso") =>
                            setForm({ ...form, contract_type: v })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs font-mono-kasa bg-muted/20 border-border/60 cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mensal" className="text-xs font-mono-kasa cursor-pointer">Mensal / Recorrente</SelectItem>
                            <SelectItem value="avulso" className="text-xs font-mono-kasa cursor-pointer">Job Avulso</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      {form.contract_type === "mensal" ? (
                        <Field label="Investimento Mensal (MRR) *">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono-kasa text-xs">R$</span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={form.monthly_investment || ""}
                              onChange={(e) =>
                                setForm({ ...form, monthly_investment: parseFloat(e.target.value) || 0 })
                              }
                              className="pl-8 h-8 text-xs font-mono-kasa tabular-nums bg-muted/20 border-border/60"
                            />
                          </div>
                        </Field>
                      ) : (
                        <Field label="Investimento Total *">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono-kasa text-xs">R$</span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={form.one_time_investment || ""}
                              onChange={(e) =>
                                setForm({ ...form, one_time_investment: parseFloat(e.target.value) || 0 })
                              }
                              className="pl-8 h-8 text-xs font-mono-kasa tabular-nums bg-muted/20 border-border/60"
                            />
                          </div>
                        </Field>
                      )}
                    </div>

                    {form.contract_type === "mensal" && (
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Prazo Contratual">
                          <Select
                            value={form.contract_term}
                            onValueChange={(v) => setForm({ ...form, contract_term: v })}
                          >
                            <SelectTrigger className="h-8 text-xs font-mono-kasa bg-muted/20 border-border/60 cursor-pointer">
                              <SelectValue placeholder="Selecione o prazo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly" className="text-xs font-mono-kasa cursor-pointer">Sem prazo (Recorrente aberto)</SelectItem>
                              <SelectItem value="3_months" className="text-xs font-mono-kasa cursor-pointer">3 meses</SelectItem>
                              <SelectItem value="6_months" className="text-xs font-mono-kasa cursor-pointer">6 meses</SelectItem>
                              <SelectItem value="12_months" className="text-xs font-mono-kasa cursor-pointer">12 meses (Anual)</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Setup / Implantação (Opcional)">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono-kasa text-xs">R$</span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={form.one_time_investment || ""}
                              onChange={(e) =>
                                setForm({ ...form, one_time_investment: parseFloat(e.target.value) || 0 })
                              }
                              className="pl-8 h-8 text-xs font-mono-kasa tabular-nums bg-muted/20 border-border/60"
                            />
                          </div>
                        </Field>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter className="px-5 py-3 border-t border-border/60 bg-card sticky bottom-0 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen(false)}
                    className="h-8 px-3 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!form.title || !form.client_name || createMut.isPending}
                    onClick={() => createMut.mutate()}
                    className="h-8 px-3 text-xs font-mono-kasa"
                  >
                    Salvar rascunho
                  </Button>
                  <Button
                    size="sm"
                    disabled={!form.title || !form.client_name || createMut.isPending}
                    onClick={() => createMut.mutate()}
                    className="h-8 px-3.5 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 font-mono-kasa"
                  >
                    {createMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Criar e editar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!showTrash && (
        <>
          {/* Métricas Executivas Comerciais - Grid 2x2 no Mobile e 4 cols no Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
            {/* Card 1: Em Negociação */}
            <div className="bg-card border border-border/60 rounded-xl p-2.5 sm:p-3.5 shadow-xs">
              <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
                Em Negociação
              </span>
              <div className="mt-0.5 sm:mt-1 font-mono-kasa text-sm sm:text-xl font-bold text-foreground tabular-nums truncate">
                {formatCurrency(stats.sentMonthly)}
                <span className="text-[10px] sm:text-xs font-normal text-muted-foreground ml-0.5">/mês</span>
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa truncate">
                <span>{stats.sentCount} {stats.sentCount === 1 ? 'proposta' : 'propostas'}</span>
                {stats.sentOneTime > 0 && (
                  <span> · +{formatCurrency(stats.sentOneTime)} avulso</span>
                )}
              </div>
            </div>

            {/* Card 2: Aprovadas (Contratado) */}
            <div className="bg-card border border-border/60 rounded-xl p-2.5 sm:p-3.5 shadow-xs">
              <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
                Aprovadas (MRR)
              </span>
              <div className="mt-0.5 sm:mt-1 font-mono-kasa text-sm sm:text-xl font-bold text-foreground tabular-nums truncate">
                {formatCurrency(stats.approvedMonthly)}
                <span className="text-[10px] sm:text-xs font-normal text-muted-foreground ml-0.5">/mês</span>
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa truncate">
                {stats.approvedCount} {stats.approvedCount === 1 ? 'fechada' : 'fechadas'}
              </div>
            </div>

            {/* Card 3: Engajamento / Visualizações */}
            <div className="bg-card border border-border/60 rounded-xl p-2.5 sm:p-3.5 shadow-xs">
              <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
                Visualizadas
              </span>
              <div className="mt-0.5 sm:mt-1 font-mono-kasa text-sm sm:text-xl font-bold text-foreground tabular-nums truncate">
                {stats.viewedCount}
                <span className="text-[10px] sm:text-xs font-normal text-muted-foreground ml-0.5">/ {stats.sentCount}</span>
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa truncate">
                {stats.sentCount > 0 ? `${Math.round((stats.viewedCount / stats.sentCount) * 100)}% leitura` : "Nenhuma enviada"}
              </div>
            </div>

            {/* Card 4: Volume Total em Propostas */}
            <div className="bg-card border border-border/60 rounded-xl p-2.5 sm:p-3.5 shadow-xs">
              <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-mono-kasa block truncate">
                Volume Pipeline
              </span>
              <div className="mt-0.5 sm:mt-1 font-mono-kasa text-sm sm:text-xl font-bold text-foreground tabular-nums truncate">
                {formatCurrency(stats.sentTotal)}
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa truncate">
                Contratos + setups
              </div>
            </div>
          </div>

          {/* Abas Rápidas de Status + Barra de Busca e Filtro */}
          <div className="space-y-3 mb-6">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar border-b border-border/60">
              {[
                { key: "all", label: "Todas", count: stats.counts.all },
                { key: "Enviada", label: "Enviadas", count: stats.counts.Enviada },
                { key: "Aprovada", label: "Aprovadas", count: stats.counts.Aprovada },
                { key: "Rascunho", label: "Rascunhos", count: stats.counts.Rascunho },
                { key: "Recusada", label: "Recusadas", count: stats.counts.Recusada },
              ].map((tab) => {
                const isActive = filterStatus === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilterStatus(tab.key)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer border-b-2 -mb-px",
                      isActive
                        ? "border-foreground text-foreground font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded text-[10px] font-mono-kasa tabular-nums",
                        isActive
                          ? "bg-foreground/10 text-foreground font-bold"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Barra de Busca + Filtro de Clientes */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="relative w-full sm:flex-1">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título ou cliente..."
                  className="pl-8 h-8 text-xs bg-card border-border/60 rounded-md w-full"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="h-8 text-xs bg-card border-border/60 rounded-md w-full sm:w-52 cursor-pointer">
                    <SelectValue placeholder="Todos os Clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer text-xs">Todos os Clientes</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="cursor-pointer text-xs">{c.company || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(search || filterStatus !== "all" || filterClient !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 px-2.5 text-muted-foreground hover:text-foreground gap-1.5 rounded-md text-xs shrink-0 cursor-pointer"
                  >
                    <XCircle className="size-3.5" />
                    <span>Limpar</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {filteredProposals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-12 text-center">
          <div className="size-10 rounded-md bg-muted border border-border/60 grid place-items-center mx-auto mb-3 text-muted-foreground">
            <Search className="size-4" />
          </div>
          <h2 className="font-mono-kasa text-sm font-semibold uppercase tracking-wider mb-1 text-foreground">
            {showTrash
              ? "Lixeira vazia"
              : "Nenhuma proposta encontrada"
            }
          </h2>
          <p className="text-muted-foreground text-xs max-w-sm mx-auto mb-4">
            {showTrash
              ? "Propostas excluídas aparecerão aqui para serem restauradas."
              : (search || filterStatus !== "all" || filterClient !== "all"
                ? "Nenhum resultado para os filtros aplicados."
                : "Nenhuma proposta criada até o momento.")
            }
          </p>
          {(search || filterStatus !== "all" || filterClient !== "all") && !showTrash && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-3 text-xs gap-1.5"
            >
              <RotateCcw className="size-3.5" /> Limpar Filtros
            </Button>
          )}
        </div>
      ) : (

        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border border-border/60 bg-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase font-mono-kasa tracking-wider text-muted-foreground border-b border-border/60 bg-muted/30">
                  <th className="px-4 py-2.5 w-16 font-medium">Nº</th>
                  <th className="px-4 py-2.5 font-medium">Proposta</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 text-right font-medium">Investimento</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total Contrato</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right w-20 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredProposals.map((p: Proposal) => {
                  const s = STATUS_LABELS[p.status] ?? STATUS_LABELS.Rascunho;
                  const summary = eventSummary.get(p.id);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono-kasa text-[11px] text-muted-foreground tabular-nums">
                        {p.number_display || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedId(p.id)}
                          className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1 text-left cursor-pointer"
                        >
                          {p.title}
                          <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                        </button>
                        <div className="mt-0.5">
                          <ProposalStatusLine status={p.status} summary={summary} createdAt={p.created_at} />
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {p.client_id ? (
                          <Link
                            to="/clientes/$clientId"
                            params={{ clientId: p.client_id }}
                            data-testid="client-link"
                            className="text-foreground hover:underline cursor-pointer transition-colors"
                          >
                            {p.client_name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{p.client_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-kasa tabular-nums">
                        <span className="font-semibold text-foreground">
                          {p.contract_type === 'recurring'
                            ? formatCurrency(Number(p.monthly_investment || 0))
                            : formatCurrency(Number(p.one_time_investment || 0))}
                        </span>
                        <span className="text-[10px] block text-muted-foreground uppercase font-mono-kasa">
                          {p.contract_type === 'recurring' ? 'Mensal' : 'Avulso'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-kasa tabular-nums text-foreground font-medium">
                        {(() => {
                          const months = Number((p as any).recurring_months || 0);
                          const baseMonthly = Number(p.monthly_investment || 0);
                          const setup = Number(p.one_time_investment || 0);
                          const adjs: any[] = Array.isArray((p as any).scheduled_adjustments) ? (p as any).scheduled_adjustments : [];
                          const sorted = [...adjs].filter(a => a && Number(a.from_month) > 0).sort((a, b) => Number(a.from_month) - Number(b.from_month));
                          let recurringTotal = 0;
                          if (months > 0 && baseMonthly > 0) {
                            for (let m = 1; m <= months; m++) {
                              const match = [...sorted].reverse().find(a => Number(a.from_month) <= m);
                              recurringTotal += match ? Number(match.value || 0) : baseMonthly;
                            }
                          }
                          const grand = recurringTotal + setup || Number(p.total || 0);
                          return formatCurrency(grand);
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-mono-kasa tracking-wider font-semibold", s.cls)}>
                          <span className={cn("size-1.5 rounded-full", s.dot)} />
                          {s.label}
                          {summary && summary.viewCount > 0 && p.status === "Enviada" && (
                            <Eye className="size-3 ml-0.5" />
                          )}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!showTrash && (
                            <>
                              <button
                                onClick={() => copyLink(p)}
                                title="Copiar link da proposta"
                                className="size-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                              >
                                <Share2 className="size-3.5" />
                              </button>
                              <button
                                onClick={() => openWhatsApp(p)}
                                title="Enviar via WhatsApp"
                                className="size-7 grid place-items-center rounded-md text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                              >
                                <MessageCircle className="size-3.5" />
                              </button>
                            </>
                          )}
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5">
            {filteredProposals.map((p: Proposal) => {
              const s = STATUS_LABELS[p.status] ?? STATUS_LABELS.Rascunho;
              const summary = eventSummary.get(p.id);

              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono-kasa text-muted-foreground tabular-nums">
                          {p.number_display || "PROPOSTA"}
                        </span>
                        <Badge className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-mono-kasa font-semibold", s.cls)}>
                          <span className={cn("size-1 rounded-full", s.dot)} />
                          {s.label}
                          {summary && summary.viewCount > 0 && p.status === "Enviada" && (
                            <Eye className="size-2.5 ml-0.5" />
                          )}
                        </Badge>
                      </div>
                      <button
                        onClick={() => setSelectedId(p.id)}
                        className="font-medium text-foreground hover:text-primary text-left text-xs line-clamp-1 block w-full"
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
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer transition-colors block truncate w-fit"
                    >
                      {p.client_name}
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground truncate">{p.client_name}</p>
                  )}

                  <div className="text-[11px]">
                    <ProposalStatusLine status={p.status} summary={summary} createdAt={p.created_at} />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="flex items-center gap-1.5">
                      {!showTrash && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyLink(p)}
                            className="h-7 px-2 text-[11px] font-mono-kasa gap-1 rounded-md border-border/60"
                          >
                            <Share2 className="size-3 text-muted-foreground" /> Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openWhatsApp(p)}
                            className="h-7 px-2 text-[11px] font-mono-kasa gap-1 rounded-md border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <MessageCircle className="size-3" /> WhatsApp
                          </Button>
                        </>
                      )}
                    </div>

                    <div className="text-right font-mono-kasa">
                      <p className="text-[9px] text-muted-foreground uppercase">
                        {p.contract_type === 'recurring' ? 'Mensal' : 'Avulso'}
                      </p>
                      <p className="text-xs font-bold text-foreground tabular-nums">
                        {p.contract_type === 'recurring'
                          ? formatCurrency(Number(p.monthly_investment || 0))
                          : formatCurrency(Number(p.one_time_investment || 0))}
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
