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


export const Route = createFileRoute("/proposta/$token")({
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
  scope_text?: string | string[] | null;
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
  service_start_date?: string | null;
  billing_day: number;
  number_display?: string | null;
  contract_template_id?: string | null;
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
  address: string | null;
  logo_url?: string | null;
} | null;
type Lead = {
  name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
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
    lead: Lead;
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
      const res = await fetch(`/api/public/proposta/${token}`);
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
    const interval = setInterval(load, 7000);
    return () => clearInterval(interval);
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
    if (!signerName || signerName.length < 2) {
      toast.error("Informe seu nome completo");
      return;
    }
    if (!signerCpf || signerCpf.replace(/\D/g, "").length < 11) {
      toast.error("Informe um CPF válido");
      return;
    }
    if (!signerRole) {
      toast.error("Informe seu cargo");
      return;
    }
    if (!signerEmail || !signerEmail.includes("@")) {
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
      const res = await fetch(`/api/public/proposta/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accepted_name: signerName,
          accepted_cpf: signerCpf,
          accepted_role: signerRole,
          accepted_email: signerEmail,
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
      toast.success("Proposta assinada com sucesso! Seu projeto já foi iniciado.");
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
    const { proposal, agency, client, lead } = data;
    const rawContractContent = proposal.contract_content;
    
    let servicesList = "";
    const scopeData = proposal.scope_text || proposal.scope || [];
    if (Array.isArray(scopeData)) {
      servicesList = scopeData.join(", ");
    } else if (typeof scopeData === 'string') {
      servicesList = scopeData;
    }

    return replaceContractVariables(rawContractContent as string, {
      client_name: lead?.name || client?.name || proposal.client_name,
      client_legal_name: lead?.company || client?.company || proposal.client_name,
      client_document: client?.document || "",
      client_address: client?.address || "",
      client_email: lead?.email || client?.email || proposal.client_email || "",
      client_phone: lead?.phone || client?.phone || "",
      services_list: servicesList,
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
      proposal_number: proposal.number_display || "",
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

  const { proposal, agency, client, lead } = data;
  const accepted = proposal.status === "Aprovada" || proposal.status === "accepted" || proposal.status === "signed" || proposal.status === "converted";
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
              {agency?.logo_proposals_url && (
                <img 
                  src={agency.logo_proposals_url} 
                  alt={agency.name} 
                  className="h-8 w-auto object-contain"
                />
              )}
              <div className="flex flex-col items-start">
                 <span className="text-[11px] font-bold font-sans text-slate-800 uppercase tracking-tight leading-none mb-0.5">Kasa Marketing & Consultoria</span>

                 <div className="flex flex-wrap items-center gap-x-1.5 text-[9px] text-slate-400 font-sans leading-none">
                    <span>CNPJ: 51.920.226/0001-41</span>
                    <span className="text-slate-300">·</span>
                    <span>relacionamentokasa@gmail.com</span>
                    <span className="text-slate-300">·</span>
                    <span>(62) 99463-0772</span>
                    <span className="text-slate-300">·</span>
                    <span>@kasamkt</span>
                 </div>
              </div>
           </div>
           <Button
             variant="outline"
             size="sm"
             onClick={() => window.print()}
             className="gap-2 rounded-full px-4 border-slate-200 font-sans"
           >
             <Printer className="size-4" /> Exportar PDF
           </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-6 sm:py-12 px-4 sm:px-6">
        {/* Hero Section */}
        <div className="bg-white p-6 sm:p-8 md:p-12 rounded-3xl shadow-sm relative overflow-hidden mb-6 sm:mb-8">
           <div className="absolute inset-y-0 right-0 w-1/3 bg-[#ffbc45]/6 -rotate-12 transform origin-top-right hidden sm:block" />
           
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative z-10">
              <div className="flex flex-col items-start gap-2">
               <div className="flex flex-col items-start">
                  {agency?.logo_proposals_url && (
                    <img 
                      src={agency.logo_proposals_url} 
                      alt={agency.name} 
                      className="h-10 sm:h-12 w-auto object-contain mb-4"
                    />
                  )}
                    <span className="text-[11px] sm:text-[12px] font-bold font-sans text-slate-800 uppercase tracking-tight leading-none mb-1">Kasa Marketing & Consultoria</span>

                    <div className="flex flex-wrap items-center gap-x-2 text-[10px] sm:text-[11px] text-slate-400 font-sans leading-none">
                       <span>CNPJ: 51.920.226/0001-41</span>
                       <span className="text-slate-300">·</span>
                       <span>relacionamentokasa@gmail.com</span>
                       <span className="text-slate-300">·</span>
                       <span>(62) 99463-0772</span>
                       <span className="text-slate-300">·</span>
                       <span>@kasamkt</span>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2 w-full sm:w-auto">
                 <div className="flex flex-wrap gap-2">
                   <div className="px-3 py-1 bg-yellow-50 border border-[#ffbc45] text-[#b45309] text-[10px] font-bold uppercase tracking-widest rounded-full font-sans whitespace-nowrap">Proposta Comercial</div>
                   <div className={`px-3 py-1 border text-[10px] font-bold uppercase tracking-widest rounded-full font-sans whitespace-nowrap ${accepted ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                      {accepted ? "Proposta Aprovada" : "Aguardando Assinatura"}
                   </div>
                 </div>
                 <div className="text-left md:text-right text-[11px] text-slate-400 font-sans">
                   <p>Emitida em {new Date().toLocaleDateString("pt-BR")}</p>
                   {proposal.valid_until && <p>Validade: {new Date(proposal.valid_until).toLocaleDateString("pt-BR")}</p>}
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-3 mb-2">
             <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{proposal.number_display}</span>
           </div>
           <h1 className="font-display text-2xl sm:text-4xl font-bold mb-6 text-[#0c1618] relative z-10 break-words">{proposal.title}</h1>
           <div className="flex items-center gap-3 relative z-10">
             <div className="size-10 rounded-full bg-[#f9f7f3] border border-[#ece8e0] flex items-center justify-center font-bold text-[#ffbc45] font-sans shadow-sm shrink-0 overflow-hidden">
               {client?.logo_url ? (
                 <img src={client.logo_url} className="w-full h-full object-cover" alt="Client Logo" />
               ) : (
                 proposal.client_name.substring(0, 2).toUpperCase()
               )}
             </div>
             <p className="text-sm text-slate-600 font-sans tracking-tight leading-snug">Preparada para <span className="font-bold text-[#0c1618]">{proposal.client_name}</span></p>
           </div>
        </div>

        {/* Dados do Contratante */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm mb-6 sm:mb-8">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#ffbc45] mb-6">
            Dados do Contratante
            <div className="w-12 h-0.5 bg-[#ffbc45] mt-2"></div>
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 text-sm text-[#0c1618]">
            <div className="bg-[#f9f7f3] border border-[#ece8e0] p-3 sm:p-4 rounded-xl flex items-center gap-3">
               <UserIcon className="size-5 text-[#ffbc45] shrink-0" />
               <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Nome</p>
                  <p className="font-bold font-sans truncate">{lead?.name || client?.name || "—"}</p>
               </div>
            </div>
            <div className="bg-[#f9f7f3] border border-[#ece8e0] p-3 sm:p-4 rounded-xl flex items-center gap-3">
               <Building2 className="size-5 text-[#ffbc45] shrink-0" />
               <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Empresa</p>
                  <p className="font-bold font-sans truncate">{lead?.company || client?.company || '—'}</p>
               </div>
            </div>
            <div className="bg-[#f9f7f3] border border-[#ece8e0] p-3 sm:p-4 rounded-xl flex items-center gap-3">
               <Phone className="size-5 text-[#ffbc45] shrink-0" />
               <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Telefone</p>
                  <p className="font-bold font-sans truncate">{lead?.phone || client?.phone || '—'}</p>
               </div>
            </div>
            <div className="bg-[#f9f7f3] border border-[#ece8e0] p-3 sm:p-4 rounded-xl flex items-center gap-3">
               <Mail className="size-5 text-[#ffbc45] shrink-0" />
               <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">E-mail</p>
                  <p className="font-bold font-sans truncate">{lead?.email || client?.email || proposal.client_email || '—'}</p>
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
           <div className="bg-[#f9f7f3] p-6 sm:p-8 rounded-2xl border border-[#ece8e0]">
              <ScopeRenderer text={proposal.scope_text || (proposal.scope as any)} className="text-[#0c1618]" />
           </div>
        </div>

        {/* Investimento */}
        <div className="bg-[#0c1618] p-6 sm:p-8 md:p-12 rounded-3xl text-white mb-6 sm:mb-8">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#ffbc45] mb-8">
                Investimento
                <div className="w-12 h-0.5 bg-[#ffbc45] mt-2"></div>
            </h2>
            
            { (proposal.contract_type === 'avulso' || proposal.contract_type === 'one_time') ? (
              <div className="flex flex-col items-center md:items-start mb-8 sm:mb-12">
                <div className="w-full text-center md:text-left mb-2">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-sans">Valor Total</p>
                    <p className="text-5xl sm:text-6xl font-bold text-[#ffbc45] font-display">{formatCurrency(proposal.total || proposal.one_time_investment)}</p>
                </div>
                {proposal.installments && proposal.installments > 1 && (
                  <div className="w-full text-center md:text-left">
                    <p className="text-lg sm:text-xl font-medium text-slate-400 font-sans">
                      {proposal.installments}x de {formatCurrency((proposal.total || proposal.one_time_investment) / proposal.installments)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 mb-8 sm:mb-12">
                  <div className="flex-1 w-full text-center md:text-left">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-sans">Investimento Mensal</p>
                      <p className="text-4xl sm:text-5xl font-bold text-[#ffbc45] font-display">{formatCurrency(proposal.monthly_investment)}</p>
                  </div>
                  <div className="hidden md:block w-px h-16 bg-white/20"></div>
                  <div className="flex-1 w-full text-center md:text-right">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-sans">Valor Total</p>
                      <p className="text-2xl sm:text-3xl font-bold text-white font-display">{formatCurrency((proposal.monthly_investment * (proposal.recurring_months || 12)) + proposal.one_time_investment)}</p>
                  </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 p-4 rounded-xl">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-sans">Tipo</p>
                    <p className="text-sm font-bold font-sans capitalize">
                      {proposal.contract_type === 'recurring' ? 'Recorrente' : (proposal.contract_type === 'one_time' || proposal.contract_type === 'avulso') ? 'Avulso' : proposal.contract_type}
                    </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-sans">Validade</p>
                    <p className="text-sm font-bold font-sans">{
                      proposal.contract_term === "indeterminado" 
                        ? "Prazo Indeterminado" 
                        : proposal.contract_term === "monthly" 
                          ? "Mensal"
                          : proposal.contract_term?.includes("_months")
                            ? `${proposal.contract_term.replace("_months", "")} meses`
                            : `${proposal.recurring_months || 12} meses`
                    }</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-sans">Início</p>
                    <p className="text-sm font-bold font-sans">{proposal.first_due_date ? new Date(proposal.first_due_date).toLocaleDateString("pt-BR") : '—'}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-sans">Dia de Cobrança</p>
                    <p className="text-sm font-bold font-sans">{String(proposal.billing_day || (proposal.first_due_date ? new Date(proposal.first_due_date!).getDate() : "—"))}</p>
                </div>
            </div>
        </div>

        {/* Contract */}
        {contractContent && proposal.contract_template_id && (
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm mb-8 page-break-before">
             <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#ffbc45] mb-8">
                Documento Jurídico
                <div className="w-12 h-0.5 bg-[#ffbc45] mt-2"></div>
             </h2>
             <h3 className="text-xl font-bold text-[#0c1618] mb-8 text-center">Contrato de Prestação de Serviços</h3>
            
            <div className="text-sm leading-relaxed text-[#0c1618] text-justify space-y-4">
              {contractContent.split('\n').map((line, i) => {
                const isClauseTitle = /^\d+\.\s+[A-Z\s]+$/.test(line.trim());
                if (isClauseTitle) {
                  return <div key={i} className="font-display font-bold text-lg mt-8 mb-4 text-[#0c1618]">{line}</div>;
                }
                return <p key={i}>{line}</p>;
              })}
            </div>
          </div>
        )}

        {/* Aceite & Assinatura Digital */}
        {true && (
          <div className="bg-white p-8 rounded-3xl shadow-sm mb-8">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#ffbc45] mb-8">
              Aceite & Assinatura Digital
              <div className="w-12 h-0.5 bg-[#ffbc45] mt-2"></div>
            </h2>

            {accepted ? (
              <div className="grid md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-2xl border-2 bg-white relative overflow-hidden font-sans ${proposal.signed_at_client ? 'border-[#a0d8bc]' : 'border-slate-100'}`}>
                  {proposal.signed_at_client && <div className="absolute top-0 left-0 right-0 h-1 bg-[#1d9e75]" />}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Contratante (Cliente)</p>
                    {proposal.signed_at_client && <CheckCircle2 className="size-5 text-[#1d9e75]" />}
                  </div>
                  <p className="font-bold text-lg mb-4 text-[#0c1618]">{proposal.accepted_name}</p>
                  <div className="border-t border-slate-100 pt-4 flex flex-col items-center justify-center min-h-[100px]">
                     {proposal.client_signature_data ? (
                       <img src={proposal.client_signature_data} alt="Assinatura" className="max-h-20 object-contain grayscale" />
                     ) : (
                       <p className="italic text-slate-300">Assinado digitalmente</p>
                     )}
                     <p className="text-[9px] text-slate-400 mt-4 uppercase tracking-tighter">Stamp: {proposal.accepted_at ? new Date(proposal.accepted_at).toLocaleString("pt-BR") : '—'}</p>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border-2 bg-white relative overflow-hidden font-sans ${proposal.signed_at_agency ? 'border-[#a0d8bc]' : 'border-slate-100'}`}>
                  {proposal.signed_at_agency && <div className="absolute top-0 left-0 right-0 h-1 bg-[#1d9e75]" />}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Contratada (Agência)</p>
                    {proposal.signed_at_agency && <CheckCircle2 className="size-5 text-[#1d9e75]" />}
                  </div>
                  <p className="font-bold text-lg mb-4 text-[#0c1618]">{agency?.name}</p>
                  <div className="border-t border-slate-100 pt-4 flex flex-col items-center justify-center min-h-[100px]">
                     {agency?.agency_signature_url ? (
                       <img src={agency.agency_signature_url} alt="Assinatura" className="max-h-20 object-contain grayscale" />
                     ) : (
                       <p className="italic text-slate-300">Assinado digitalmente</p>
                     )}
                     <p className="text-[9px] text-slate-400 mt-4 uppercase tracking-tighter">Stamp: {proposal.signed_at_agency ? new Date(proposal.signed_at_agency).toLocaleString("pt-BR") : '—'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                 <div className="no-print bg-slate-50/50 rounded-2xl p-8 border border-slate-100 font-sans">
                    <div className="grid sm:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome completo</label>
                        <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Seu nome" className="bg-white rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPF</label>
                        <Input value={signerCpf} onChange={(e) => setSignerCpf(e.target.value)} placeholder="000.000.000-00" className="bg-white rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargo</label>
                        <Input value={signerRole} onChange={(e) => setSignerRole(e.target.value)} placeholder="Ex: Diretor" className="bg-white rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-mail</label>
                        <Input value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="email@empresa.com" className="bg-white rounded-xl" />
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assinatura Digital</label>
                        <Button variant="ghost" size="sm" onClick={() => sigPad.current?.clear()} className="h-6 text-[10px] text-slate-400">Limpar</Button>
                      </div>
                      <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl overflow-hidden">
                        <SignatureCanvas ref={sigPad} penColor='#0c1618' canvasProps={{ className: 'w-full min-h-[140px] cursor-crosshair' }} />
                      </div>
                    </div>

                    <div className="space-y-3 mb-8">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} className="mt-1" />
                        <span className="text-xs text-slate-600">Declaro que li e concordo com os termos desta proposta.</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox checked={acceptRepresentation} onCheckedChange={(v) => setAcceptRepresentation(v === true)} className="mt-1" />
                        <span className="text-xs text-slate-600">Declaro possuir poderes para representar esta empresa.</span>
                      </label>
                    </div>

                    <Button onClick={sign} disabled={signing} className="w-full h-14 bg-[#ffbc45] hover:bg-[#ffc864] text-[#0c1618] font-bold uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-[#ffbc45]/20">
                      {signing ? <Loader2 className="animate-spin" /> : "Aprovar e Assinar Proposta"}
                    </Button>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="bg-white p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-[#ffbc45]" />
              <p className="text-[10px] text-slate-400 font-medium">© 2026 Kasa Marketing & Consultoria · Todos os direitos reservados</p>
            </div>
            <p className="text-[10px] text-[#ffbc45] font-bold uppercase tracking-widest">@kasamkt</p>
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
    <div className="overflow-hidden rounded-2xl border border-[#ece8e0] bg-white">
      <div className="px-6 py-4 bg-[#f9f7f3] border-b border-[#ece8e0]">
        <p className="text-[10px] font-bold text-[#0c1618] uppercase tracking-[0.2em] flex items-center gap-2">
          <div className="w-1 h-4 bg-[#ffbc45]" />
          {title}
        </p>
      </div>
      <div className="overflow-x-auto items-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[9px] uppercase tracking-widest text-slate-400 border-b border-[#ece8e0] bg-[#f9f7f3]/50">
              <th className="px-6 py-3 font-bold">Serviço / Item</th>
              <th className="px-6 py-3 text-right w-16 font-bold">Qtd</th>
              <th className="px-6 py-3 text-right w-32 font-bold">Investimento</th>
              <th className="px-6 py-3 text-right w-32 font-bold">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ece8e0]">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-[#f9f7f3]/50 transition-colors align-top">
                <td className="px-6 py-4">
                  <div className="font-bold text-[#0c1618] text-sm flex items-start gap-2">
                    <span className="text-[#ffbc45] mt-0.5">·</span>
                    {it.title}
                  </div>
                  {it.description && (
                    <div className="text-[11px] text-slate-500 mt-1 leading-relaxed ml-3">
                      {it.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-slate-600 text-xs">{Number(it.quantity)}</td>
                <td className="px-6 py-4 text-right text-slate-600 text-xs">
                  {formatCurrency(Number(it.unit_price))}
                </td>
                <td className="px-6 py-4 text-right text-[#0c1618] font-bold text-xs">
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

