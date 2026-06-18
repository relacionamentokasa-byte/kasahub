import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchBatchByToken, approveBatch, rejectBatch } from "@/lib/dme-batches-api";

export const Route = createFileRoute("/dme-lote/$token")({
  ssr: false,
  component: PublicBatchView,
});

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function PublicBatchView() {
  const { token } = useParams({ from: "/dme-lote/$token" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchBatchByToken>>>(null);
  const [signature, setSignature] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetchBatchByToken(token);
      setData(res);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar lote.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function handleApprove() {
    if (!signature.trim()) {
      toast.error("Digite seu nome completo para assinar.");
      return;
    }
    setBusy(true);
    try {
      await approveBatch(token, signature.trim());
      toast.success("Lote aprovado! Em breve enviaremos a cobrança consolidada.");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao aprovar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) {
      toast.error("Informe o motivo da recusa.");
      return;
    }
    setBusy(true);
    try {
      await rejectBatch(token, reason.trim());
      toast.success("Lote recusado.");
      setShowReject(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao recusar.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="size-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-semibold">Lote não encontrado</h1>
          <p className="text-sm text-slate-500 mt-2">Verifique se o link está correto.</p>
        </div>
      </div>
    );
  }

  const { batch, dmes } = data;
  const isApproved = batch.status === "approved";
  const isRejected = batch.status === "rejected";
  const isPending = batch.status === "pending";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">
                Solicitação de aprovação
              </p>
              <h1 className="text-2xl font-bold mt-1">Demandas Extras — Lote</h1>
              <p className="text-sm text-slate-500 mt-1">
                {batch.clients?.company || batch.clients?.name}
              </p>
            </div>
            {isApproved && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Aprovado</Badge>}
            {isRejected && <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Recusado</Badge>}
            {isPending && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Aguardando você</Badge>}
          </div>

          <div className="space-y-3 mb-6">
            {dmes.map((d: any) => (
              <div key={d.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">{d.number_display}</span>
                      <span className="font-medium">{d.title}</span>
                    </div>
                    {d.description && (
                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{d.description}</p>
                    )}
                    {d.due_date && (
                      <p className="text-xs text-slate-400 mt-2">
                        Prazo: {new Date(d.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <div className="text-right font-mono font-semibold">{brl(Number(d.value))}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-sm text-slate-500">Total a aprovar ({dmes.length} demandas)</span>
            <span className="text-2xl font-bold font-mono">{brl(Number(batch.total_value))}</span>
          </div>
        </div>

        {isApproved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-medium">Aprovado em {new Date(batch.approved_at!).toLocaleDateString("pt-BR")}</p>
            <p className="text-sm text-slate-600 mt-1">Você receberá a cobrança consolidada em breve.</p>
          </div>
        )}

        {isRejected && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <X className="size-10 text-red-500 mx-auto mb-2" />
            <p className="font-medium">Lote recusado</p>
            {batch.rejection_reason && (
              <p className="text-sm text-slate-600 mt-1">Motivo: {batch.rejection_reason}</p>
            )}
          </div>
        )}

        {isPending && !showReject && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                Digite seu nome completo para assinar a aprovação
              </label>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Seu nome completo"
                disabled={busy}
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                onClick={handleApprove}
                disabled={busy}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Aprovar todas as demandas
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-200"
                onClick={() => setShowReject(true)}
                disabled={busy}
              >
                <X className="size-4 mr-1" /> Recusar
              </Button>
            </div>
          </div>
        )}

        {isPending && showReject && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <label className="text-sm font-medium block">Motivo da recusa</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique brevemente o motivo..."
              rows={4}
              disabled={busy}
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowReject(false)} disabled={busy}>
                Voltar
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={handleReject}
                disabled={busy}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirmar recusa"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
