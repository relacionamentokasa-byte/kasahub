import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProposalDetailSheet } from "@/components/proposals/ProposalDetailSheet";
import { useState } from "react";
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
  accepted: { label: "Aprovada", cls: "bg-green-500/15 text-green-300" },
  reopened: { label: "Reaberta", cls: "bg-purple-500/15 text-purple-300" },
  rejected: { label: "Recusada", cls: "bg-red-500/15 text-red-300" },
  cancelled: { label: "Cancelada", cls: "bg-red-500/15 text-red-300" },
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
  const [open, setOpen] = useState(false);
  const emptyForm = {
    title: "",
    target_kind: "client" as "client" | "lead",
    client_id: "",
    lead_id: "",
    client_name: "",
    client_email: "",
    service_type: "",
    valid_until: "",
    intro: "",
  };
  const [form, setForm] = useState(emptyForm);

  const [emailDialog, setEmailDialog] = useState<{ proposal: Proposal } | null>(null);
  const [emailForm, setEmailForm] = useState({ to: "", subject: "", message: "" });

  const createMut = useMutation({
    mutationFn: () =>
      createProposal({
        title: form.title,
        target_kind: form.target_kind,
        client_id: form.target_kind === "client" ? (form.client_id || null) : null,
        lead_id: form.target_kind === "lead" ? (form.lead_id || null) : null,
        client_name: form.client_name,
        client_email: form.client_email || null,
        intro: form.intro || null,
        service_type: form.service_type || null,
        valid_until: form.valid_until || null,
      }),
    onSuccess: async (p) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      setOpen(false);
      setForm(emptyForm);
      await recordProposalEvent(p.id, "created", { target_kind: form.target_kind });
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
          <DialogContent className="bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Nova proposta</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <Field label="Título *">
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Proposta · Marketing Performance Q1"
                  autoFocus
                />
              </Field>
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
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__free__">Cliente avulso (digitar)</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!form.client_id && (
                  <Input
                    className="mt-2"
                    placeholder="Nome do cliente"
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  />
                )}
              </Field>
              <Field label="E-mail do cliente">
                <Input
                  type="email"
                  value={form.client_email}
                  onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                />
              </Field>

              <Field label="Introdução">
                <Textarea
                  rows={3}
                  value={form.intro}
                  onChange={(e) => setForm({ ...form, intro: e.target.value })}
                  placeholder="Apresentação do escopo e dos objetivos…"
                />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
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

      {proposals.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <div className="size-14 rounded-2xl bg-primary/10 ring-1 ring-primary/30 grid place-items-center mx-auto mb-4">
            <FileText className="size-6 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold mb-1">Nenhuma proposta ainda</h2>
          <p className="text-foreground/60 text-sm">
            Crie sua primeira proposta ou gere uma a partir de um lead no CRM.
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
                {proposals.map((p) => {
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
            {proposals.map((p) => {
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
