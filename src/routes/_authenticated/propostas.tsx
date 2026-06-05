import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchProposals,
  createProposal,
  deleteProposal,
  formatCurrency,
} from "@/lib/crm-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Trash2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/propostas")({
  head: () => ({ meta: [{ title: "Propostas — KASA OS" }] }),
  component: ProposalsPage,
});

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-foreground/10 text-foreground/70" },
  sent: { label: "Enviada", cls: "bg-blue-500/15 text-blue-300" },
  viewed: { label: "Visualizada", cls: "bg-amber-500/15 text-amber-300" },
  accepted: { label: "Aceita", cls: "bg-green-500/15 text-green-300" },
  rejected: { label: "Recusada", cls: "bg-red-500/15 text-red-300" },
};

function ProposalsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: proposals = [] } = useQuery({ queryKey: ["proposals"], queryFn: fetchProposals });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", client_name: "", client_email: "", intro: "" });

  const createMut = useMutation({
    mutationFn: () =>
      createProposal({
        title: form.title,
        client_name: form.client_name,
        client_email: form.client_email || null,
        intro: form.intro || null,
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      setOpen(false);
      navigate({ to: "/propostas/$proposalId", params: { proposalId: p.id } });
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

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <span className="text-primary text-[10px] capitalize">
            Comercial · Propostas
          </span>
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
                <Input
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                />
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
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] capitalize text-foreground/50 border-b border-border">
                <th className="px-5 py-3">Proposta</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3 text-right">Mensal</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
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
                      <Link
                        to="/propostas/$proposalId"
                        params={{ proposalId: p.id }}
                        className="font-semibold hover:text-primary flex items-center gap-1"
                      >
                        {p.title}
                        <ArrowUpRight className="size-3.5 opacity-60" />
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-foreground/70">{p.client_name}</td>
                    <td className="px-5 py-3 text-right text-primary">
                      {formatCurrency(Number(p.monthly_investment))}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {formatCurrency(Number(p.total))}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm("Excluir proposta?")) delMut.mutate(p.id);
                        }}
                        className="text-foreground/40 hover:text-destructive transition"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] capitalize text-foreground/60">
        {label}
      </Label>
      {children}
    </div>
  );
}
