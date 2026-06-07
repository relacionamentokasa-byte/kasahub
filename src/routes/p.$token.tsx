import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { replaceContractVariables } from "@/lib/contracts-api";
import { CheckCircle2, Printer, FileSignature, Loader2, Mail, Phone, Building2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ScopeRenderer } from "@/components/proposals/ScopeRenderer";


export const Route = createFileRoute("/p/$token")({
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
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

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
    if (!acceptTerms) {
      toast.error("Confirme que leu e concorda com os termos");
      return;
    }
    setSigning(true);
    try {
      const res = await fetch(`/api/public/proposal/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accepted_name: signerName.trim(),
          accepted_cpf: signerCpf.trim(),
          accepted_terms: true,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === "cancelled") throw new Error("Esta proposta não está mais disponível.");
        if (j.error === "already_accepted") throw new Error("Esta proposta já foi aprovada.");
        throw new Error(j.error || "Falha ao assinar");
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
    const rawContractContent = data?.proposal.contract_content;
    if (!rawContractContent) return null;
    const { proposal, agency } = data;
    return replaceContractVariables(rawContractContent, {
      client_name: proposal.client_name,
      client_legal_name: proposal.client_name,
      client_document: agency?.document || "",
      client_address: agency?.address || "",
      client_email: proposal.client_email || "",
      services_list: (proposal.scope || []).join(", "),
      monthly_value: formatCurrency(proposal.monthly_investment),
      total_value: formatCurrency(
        proposal.monthly_investment * (proposal.recurring_months || 12),
      ),
      payment_method:
        proposal.payment_method === "credit_card"
          ? "Cartão de Crédito"
          : proposal.payment_method === "pix"
            ? "PIX"
            : proposal.payment_method === "transfer"
              ? "Transferência"
              : "Boleto",
      contract_term: `${proposal.recurring_months || 12} meses`,
      start_date: new Date().toLocaleDateString("pt-BR"),
      due_day: "5",
      installments: String(proposal.installments || 1),
    });
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-white text-slate-600">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  if (errorCode || !data) {
    const msg =
      errorCode === "not_found"
        ? "Esta proposta não foi encontrada."
        : "Não foi possível carregar esta proposta. Tente novamente em instantes.";
    return (
      <div className="min-h-screen grid place-items-center bg-white text-slate-600 px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-slate-900">Proposta indisponível</p>
          <p className="text-sm mt-2">{msg}</p>
        </div>
      </div>
    );
  }

  const { proposal, agency, client } = data;
  const accepted = proposal.status === "accepted";
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
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-700 truncate">
          {agency?.name ?? "HUB"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2"
          >
            <Printer className="size-4" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none my-6 print:my-0">
        {/* Header */}
        <div
          className="px-8 pt-10 pb-8 border-b-4"
          style={{ borderColor: brand }}
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              {agency?.logo_proposals_url || agency?.logo_url ? (
                <img
                  src={(agency.logo_proposals_url || agency.logo_url) as string}
                  alt={agency.name}
                  className="h-12 object-contain mb-4"
                />
              ) : (
                <div
                  className="text-2xl font-bold mb-4"
                  style={{ color: brand }}
                >
                  {agency?.name ?? "Kasa Marketing"}
                </div>
              )}
              <div className="text-xs text-slate-500 leading-relaxed">
                {agency?.document && <div>{agency.document}</div>}
                {agency?.email && <div>{agency.email}</div>}
                {agency?.phone && <div>{agency.phone}</div>}
                {agency?.website && <div>{agency.website}</div>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">
                Proposta Comercial
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Emitida em {new Date().toLocaleDateString("pt-BR")}
              </p>
              {proposal.valid_until && (
                <p className="text-xs text-slate-500">
                  Válida até{" "}
                  {new Date(proposal.valid_until).toLocaleDateString("pt-BR")}
                </p>
              )}
              <span
                className="inline-block mt-3 text-[10px] px-2.5 py-1 rounded font-semibold uppercase tracking-wide"
                style={{
                  background: accepted ? "#dcfce7" : `${brand}22`,
                  color: accepted ? "#166534" : "#7c5400",
                }}
              >
                {accepted ? "Aprovada" : proposal.status}
              </span>
            </div>
          </div>

          <h1
            className="mt-8 text-3xl font-bold leading-tight"
            style={{ color: "#0f172a" }}
          >
            {proposal.title}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Preparada para <span className="font-semibold text-slate-700">{proposal.client_name}</span>
          </p>
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
          <div className="px-8 py-6 border-b border-slate-100">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">
              O que será entregue (Escopo)
            </h2>
            <ScopeRenderer text={proposal.scope_text} fallback={proposal.scope} className="text-slate-700" />
          </div>
        )}

        {/* Intro */}
        {proposal.intro && (
          <div className="px-8 py-6 border-b border-slate-100">
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
          className="px-8 py-8 border-b border-slate-100"
          style={{ background: `${brand}10` }}
        >
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-6">
            Investimento
          </h2>
          
          {grouped.monthly.length > 0 ? (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <Stat 
                  label="Valor Mensal" 
                  value={formatCurrency(proposal.monthly_investment)} 
                  highlight 
                  brand={brand} 
                />
                <Stat 
                  label="Prazo" 
                  value={`${proposal.recurring_months || 12} meses`} 
                  brand={brand} 
                />
              </div>
              <div className="pt-6 border-t border-slate-200/50">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Investimento Total</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: brand }}>
                      {formatCurrency(proposal.monthly_investment * (proposal.recurring_months || 12))}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    Pagamento via {proposal.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                                   proposal.payment_method === 'pix' ? 'PIX' : 
                                   proposal.payment_method === 'transfer' ? 'Transferência' : 'Boleto'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <Stat 
                  label="Valor do Projeto" 
                  value={formatCurrency(proposal.one_time_investment)} 
                  highlight 
                  brand={brand} 
                />
                <Stat 
                  label="Parcelamento" 
                  value={`${proposal.installments || 1}x de ${formatCurrency(proposal.one_time_investment / (proposal.installments || 1))}`} 
                  brand={brand} 
                />
              </div>
              <div className="pt-6 border-t border-slate-200/50 text-right">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Forma de Pagamento</p>
                <p className="text-sm font-semibold mt-1">
                  {proposal.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                   proposal.payment_method === 'pix' ? 'PIX' : 
                   proposal.payment_method === 'transfer' ? 'Transferência' : 'Boleto'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Contract */}
        {contractContent && (
          <div className="px-8 py-10 border-b border-slate-100 bg-slate-50/50 print:bg-white page-break-before">
            <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-8 text-center print:mt-10">
              Contrato de Prestação de Serviços
            </h2>
            <div className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap font-serif px-4 sm:px-8">
              {contractContent}
            </div>
          </div>
        )}

        {/* Signature */}
        <div className="px-8 py-10">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4">
            Aceite digital
          </h2>
          {accepted ? (
            <div className="grid sm:grid-cols-2 gap-8 mt-4">
              <div className="rounded-xl border border-slate-200 p-6 bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <CheckCircle2 className="size-12 text-slate-900" />
                </div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-4">Contratada (Agência)</p>
                <p className="text-sm font-bold text-slate-900">{agency?.name}</p>
                <div className="mt-4 pt-4 border-t border-slate-200 font-serif text-slate-500 text-sm min-h-[60px] flex items-center justify-center">
                  {agency?.agency_signature_url ? (
                    <img src={agency.agency_signature_url} alt="Assinatura" className="max-h-16 object-contain grayscale" />
                  ) : (
                    <span className="italic">Assinado eletronicamente</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Assinado em {proposal.accepted_at && new Date(proposal.accepted_at).toLocaleString("pt-BR")}
                </p>
              </div>

              <div className="rounded-xl border border-green-200 p-6 bg-green-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <CheckCircle2 className="size-12 text-green-600" />
                </div>
                <p className="text-[10px] uppercase tracking-widest text-green-600/60 mb-4">Contratante (Cliente)</p>
                <p className="text-sm font-bold text-slate-900">{proposal.accepted_name}</p>
                <div className="mt-4 pt-4 border-t border-green-200 italic font-serif text-slate-700 text-sm">
                  {proposal.signature_client || proposal.accepted_name}
                </div>
                <p className="text-[10px] text-green-600/60 mt-2">
                  Assinado em {proposal.accepted_at && new Date(proposal.accepted_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Contratada (Agência)</p>
                <p className="text-sm font-bold text-slate-900">{agency?.name}</p>
                <div className="mt-3 pt-3 border-t border-slate-200 min-h-[60px] flex items-center justify-center">
                  {agency?.agency_signature_url ? (
                    <img src={agency.agency_signature_url} alt="Assinatura" className="max-h-16 object-contain" />
                  ) : (
                    <span className="italic text-slate-400 text-xs">Assinatura digital da agência</span>
                  )}
                </div>
              </div>

              <div className="no-print rounded-xl border border-slate-200 p-5 bg-white">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">Contratante (Cliente)</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600">Nome completo *</label>
                    <Input
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Seu nome completo"
                      maxLength={200}
                      className="mt-1.5 bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">CPF *</label>
                    <Input
                      value={signerCpf}
                      onChange={(e) => setSignerCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={20}
                      className="mt-1.5 bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-600 mt-4 block">Assinatura digital</label>
                  <div
                    className="mt-1.5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 min-h-[56px] flex items-center font-serif italic text-slate-700 text-base"
                  >
                    {signerName || <span className="text-slate-400 not-italic text-xs">Sua assinatura aparecerá aqui ao digitar seu nome</span>}
                  </div>
                </div>
                <label className="mt-4 flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <Checkbox
                    checked={acceptTerms}
                    onCheckedChange={(v) => setAcceptTerms(v === true)}
                    className="mt-0.5"
                  />
                  <span>Li e concordo com os termos desta proposta e contrato.</span>
                </label>
                <Button
                  onClick={sign}
                  disabled={signing}
                  className="mt-4 w-full gap-2 text-white bg-green-600 hover:bg-green-700"
                >
                  {signing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileSignature className="size-4" />
                  )}
                  Aprovar e Assinar
                </Button>
              </div>
            </div>
          )}
        </div>


        <div className="px-8 py-4 text-center text-[10px] text-slate-400 border-t border-slate-100">
          {agency?.name ?? "Kasa Marketing"} · Documento gerado por KASA HUB
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
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-2" style={{ color: brand }}>
        {title}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
            <th className="py-2">Item</th>
            <th className="py-2 text-right w-16">Qtd</th>
            <th className="py-2 text-right w-32">Unitário</th>
            <th className="py-2 text-right w-32">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-slate-100 align-top">
              <td className="py-3 pr-2">
                <div className="font-medium text-slate-800">{it.title}</div>
                {it.description && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    {it.description}
                  </div>
                )}
              </td>
              <td className="py-3 text-right text-slate-700">{Number(it.quantity)}</td>
              <td className="py-3 text-right text-slate-700">
                {formatCurrency(Number(it.unit_price))}
              </td>
              <td className="py-3 text-right text-slate-900 font-semibold">
                {formatCurrency(Number(it.quantity) * Number(it.unit_price))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
      className="rounded-xl p-4 bg-white border"
      style={{ borderColor: highlight ? brand : "#e2e8f0" }}
    >
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p
        className="text-2xl font-bold mt-1"
        style={{ color: highlight ? brand : "#0f172a" }}
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
    <div className="flex items-start gap-2">
      <span className="text-slate-400 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm text-slate-800 truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

