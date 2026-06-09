import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { replaceContractVariables } from "@/lib/contracts-api";
import { CheckCircle2, Printer, FileSignature, Loader2, Mail, Phone, Building2, User as UserIcon, AlertCircle, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import SignatureCanvas from 'react-signature-canvas';
import { useRef } from "react";
import { toast } from "sonner";
import { ScopeRenderer } from "@/components/proposals/ScopeRenderer";


export const Route = createFileRoute("/p/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Proposta Comercial" }] }),
  component: PublicProposalView,
});

type Item = {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  recurrence: string;
  deliverables?: string[] | null;
};
type Proposal = {
  id: string;
  title: string;
  client_name: string;
  client_email: string | null;
  intro: string | null;
  monthly_investment: number;
  one_time_investment: number;
  total: number;
  currency: string;
  status: string;
  valid_until: string | null;
  accepted_at: string | null;
  accepted_name: string | null;
  public_token: string;
  scope: string[] | null;
  scope_text?: string | null;
  recurring_months?: number | null;
  installments?: number | null;
  payment_method?: string | null;
  contract_content?: string | null;
  signature_agency?: string | null;
  signature_client?: string | null;
  signed_at_agency?: string | null;
  signed_at_client?: string | null;
  client_cpf?: string | null;
  client_role?: string | null;
  client_signed_email?: string | null;
  client_signature_data?: string | null;
  signed_metadata?: any | null;
  accepted_ip?: string | null;
  accepted_user_agent?: string | null;
  contract_type: string;
  contract_term: string | null;
  first_due_date: string | null;
  billing_day: number;
};
type Agency = {
  name: string;
  logo_url: string | null;
  logo_proposals_url: string | null;
  brand_primary: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  document: string | null;
  address: string | null;
  agency_signature_url: string | null;
} | null;
type Client = {
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
} | null;


function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    Number(value || 0),
  );
}

