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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/propostas/$proposalId")({
  head: () => ({ meta: [{ title: "Editor de proposta — KASA OS" }] }),
  component: ProposalEditor,
});

function ProposalEditor() {
  const { proposalId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: proposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId),
  });
  const { data: items = [] } = useQuery({
    queryKey: ["proposal", proposalId, "items"],
    queryFn: () => fetchProposalItems(proposalId),
  });

  const [form, setForm] = useState({
    title: "",
    client_name: "",
    client_email: "",
    intro: "",
    valid_until: "",
    status: "draft",
  });

  useEffect(() => {
    if (proposal) {
      setForm({
        title: proposal.title,
        client_name: proposal.client_name,
        client_email: proposal.client_email ?? "",
        intro: proposal.intro ?? "",
        valid_until: proposal.valid_until ?? "",
        status: proposal.status,
      });
    }
  }, [proposal]);

  const totals = useMemo(() => recalcProposalTotals(items), [items]);

  const saveMut = useMutation({
    mutationFn: () =>
      updateProposal(proposalId, {
        title: form.title,
        client_name: form.client_name,
        client_email: form.client_email || null,
        intro: form.intro || null,
        valid_until: form.valid_until || null,
        status: form.status,
        monthly_investment: totals.monthly_investment,
        one_time_investment: totals.one_time_investment,
        total: totals.total,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const itemMut = useMutation({
    mutationFn: (item: Partial<ProposalItem> & { proposal_id: string; title: string }) =>
      upsertProposalItem(item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal", proposalId, "items"] }),
  });
  const delItemMut = useMutation({
    mutationFn: (id: string) => deleteProposalItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal", proposalId, "items"] }),
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

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => navigate({ to: "/propostas" })}
          className="text-sm text-foreground/60 hover:text-primary flex items-center gap-2"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyShareLink} className="gap-2">
            <Copy className="size-4" /> Copiar link
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setForm((f) => ({ ...f, status: "sent" }));
              setTimeout(() => saveMut.mutate(), 0);
            }}
            className="gap-2"
          >
            <Send className="size-4" /> Marcar como enviada
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2"
          >
            <Save className="size-4" /> Salvar
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <span className="text-primary text-[10px] font-mono uppercase tracking-[0.25em]">
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
              <div className="grid grid-cols-2 gap-3">
                <F label="Cliente">
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
                    </SelectContent>
                  </Select>
                </F>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-primary text-[10px] font-mono uppercase tracking-[0.25em]">
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
          <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 sticky top-6">
            <span className="text-primary text-[10px] font-mono uppercase tracking-[0.25em]">
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

          <div className="rounded-2xl border border-border bg-surface p-5 text-xs text-foreground/60">
            <p className="font-mono uppercase tracking-wider text-[10px] text-foreground/40 mb-2">
              Link público
            </p>
            <Link
              to="/propostas"
              className="font-mono text-[11px] break-all text-primary hover:underline"
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
  useEffect(() => setLocal(item), [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function commit(patch: Partial<ProposalItem>) {
    const merged = { ...local, ...patch };
    setLocal(merged);
    onChange(patch);
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-center bg-background/40 border border-border rounded-lg p-2">
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
        className="col-span-3 h-9 text-right font-mono"
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
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wider font-mono text-foreground/50">
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
