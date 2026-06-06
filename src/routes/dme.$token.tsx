import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, Clock, AlertCircle, FileText, Calendar, DollarSign, Download, Share2, MessageSquare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/dme/$token")({
  component: PublicDmeView,
});

function PublicDmeView() {
  const { token } = useParams({ from: "/dme/$token" });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchDme();
  }, [token]);

  async function fetchDme() {
    try {
      const res = await fetch(`/api/public/dme/${token}`);
      if (!res.ok) throw new Error("Não encontrado");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar DME");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`/api/public/dme/${token}`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao aprovar");
      toast.success("Demanda aprovada com sucesso!");
      fetchDme(); // refresh
    } catch (e) {
      toast.error("Erro ao aprovar demanda");
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-slate-400 animate-pulse font-mono uppercase tracking-widest text-xs">Carregando detalhes...</div>
      </div>
    );
  }

  if (!data || !data.dme) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div>
          <AlertCircle className="size-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900">Demanda não encontrada</h1>
          <p className="text-slate-500 mt-2">O link pode ter expirado ou está incorreto.</p>
        </div>
      </div>
    );
  }

  const { dme, agency } = data;
  const isApproved = dme.status === "approved" || dme.status === "aprovada" || dme.status === "in_production" || dme.status === "completed";

  const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-6">
      <div className="max-w-2xl w-full">
        {/* Header/Logo */}
        <div className="flex flex-col items-center mb-10 text-center">
          {agency?.logo_url ? (
            <img src={agency.logo_url} alt={agency.name} className="h-12 object-contain mb-6" />
          ) : (
            <div className="text-2xl font-bold tracking-tighter mb-6">{agency?.name || "KASA ERP"}</div>
          )}
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm mb-4">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Solicitação de Aprovação</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 leading-tight">
            {dme.title}
          </h1>
          <p className="text-slate-500 mt-2">
            Referente ao contrato: <span className="font-semibold text-primary">{dme.contracts?.title}</span>
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 lg:p-12">
            <div className="flex items-center justify-between mb-8">
              <div className="text-[11px] font-mono font-bold text-primary tracking-tighter bg-primary/5 px-3 py-1 rounded-lg">
                DME {dme.number_display}
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg ${
                isApproved ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}>
                {isApproved ? "Aprovada" : "Aguardando sua Aprovação"}
              </div>
            </div>

            <div className="prose prose-slate max-w-none">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-4">Descrição da Demanda</h3>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {dme.description || "Nenhuma descrição detalhada fornecida."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-12 pt-8 border-t border-slate-100">
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
                  <DollarSign className="size-3" /> Investimento
                </div>
                <div className="text-2xl font-display font-bold text-slate-900">{BRL(Number(dme.value))}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5">
                  <Calendar className="size-3" /> Prazo de Entrega
                </div>
                <div className="text-2xl font-display font-bold text-slate-900">{dme.deadline_days} Dias Úteis</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50/50 border-t border-slate-100 p-8 lg:p-12 flex flex-col items-center">
            {isApproved ? (
              <div className="text-center">
                <div className="size-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                  <Check className="size-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Demanda Aprovada!</h3>
                <p className="text-slate-500 mt-1">Já enviamos para nossa equipe de produção.</p>
                {dme.approved_at && (
                  <div className="text-[10px] text-slate-400 uppercase mt-4">
                    Aprovada em {new Date(dme.approved_at).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full max-w-sm text-center">
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  Ao clicar em aprovar, você confirma que está de acordo com o escopo, valor e prazo descritos acima.
                </p>
                <Button 
                  onClick={handleApprove} 
                  disabled={approving}
                  className="w-full h-14 rounded-2xl text-base font-bold uppercase tracking-widest shadow-xl shadow-primary/20 gap-3"
                >
                  {approving ? (
                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-5" />
                  )}
                  Aprovar Demanda
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
            {agency?.name} · {agency?.email}
          </p>
        </div>
      </div>
    </div>
  );
}