function PublicProposalView() {
  const { token } = Route.useParams();
  const [data, setData] = useState<{
    proposal: Proposal;
    items: Item[];
    agency: Agency;
    client: Client;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerCpf, setSignerCpf] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptRepresentation, setAcceptRepresentation] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const sigPad = useRef<SignatureCanvas>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/proposal/${token}`);
      if (res.status === 404) {
        setErrorCode("not_found");
        return;
      }
      if (!res.ok) {
        setErrorCode("generic");
        return;
      }
      const json = await res.json();
      setData(json);
      setErrorCode(null);
    } catch {
      setErrorCode("generic");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("print=1")) {
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, [data]);

  const brand = data?.agency?.brand_primary ?? "#FFBC45";

  async function sign() {
    if (!signerName.trim() || signerName.trim().length < 2) {
      toast.error("Informe seu nome completo");
      return;
    }
    if (!signerCpf.trim() || signerCpf.replace(/\D/g, "").length < 11) {
      toast.error("Informe um CPF válido");
      return;
    }
    if (!signerRole.trim()) {
      toast.error("Informe seu cargo");
      return;
    }
    if (!signerEmail.trim() || !signerEmail.includes("@")) {
      toast.error("Informe um e-mail válido");
      return;
    }
    if (sigPad.current?.isEmpty()) {
      toast.error("Você precisa desenhar sua assinatura");
      return;
    }
    if (!acceptTerms) {
      toast.error("Você precisa concordar com os termos");
      return;
    }
    if (!acceptRepresentation) {
      toast.error("Você precisa declarar que possui poderes para representar a empresa");
      return;
    }

    const signatureData = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');

    setSigning(true);
    try {
      const res = await fetch(`/api/public/proposal/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accepted_name: signerName.trim(),
          accepted_cpf: signerCpf.trim(),
          accepted_role: signerRole.trim(),
          accepted_email: signerEmail.trim(),
          signature_data: signatureData,
          accepted_terms: true,
          accepted_representation: true,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === "cancelled") throw new Error("Esta proposta não está mais disponível.");
        if (j.error === "already_accepted") throw new Error("Esta proposta já foi aprovada.");
        throw new Error(j.error || "Esta proposta não pode ser aprovada sem a assinatura do cliente.");
      }
      toast.success("Proposta aprovada e assinada com sucesso!");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSigning(false);
    }
  }


  const grouped = useMemo(() => {
    if (!data) return { monthly: [], one_time: [] };
    return {
      monthly: data.items.filter((i) => i.recurrence === "monthly"),
      one_time: data.items.filter((i) => i.recurrence !== "monthly"),
    };
  }, [data]);

  const contractContent = useMemo(() => {
    if (!data?.proposal || !data?.proposal.contract_content) return null;
    const { proposal, agency } = data;
    const rawContractContent = proposal.contract_content;
    return replaceContractVariables(rawContractContent as string, {
      client_name: proposal.client_name,
      client_legal_name: proposal.client_name,
      client_document: agency?.document || "",
      client_address: agency?.address || "",
      client_email: proposal.client_email || "",
      client_phone: agency?.phone || "",
      services_list: (proposal.scope || []).join(", "),
      monthly_value: formatCurrency(proposal.monthly_investment),
      setup_value: formatCurrency(proposal.one_time_investment),
      total_value: formatCurrency(
        (proposal.monthly_investment * (proposal.recurring_months || 12)) + proposal.one_time_investment,
      ),
      payment_method:
        proposal.payment_method === "credit_card"
          ? "Cartão de Crédito"
          : proposal.payment_method === "pix"
            ? "PIX"
            : proposal.payment_method === "transfer"
              ? "Transferência"
              : "Boleto",
      contract_term: proposal.contract_term === "indeterminado" 
        ? "Prazo Indeterminado" 
        : proposal.contract_term === "monthly" 
          ? "Mensal"
          : proposal.contract_term?.includes("_months")
            ? `${proposal.contract_term.replace("_months", "")} meses`
            : `${proposal.recurring_months || 12} meses`,
      start_date: proposal.first_due_date 
        ? new Date(proposal.first_due_date).toLocaleDateString("pt-BR") 
        : new Date().toLocaleDateString("pt-BR"),
      due_day: String(proposal.billing_day || 5),
      installments: String(proposal.installments || 1),
    });
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-white text-slate-600">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-slate-300" />
          <p className="text-xs uppercase tracking-widest font-bold opacity-40">Carregando Proposta...</p>
        </div>
      </div>
    );
  }
  if (errorCode || !data) {
    const isNotFound = errorCode === "not_found";
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-600 px-6 text-center">
        <div className="max-w-md p-10 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50">
          <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="size-8 text-slate-300" />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Proposta indisponível</h1>
          <p className="text-sm mt-3 text-slate-500 leading-relaxed">
            {isNotFound 
              ? "Esta proposta não foi encontrada ou o link expirou." 
              : "Não foi possível carregar esta proposta no momento. Verifique sua conexão e tente novamente."}
          </p>
          {!isNotFound && (
            <Button onClick={() => window.location.reload()} className="mt-8 h-12 px-8 rounded-full bg-slate-900 text-white hover:bg-slate-800">
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    );
  }

  const { proposal, agency, client } = data;
  const accepted = proposal.status === "accepted" || proposal.status === "signed" || proposal.status === "converted";
  const cancelled = proposal.status === "cancelled";

  if (cancelled) {
    return (
      <div className="min-h-screen grid place-items-center bg-white text-slate-600 px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-slate-900">Proposta cancelada</p>
          <p className="text-sm mt-2">Esta proposta não está mais disponível.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef] text-[#0c1618] font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;600;700&family=Onest:wght@400;500;600;700&display=swap');
        
        .font-display { font-family: 'Funnel Display', sans-serif; }
        .font-sans { font-family: 'Onest', sans-serif; }

        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Sticky Header */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="h-1 bg-[#ffbc45] w-full" />
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="size-10 bg-[#0c1618] flex items-center justify-center rounded-lg">
                <span className="text-[#ffbc45] font-bold text-xs">ka/sə</span>
             </div>
             <span className="text-lg font-bold">KASA <span className="text-[#ffbc45]">HUB</span></span>
           </div>
           <Button
             variant="outline"
             size="sm"
             onClick={() => window.print()}
             className="gap-2 rounded-full px-4 border-slate-200"
           >
             <Printer className="size-4" /> Exportar PDF
           </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm relative overflow-hidden mb-8">
           <div className="absolute inset-y-0 right-0 w-1/3 bg-[#ffbc45]/6 -rotate-12 transform origin-top-right" />
           
           <div className="flex justify-end gap-2 mb-8 relative z-10">
             <div className="px-3 py-1 bg-yellow-50 border border-[#ffbc45] text-[#b45309] text-[10px] font-bold uppercase tracking-widest rounded-full">Proposta Comercial</div>
             <div className={`px-3 py-1 border text-[10px] font-bold uppercase tracking-widest rounded-full ${accepted ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                {accepted ? "Proposta Aprovada" : "Aguardando Assinatura"}
             </div>
           </div>

           <div className="text-right text-xs text-slate-500 mb-6 relative z-10">
             <p>Emitida em {new Date().toLocaleDateString("pt-BR")}</p>
             {proposal.valid_until && <p>Validade: {new Date(proposal.valid_until).toLocaleDateString("pt-BR")}</p>}
           </div>

           <h1 className="font-display text-4xl font-bold mb-6 text-[#0c1618] relative z-10">{proposal.title}</h1>
           <div className="flex items-center gap-3 relative z-10">
             <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">{proposal.client_name.substring(0, 2)}</div>
             <p className="text-sm text-slate-600">Preparada para <span className="font-bold text-[#0c1618]">{proposal.client_name}</span></p>
           </div>
        </div>

        {/* Dados do Contratante */}
        <div className="bg-white p-8 rounded-3xl shadow-sm mb-8">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#ffbc45] mb-6">
            Dados do Contratante
            <div className="w-12 h-0.5 bg-[#ffbc45] mt-2"></div>
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-[#0c1618]">
            <div className="bg-[#f9f7f3] border border-[#ece8e0] p-4 rounded-xl flex items-center gap-3">
               <UserIcon className="size-5 text-[#ffbc45]" />
               <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Nome</p>
                  <p className="font-bold">{client?.name || proposal.client_name}</p>
               </div>
            </div>
            <div className="bg-[#f9f7f3] border border-[#ece8e0] p-4 rounded-xl flex items-center gap-3">
               <Building2 className="size-5 text-[#ffbc45]" />
               <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Empresa</p>
                  <p className="font-bold">{client?.company || '—'}</p>
               </div>
            </div>
            <div className="bg-[#f9f7f3] border border-[#ece8e0] p-4 rounded-xl flex items-center gap-3">
               <Phone className="size-5 text-[#ffbc45]" />
               <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Telefone</p>
                  <p className="font-bold">{client?.phone || '—'}</p>
               </div>
            </div>
            <div className="bg-[#f9f7f3] border border-[#ece8e0] p-4 rounded-xl flex items-center gap-3">
               <Mail className="size-5 text-[#ffbc45]" />
               <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">E-mail</p>
                  <p className="font-bold">{client?.email || proposal.client_email || '—'}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Escopo & Serviços */}
        <div className="bg-white p-8 rounded-3xl shadow-sm mb-8">
           <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#ffbc45] mb-6">
            Escopo & Serviços
            <div className="w-12 h-0.5 bg-[#ffbc45] mt-2"></div>
           </h2>
           <div className="bg-[#f9f7f3] p-6 rounded-2xl">
              <ScopeRenderer text={proposal.scope_text} fallback={proposal.scope} className="text-slate-700" />
           </div>
        </div>

        {/* Investimento */}
        <div className="bg-[#0c1618] p-8 md:p-12 rounded-3xl text-white mb-8">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#ffbc45] mb-8">
                Investimento
                <div className="w-12 h-0.5 bg-[#ffbc45] mt-2"></div>
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Investimento Mensal</p>
                    <p className="text-5xl font-bold text-[#ffbc45]">{formatCurrency(proposal.monthly_investment)}</p>
                </div>
                <div className="hidden md:block w-px h-16 bg-white/20"></div>
                <div className="flex-1 md:text-right">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Valor Total</p>
                    <p className="text-3xl font-bold">{formatCurrency((proposal.monthly_investment * (proposal.recurring_months || 12)) + proposal.one_time_investment)}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 p-4 rounded-xl">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400">Tipo</p>
                    <p className="text-sm font-bold">{proposal.contract_type === 'recurring' ? 'Recorrente' : 'Avulso'}</p>
                </div>
                <div className=\"bg-white/5 p-4 rounded-xl\">
                    <p className=\"text-[9px] uppercase tracking-widest text-slate-400\">Validade</p>
                    <p className=\"text-sm font-bold\">{proposal.contract_term || '—'}</p>
                </div>
                <div className=\"bg-white/5 p-4 rounded-xl\">
                    <p className=\"text-[9px] uppercase tracking-widest text-slate-400\">Início</p>
                    <p className=\"text-sm font-bold\">{proposal.first_due_date ? new Date(proposal.first_due_date).toLocaleDateString("pt-BR") : '—'}</p>
                </div>
                <div className=\"bg-white/5 p-4 rounded-xl\">
                    <p className=\"text-[9px] uppercase tracking-widest text-slate-400\">Dia de Cobrança</p>
                    <p className=\"text-sm font-bold\">{proposal.billing_day || '—'}</p>
                </div>
            </div>
        </div>

        {/* Contract */}
        {contractContent && (
          <div className="px-10 py-16 border-b border-slate-100 bg-white page-break-before">
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-1 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
                Documento Jurídico
              </div>
              <h2 className="text-2xl font-bold text-[#0C1618]">
                Contrato de Prestação de Serviços
              </h2>
            </div>
            
            <div className="contract-text contract-content max-w-none px-4 sm:px-10 text-justify">
              {contractContent.split('\n').map((line, i) => {
                // Heuristic for clause titles: starts with number and is short or uppercase
                const isClauseTitle = /^\d+\.\s+[A-Z\s]+$/.test(line.trim());
                if (isClauseTitle) {
                  return <div key={i} className="clause-title">{line}</div>;
                }
                return <p key={i}>{line}</p>;
              })}
            </div>
          </div>
        )}

        {/* Signature */}
        <div className="px-10 py-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-8 rounded-lg bg-green-500 flex items-center justify-center">
              <FileSignature className="size-4 text-white" />
            </div>
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
              Aceite & Assinatura Digital
            </h2>
          </div>

          {accepted ? (
            <div className="space-y-8">
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="rounded-3xl border border-slate-200 p-8 bg-slate-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckCircle2 className="size-16 text-[#0C1618]" />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-6">Contratada (Agência)</p>
                  <p className="text-lg font-bold text-[#0C1618]">{agency?.name}</p>
                  <div className="mt-6 pt-6 border-t border-slate-200 text-[#0C1618] text-sm min-h-[80px] flex items-center justify-center">
                    {agency?.agency_signature_url ? (
                      <img src={agency.agency_signature_url} alt="Assinatura" className="max-h-24 object-contain" />
                    ) : (
                      <span className="italic font-medium opacity-50">Assinado eletronicamente</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-4 font-medium">
                    Assinado em {proposal.accepted_at && new Date(proposal.accepted_at).toLocaleString("pt-BR")}
                  </p>
                </div>

                <div className="rounded-3xl border border-green-200 p-8 bg-green-50/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckCircle2 className="size-16 text-green-600" />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-green-600/60 mb-6">Contratante (Cliente)</p>
                  <p className="text-lg font-bold text-[#0C1618]">{proposal.accepted_name}</p>
                  <div className="mt-6 pt-6 border-t border-green-200 flex items-center justify-center min-h-[80px]">
                    {proposal.client_signature_data ? (
                      <img src={proposal.client_signature_data} alt="Assinatura Cliente" className="max-h-24 object-contain grayscale brightness-50 contrast-125" />
                    ) : (
                      <span className="italic font-medium text-green-700 text-lg">{proposal.signature_client || proposal.accepted_name}</span>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-green-100 text-[10px] text-green-600/80 space-y-1">
                    <p><strong>CPF:</strong> {proposal.client_cpf}</p>
                    <p><strong>Cargo:</strong> {proposal.client_role}</p>
                    <p><strong>E-mail:</strong> {proposal.client_signed_email}</p>
                    <p className="mt-2 opacity-60">Assinado em {proposal.accepted_at && new Date(proposal.accepted_at).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </div>

              {/* Audit Trail */}
              <div className="rounded-2xl border border-slate-100 p-6 bg-slate-50/30 text-[10px] text-slate-400 font-mono">
                <p className="uppercase font-bold mb-2 tracking-widest text-slate-500">Log de Auditoria</p>
                <div className="space-y-1">
                  <p>ID: {proposal.id}</p>
                  <p>Status: Assinatura realizada</p>
                  <p>IP: {proposal.accepted_ip || '—'}</p>
                  <p>Browser: {proposal.accepted_user_agent || '—'}</p>
                  <p>Timestamp: {proposal.accepted_at}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 p-8 bg-slate-50/50">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-4">Contratada (Agência)</p>
                <p className="text-lg font-bold text-[#0C1618]">{agency?.name}</p>
                <div className="mt-6 pt-6 border-t border-slate-200 min-h-[80px] flex items-center justify-center">
                  {agency?.agency_signature_url ? (
                    <img src={agency.agency_signature_url} alt="Assinatura" className="max-h-24 object-contain" />
                  ) : (
                    <span className="italic text-slate-400 text-xs font-medium">Assinatura digital pendente</span>
                  )}
                </div>
              </div>

              <div className="no-print rounded-[2.5rem] border border-slate-200 p-10 bg-white shadow-2xl shadow-slate-200/40">
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-8 border-b border-slate-100 pb-4">Assinatura do Contratante (Cliente)</p>
                
                <div className="grid sm:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Nome completo *</label>
                    <Input
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Nome completo do assinante"
                      className="h-12 bg-slate-50 border-slate-100 focus:bg-white focus:border-[#FFBC45] text-slate-900 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CPF *</label>
                    <Input
                      value={signerCpf}
                      onChange={(e) => setSignerCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="h-12 bg-slate-50 border-slate-100 focus:bg-white focus:border-[#FFBC45] text-slate-900 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cargo / Função *</label>
                    <Input
                      value={signerRole}
                      onChange={(e) => setSignerRole(e.target.value)}
                      placeholder="Ex: Diretor, Proprietário..."
                      className="h-12 bg-slate-50 border-slate-100 focus:bg-white focus:border-[#FFBC45] text-slate-900 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">E-mail *</label>
                    <Input
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      placeholder="email@empresa.com.br"
                      className="h-12 bg-slate-50 border-slate-100 focus:bg-white focus:border-[#FFBC45] text-slate-900 rounded-xl"
                    />
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assinatura Digital (Desenhe abaixo) *</label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => sigPad.current?.clear()}
                      className="h-7 text-[10px] text-slate-400 hover:text-red-500 gap-1"
                    >
                      <Eraser className="size-3" /> Limpar
                    </Button>
                  </div>
                  <div className="rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 overflow-hidden relative group">
                    <SignatureCanvas 
                      ref={sigPad}
                      penColor='#0C1618'
                      canvasProps={{
                        className: 'signature-canvas w-full min-h-[160px] cursor-crosshair'
                      }}
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-900">Desenhe aqui</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-10">
                  <label className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                    <Checkbox
                      checked={acceptTerms}
                      onCheckedChange={(v) => setAcceptTerms(v === true)}
                      className="mt-0.5 size-5 rounded-md border-slate-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />
                    <span className="text-xs font-medium text-slate-600 leading-relaxed">
                      Declaro que li e concordo integralmente com os termos desta proposta e contrato.
                    </span>
                  </label>

                  <label className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                    <Checkbox
                      checked={acceptRepresentation}
                      onCheckedChange={(v) => setAcceptRepresentation(v === true)}
                      className="mt-0.5 size-5 rounded-md border-slate-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />
                    <span className="text-xs font-medium text-slate-600 leading-relaxed">
                      Declaro possuir poderes legais para representar esta empresa e firmar este aceite digital.
                    </span>
                  </label>
                </div>

                <Button
                  onClick={sign}
                  disabled={signing}
                  className="h-16 w-full gap-4 text-[#0C1618] bg-[#FFBC45] hover:bg-[#ffc864] font-bold text-sm uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-[#FFBC45]/20 transition-all active:scale-[0.98]"
                >
                  {signing ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <FileSignature className="size-5" />
                  )}
                  Aprovar e Assinar
                </Button>
                <p className="text-center text-[10px] text-slate-400 mt-6 font-medium">
                  Sua assinatura será registrada com IP, Timestamp e Metadados para validade jurídica.
                </p>
              </div>
            </div>
          )}
        </div>


        <div className="px-10 py-8 text-center bg-slate-50 border-t border-slate-100">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="size-5 rounded bg-[#0C1618] flex items-center justify-center">
              <span className="text-[#FFBC45] font-bold text-[8px]">KH</span>
            </div>
            <span className="text-[10px] font-bold text-[#0C1618] tracking-widest uppercase">KASA HUB</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            © {new Date().getFullYear()} {agency?.name ?? "Kasa Marketing"} · Documento gerado e autenticado por KASA HUB
          </p>
        </div>
      </div>
    </div>
  );
}

function ItemsTable({
  title,
  items,
  brand,
}: {
  title: string;
  items: Item[];
  brand: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
        <p className="text-xs font-bold text-[#0C1618] uppercase tracking-[0.2em]">
          {title}
        </p>
      </div>
      <div className="overflow-x-auto items-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50/50">
              <th className="px-6 py-3">Serviço / Item</th>
              <th className="px-6 py-3 text-right w-16">Qtd</th>
              <th className="px-6 py-3 text-right w-32">Investimento</th>
              <th className="px-6 py-3 text-right w-32">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-slate-50 transition-colors align-top">
                <td className="px-6 py-4">
                  <div className="font-bold text-[#0C1618] text-base">{it.title}</div>
                  {it.description && (
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {it.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-slate-600 font-medium">{Number(it.quantity)}</td>
                <td className="px-6 py-4 text-right text-slate-600 font-medium">
                  {formatCurrency(Number(it.unit_price))}
                </td>
                <td className="px-6 py-4 text-right text-[#0C1618] font-bold">
                  {formatCurrency(Number(it.quantity) * Number(it.unit_price))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  brand,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  brand: string;
}) {
  return (
    <div
      className="rounded-[1.5rem] p-6 bg-white border-2 transition-all hover:shadow-lg hover:shadow-slate-100"
      style={{ borderColor: highlight ? brand : "#f1f5f9" }}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-1">{label}</p>
      <p
        className="text-2xl font-bold tracking-tight"
        style={{ color: highlight ? "#0C1618" : "#0C1618" }}
      >
        {value}
      </p>
    </div>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all">
      <span className="text-[#FFBC45] mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm text-[#0C1618] font-bold truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

