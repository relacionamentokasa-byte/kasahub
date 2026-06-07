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
    <div className="min-h-screen bg-slate-50 text-slate-900 print:bg-white font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap');
        
        @media print {
          .no-print { display: none !important; }
          body { 
            background: white !important; 
            font-family: 'Onest', sans-serif !important;
          }
          .print-m-0 { margin: 0 !important; padding: 1.5cm !important; }
          .page-break-before { page-break-before: always; }
          .page-break-inside-avoid { page-break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

        .font-onest { font-family: 'Onest', sans-serif; }
        
        /* Proposta hierarchy */
        .proposal-title {
          font-family: 'Onest', sans-serif !important;
          font-weight: 700;
          font-size: 28px;
          line-height: 1.2;
          color: #0C1618;
        }
        
        .clause-title {
          font-family: 'Onest', sans-serif !important;
          font-weight: 600;
          font-size: 18px;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #0C1618;
        }
        
        .contract-text {
          font-family: 'Onest', sans-serif !important;
          font-weight: 400;
          font-size: 16px;
          line-height: 1.7;
          color: #334155;
        }

        .contract-content p {
          margin-bottom: 1.25rem;
        }

        .items-table tr {
          page-break-inside: avoid;
        }

        /* Prevent empty gaps at page breaks */
        .content-section {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-[#0C1618] flex items-center justify-center">
            <span className="text-[#FFBC45] font-bold text-xs">KH</span>
          </div>
          <div className="text-sm font-bold text-[#0C1618] tracking-tight">
            KASA HUB
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full px-4"
          >
            <Printer className="size-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-white shadow-2xl shadow-slate-200/50 print:shadow-none my-8 print:my-0 rounded-[2rem] overflow-hidden print:rounded-none">
        {/* Header */}
        <div
          className="px-10 pt-12 pb-10 border-b border-slate-100 relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFBC45]/5 rounded-bl-[5rem] -z-0" />
          
          <div className="flex items-start justify-between gap-6 flex-wrap relative z-10">
            <div>
              {agency?.logo_proposals_url || agency?.logo_url ? (
                <img
                  src={(agency.logo_proposals_url || agency.logo_url) as string}
                  alt={agency.name}
                  className="h-14 object-contain mb-6"
                />
              ) : (
                <div
                  className="text-2xl font-bold mb-6 flex items-center gap-2"
                  style={{ color: "#0C1618" }}
                >
                  <div className="size-10 rounded-xl bg-[#0C1618] flex items-center justify-center">
                    <span className="text-[#FFBC45] font-bold text-base">KH</span>
                  </div>
                  <span>{agency?.name ?? "Kasa Marketing"}</span>
                </div>
              )}
              <div className="text-[13px] text-slate-500 space-y-1">
                {agency?.document && <div className="flex items-center gap-2"><span className="opacity-50">•</span> {agency.document}</div>}
                {agency?.email && <div className="flex items-center gap-2"><span className="opacity-50">•</span> {agency.email}</div>}
                {agency?.phone && <div className="flex items-center gap-2"><span className="opacity-50">•</span> {agency.phone}</div>}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
                <span className="size-1.5 rounded-full bg-[#FFBC45] animate-pulse" />
                Proposta Comercial
              </div>
              <p className="text-sm text-slate-400">
                Emitida em <span className="text-slate-600 font-medium">{new Date().toLocaleDateString("pt-BR")}</span>
              </p>
              {proposal.valid_until && (
                <p className="text-sm text-slate-400 mt-0.5">
                  Válida até <span className="text-slate-600 font-medium">{new Date(proposal.valid_until).toLocaleDateString("pt-BR")}</span>
                </p>
              )}
              <div className="mt-4">
                <span
                  className="inline-block text-[11px] px-4 py-1.5 rounded-full font-bold uppercase tracking-widest"
                  style={{
                    background: accepted ? "#dcfce7" : "#fffbeb",
                    color: accepted ? "#166534" : "#b45309",
                  }}
                >
                  {accepted ? "✓ Proposta Aprovada" : "Aguardando Aceite"}
                </span>
              </div>
            </div>
          </div>

          <h1 className="mt-12 proposal-title">
            {proposal.title}
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
              {proposal.client_name.substring(0, 2)}
            </div>
            <p className="text-sm text-slate-500">
              Preparada para <span className="font-bold text-[#0C1618]">{proposal.client_name}</span>
            </p>
          </div>
        </div>

        {/* Dados do Cliente */}
        <div className="px-8 py-6 border-b border-slate-100">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">
            Dados do Contratante
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
            <InfoLine icon={<UserIcon className="size-4" />} label="Nome" value={client?.name || proposal.client_name} />
            <InfoLine icon={<Building2 className="size-4" />} label="Empresa" value={client?.company} />
            <InfoLine icon={<Phone className="size-4" />} label="Telefone" value={client?.phone} />
            <InfoLine icon={<Mail className="size-4" />} label="E-mail" value={client?.email || proposal.client_email} />
          </div>
        </div>
        
        
        {/* Scope */}
        {((proposal.scope_text && proposal.scope_text.trim().length > 0) ||
          (Array.isArray(proposal.scope) && proposal.scope.length > 0)) && (
          <div className="px-8 py-6 border-b border-slate-100 content-section">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">
              O que será entregue (Escopo)
            </h2>
            <ScopeRenderer text={proposal.scope_text} fallback={proposal.scope} className="text-slate-700" />
          </div>
        )}

        {/* Intro */}
        {proposal.intro && (
          <div className="px-8 py-6 border-b border-slate-100 content-section">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2">
              Apresentação
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
              {proposal.intro}
            </p>
          </div>
        )}

        {/* Services */}
        <div className="px-8 py-6 border-b border-slate-100">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">
            Escopo & Serviços
          </h2>
          {grouped.monthly.length > 0 && (
            <ItemsTable
              title="Serviços recorrentes (mensal)"
              items={grouped.monthly}
              brand={brand}
            />
          )}
          {grouped.one_time.length > 0 && (
            <div className="mt-6">
              <ItemsTable
                title="Serviços pontuais"
                items={grouped.one_time}
                brand={brand}
              />
            </div>
          )}
          {data.items.length === 0 && (
            <p className="text-sm text-slate-400">Nenhum item cadastrado.</p>
          )}
        </div>

        {/* Investment Details */}
        <div
          className="px-10 py-12 border-b border-slate-100 bg-[#0C1618]/[0.02]"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="size-8 rounded-lg bg-[#FFBC45] flex items-center justify-center">
              <span className="text-[#0C1618] font-bold text-xs">$</span>
            </div>
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
              Investimento
            </h2>
          </div>
          
          {proposal.monthly_investment > 0 ? (
            <div className="space-y-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <Stat 
                  label="Tipo de Contrato" 
                  value={proposal.contract_type === 'recurring' ? 'Recorrente' : 'Avulso'} 
                  brand="#FFBC45" 
                />
                <Stat 
                  label="Validade" 
                  value={proposal.contract_term === "indeterminado" 
                    ? "Prazo Indeterminado" 
                    : proposal.contract_term === "monthly" 
                      ? "Mensal"
                      : proposal.contract_term?.includes("_months")
                        ? `${proposal.contract_term.replace("_months", "")} meses`
                        : `${proposal.recurring_months || 12} meses`
                  } 
                  brand="#FFBC45" 
                />
                <Stat 
                  label="Início" 
                  value={proposal.first_due_date 
                    ? new Date(proposal.first_due_date).toLocaleDateString("pt-BR") 
                    : "—"
                  } 
                  brand="#FFBC45" 
                />
                <Stat 
                  label="Dia de Cobrança" 
                  value={String(proposal.billing_day || proposal.first_due_date ? new Date(proposal.first_due_date!).getDate() : "—")} 
                  brand="#FFBC45" 
                />
              </div>

              {proposal.one_time_investment > 0 && (
                <div className="pt-8 border-t border-slate-200/50">
                   <Stat 
                    label="Setup / Investimento Único" 
                    value={formatCurrency(proposal.one_time_investment)} 
                    brand="#FFBC45" 
                  />
                </div>
              )}

              <div className="pt-8 border-t border-slate-200/50">
                <div className="flex justify-between items-end bg-[#0C1618] p-8 rounded-[2rem] text-white">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#FFBC45] mb-2">Investimento Total Estimado</p>
                    <p className="text-4xl font-bold">
                      {formatCurrency((proposal.monthly_investment * (proposal.recurring_months || 12)) + proposal.one_time_investment)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-400 font-medium">
                    Pagamento via <span className="text-white">{proposal.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                                   proposal.payment_method === 'pix' ? 'PIX' : 
                                   proposal.payment_method === 'transfer' ? 'Transferência' : 'Boleto'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <Stat 
                  label="Valor do Projeto" 
                  value={formatCurrency(proposal.one_time_investment)} 
                  highlight 
                  brand="#FFBC45" 
                />
                <Stat 
                  label="Parcelamento" 
                  value={`${proposal.installments || 1}x de ${formatCurrency(proposal.one_time_investment / (proposal.installments || 1))}`} 
                  brand="#FFBC45" 
                />
              </div>
              <div className="pt-8 border-t border-slate-200/50 flex justify-between items-center bg-[#0C1618] p-8 rounded-[2rem] text-white">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#FFBC45] mb-1">Forma de Pagamento</p>
                  <p className="text-xl font-bold">{proposal.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                                   proposal.payment_method === 'pix' ? 'PIX' : 
                                   proposal.payment_method === 'transfer' ? 'Transferência' : 'Boleto'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#FFBC45] mb-1">Valor Total</p>
                  <p className="text-3xl font-bold">{formatCurrency(proposal.one_time_investment)}</p>
                </div>
              </div>
            </div>
          )}
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

