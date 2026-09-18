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
import { StorageImage } from "@/components/ui/storage-image";
import { getOrigin } from "@/lib/get-origin";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import logoWhiteAsset from "@/assets/logo-white.png.asset.json";


export const Route = createFileRoute("/proposta/$token")({
  loader: async ({ params }) => {
    try {
      const { data: prop } = await supabase
        .from("proposals")
        .select("title, client_name")
        .eq("public_token", params.token)
        .maybeSingle();

      return {
        proposalMeta: prop || null,
      };
    } catch {
      return { proposalMeta: null };
    }
  },
  head: ({ loaderData }) => {
    const meta = loaderData?.proposalMeta;
    const client = meta?.client_name ? ` · ${meta.client_name}` : "";
    const title = meta?.title
      ? `Proposta Comercial — ${meta.title}${client} | Kasa`
      : "Proposta Comercial | Kasa Marketing & Consultoria";
    const desc =
      "Acesse a proposta comercial, confira o escopo detalhado de serviços e realize a assinatura digital com validade jurídica.";
    const ogImage = "https://kasahub.lovable.app/icon-512.png";

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: ogImage },
        { property: "og:image:secure_url", content: ogImage },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "512" },
        { property: "og:image:height", content: "512" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: ogImage },
      ],
    };
  },
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
  created_at: string | null;
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
  scheduled_adjustments?: Array<{ from_month: number; value: number }> | null;
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
  is_special_negotiation?: boolean;
  payment_installments_config?: Array<{ percent: number; due_kind: string; due_date?: string }> | null;
};
type Agency = {
  name: string;
  logo_url: string | null;
  logo_white_url: string | null;
  logo_yellow_url: string | null;
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

function computeRecurringTotal(monthly: number, months: number, adjustments?: Array<{ from_month: number; value: number }> | null): number {
  const base = Number(monthly || 0);
  const m = Number(months || 0);
  const sorted = Array.isArray(adjustments)
    ? [...adjustments].filter(a => a && Number(a.from_month) > 0).sort((a, b) => Number(a.from_month) - Number(b.from_month))
    : [];
  let total = 0;
  for (let i = 1; i <= m; i++) {
    const match = [...sorted].reverse().find(a => Number(a.from_month) <= i);
    total += match ? Number(match.value || 0) : base;
  }
  return total;
}

function PublicProposalView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
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
  const lastDataRef = useRef<string | null>(null);
  const signingRef = useRef(false);
  signingRef.current = signing;

  async function load(silent = false) {
    // Only show the full-screen loader on the very first load.
    // Background refreshes must be invisible to the user (no flicker / scroll reset).
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/public/proposta/${token}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });

      if (res.status === 404) {
        if (!silent) setErrorCode("not_found");
        return;
      }

      if (res.ok) {
        const text = await res.text();
        // Skip re-render entirely if nothing changed since the last fetch.
        if (lastDataRef.current === text) {
          if (!silent) setErrorCode(null);
          return;
        }
        lastDataRef.current = text;
        setData(JSON.parse(text));
        setErrorCode(null);
        return;
      }

      // If API route returned an error (500, etc.), execute direct resilient client fallback
      throw new Error("API route response was not ok");
    } catch (apiError) {
      console.warn("[PublicProposalView] Primary API fetch failed, attempting resilient Supabase direct fallback...", apiError);
      try {
        const { data: prop, error: propErr } = await supabase
          .from("proposals")
          .select("*")
          .eq("public_token", token)
          .maybeSingle();

        if (propErr || !prop) {
          if (!silent) setErrorCode(prop ? "generic" : "not_found");
          return;
        }

        const [{ data: items }, { data: agency }, { data: client }, { data: lead }] = await Promise.all([
          supabase
            .from("proposal_items")
            .select("*")
            .eq("proposal_id", prop.id)
            .order("order_index", { ascending: true }),
          supabase
            .from("agency_settings")
            .select("name, logo_url, logo_proposals_url, brand_primary, brand_secondary, email, phone, website, document, address, agency_signature_url")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          prop.client_id
            ? supabase
                .from("clients")
                .select("name, company, email, phone, document, address, logo_url")
                .eq("id", prop.client_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          prop.lead_id
            ? supabase
                .from("leads")
                .select("name, company, phone, email")
                .eq("id", prop.lead_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        const payload = {
          proposal: prop as unknown as Proposal,
          items: (items ?? []) as Item[],
          agency: (agency ?? null) as Agency,
          client: (client ?? null) as Client,
          lead: (lead ?? null) as Lead,
        };

        const serialized = JSON.stringify(payload);
        if (lastDataRef.current !== serialized) {
          lastDataRef.current = serialized;
          setData(payload);
        }
        setErrorCode(null);
      } catch (fallbackErr) {
        console.error("[PublicProposalView] Both API and Direct Supabase fallback failed:", fallbackErr);
        if (!silent) setErrorCode("generic");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // Rastreamento confiável de visualização única do cliente:
    // 1. Ignora se já registrou visualização nesta sessão do navegador (sessionStorage)
    // 2. Não dispara se for usuário logado da agência
    const trackView = async () => {
      try {
        const sessionKey = `kasa_viewed_${token}`;
        if (typeof window === "undefined" || sessionStorage.getItem(sessionKey)) {
          return;
        }

        // Verifica se há sessão ativa da agência logada
        const { data: authData } = await supabase.auth.getSession();
        const tokenJwt = authData?.session?.access_token;

        const res = await fetch(`/api/public/proposta/${token}/view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(tokenJwt ? { Authorization: `Bearer ${tokenJwt}` } : {}),
          },
        });

        if (res.ok) {
          sessionStorage.setItem(sessionKey, "true");
        }
      } catch (e) {
        console.warn("[Tracking] Falha não-crítica ao registrar abertura:", e);
      }
    };

    trackView();

    const interval = setInterval(() => {
      if (signingRef.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      load(true);
    }, 5000);
    // Refresh imediato quando o cliente volta para a aba
    const onFocus = () => {
      if (signingRef.current) return;
      load(true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onFocus);
    }
    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onFocus);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("print=1")) {
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, [data]);

  const brand = data?.agency?.brand_primary ?? "#FFBC45";

  const [signMode, setSignMode] = useState<"draw" | "type">("type");
  const [typedSignature, setTypedSignature] = useState("");

  const formatCpf = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  async function generateTypedSignatureImage(text: string): Promise<string> {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não suportado");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0c1618";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "italic 40px 'Georgia', 'Playfair Display', serif";

    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL("image/png");
  }

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

    let signatureData: string | undefined;

    if (signMode === "type") {
      const nameForSign = typedSignature.trim() || signerName.trim();
      if (!nameForSign) {
        toast.error("Digite seu nome para a assinatura");
        return;
      }
      signatureData = await generateTypedSignatureImage(nameForSign);
    } else {
      if (sigPad.current?.isEmpty()) {
        toast.error("Você precisa desenhar sua assinatura");
        return;
      }
      try {
        signatureData = sigPad.current?.getTrimmedCanvas().toDataURL("image/png");
      } catch (trimErr) {
        try {
          signatureData = sigPad.current?.getCanvas().toDataURL("image/png");
        } catch (e) {
          toast.error("Não foi possível capturar sua assinatura. Tente novamente.");
          return;
        }
      }
    }

    if (!acceptTerms) {
      toast.error("Você precisa concordar com os termos");
      return;
    }
    if (!acceptRepresentation) {
      toast.error("Você precisa declarar que possui poderes para representar a empresa");
      return;
    }

    if (!signatureData || signatureData.length < 100) {
      toast.error("Assinatura inválida. Forneça sua assinatura novamente.");
      return;
    }

    setSigning(true);
    try {
      const payload = {
        accepted_name: signerName.trim(),
        accepted_cpf: signerCpf.trim().replace(/\s/g, ""),
        accepted_role: signerRole.trim(),
        accepted_email: signerEmail.trim().toLowerCase(),
        signature_data: signatureData,
        accepted_terms: true,
        accepted_representation: true,
      };

      const res = await fetch(`/api/public/proposta/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (j.error === "cancelled") throw new Error("Esta proposta não está mais disponível.");
        if (j.error === "already_accepted") throw new Error("Esta proposta já foi aprovada.");
        throw new Error(j.error || j.details || "Erro ao aprovar a proposta. Tente novamente.");
      }
      toast.success("Proposta assinada com sucesso! Bem-vindo(a) à Kasa.");
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
        computeRecurringTotal(proposal.monthly_investment, proposal.recurring_months || 12, proposal.scheduled_adjustments) + proposal.one_time_investment,
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

  if (!mounted || loading) {
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

        @page {
          size: A4;
          margin: 12mm 10mm;
        }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-avoid-break, .print-avoid-break * { break-inside: avoid; page-break-inside: avoid; }
          section, .rounded-2xl, .rounded-3xl, article, .card { break-inside: avoid; page-break-inside: avoid; }
          img, svg { break-inside: avoid; page-break-inside: avoid; max-width: 100% !important; height: auto !important; }
          h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

      `}</style>

      {/* Top Bar / Agency Signature Bar */}
      <div className="no-print sticky top-0 z-50 bg-[#0c1618] text-white border-b border-black/40 shadow-md transition-all">
        <div className="h-[3px] bg-[#ffbc45] w-full" />
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
           <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={agency?.logo_white_url || agency?.logo_proposals_url || agency?.logo_url || logoWhiteAsset.url}
                alt="Kasa Marketing e Consultoria"
                className="h-7 sm:h-8 w-auto object-contain shrink-0 brightness-0 invert"
                onError={(e) => {
                  e.currentTarget.classList.remove("brightness-0", "invert");
                  e.currentTarget.src = "https://fduofhsiahyxvlaxthhe.supabase.co/storage/v1/object/public/logos/logo-yellow.png";
                }}
              />
              <div className="flex flex-col min-w-0 border-l border-white/15 pl-3">
                 <span className="text-xs font-bold font-sans tracking-tight leading-none truncate text-white">
                   Kasa Marketing & Consultoria
                 </span>
                 <span className="text-[10px] text-[#ffbc45] font-sans truncate mt-0.5 font-mono">
                   {proposal.number_display || "PROPOSTA COMERCIAL"}
                 </span>
              </div>
           </div>

           <div className="flex items-center gap-3 shrink-0">
             <div className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded font-mono flex items-center gap-1.5 ${accepted ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-amber-950/80 text-[#ffbc45] border border-amber-800/80'}`}>
                <span className={`size-1.5 rounded-full ${accepted ? 'bg-emerald-400' : 'bg-[#ffbc45]'}`} />
                {accepted ? "Aprovada" : "Aguardando Assinatura"}
             </div>
             <Button
               variant="outline"
               size="sm"
               onClick={() => window.print()}
               className="gap-2 rounded px-3.5 h-8 border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium font-sans text-xs"
             >
               <Printer className="size-3.5 text-white/70" /> <span className="hidden sm:inline">Exportar</span> PDF
             </Button>
           </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-8 space-y-8">
        {/* Editorial Header / Agency Proposal Hero */}
        <div className="bg-white rounded-xl border border-stone-300/80 shadow-xs overflow-hidden">
           {/* Agency Top Ribbon */}
           <div className="bg-[#0c1618] text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-black">
              <div className="flex items-center gap-5">
                <div className="h-14 sm:h-16 w-auto max-w-[180px] sm:max-w-[220px] flex items-center justify-start shrink-0">
                  <img
                    src={agency?.logo_white_url || agency?.logo_proposals_url || agency?.logo_url || logoWhiteAsset.url}
                    alt="Kasa Marketing e Consultoria"
                    className="h-full w-auto object-contain max-h-14 sm:max-h-16 brightness-0 invert"
                    onError={(e) => {
                      e.currentTarget.classList.remove("brightness-0", "invert");
                      e.currentTarget.src = "https://fduofhsiahyxvlaxthhe.supabase.co/storage/v1/object/public/logos/logo-yellow.png";
                    }}
                  />
                </div>
                <div className="border-l border-white/15 pl-4">
                  <h3 className="font-display font-bold text-lg sm:text-xl text-white tracking-tight leading-tight">
                    Kasa Marketing & Consultoria
                  </h3>
                  <p className="text-[11px] text-white/60 font-mono mt-1">
                    {agency?.document || "CNPJ: 51.920.226/0001-41"} · {agency?.email || "relacionamentokasa@gmail.com"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end text-left sm:text-right font-mono text-[11px] text-white/60 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0 w-full sm:w-auto">
                <div className="text-xs font-bold text-[#ffbc45] uppercase tracking-wider mb-0.5">
                  {proposal.number_display || "PROPOSTA COMERCIAL"}
                </div>
                <div>Emissão: {proposal.created_at ? new Date(proposal.created_at).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR")}</div>
                {proposal.valid_until && <div>Validade: {new Date(proposal.valid_until).toLocaleDateString("pt-BR")}</div>}
              </div>
           </div>

           {/* Hero Content Section */}
           <div className="p-6 sm:p-10 md:p-12">
             <div className="flex items-center gap-2 mb-4">
               <span className="h-2 w-2 bg-[#ffbc45]" />
               <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#0c1618]">
                 Planejamento Estratégico & Escopo Comercial
               </span>
             </div>

             <h1 className="font-display text-3xl sm:text-5xl font-bold text-[#0c1618] tracking-tight leading-[1.1] mb-6">
               {proposal.title}
             </h1>

             {proposal.intro && (
               <p className="text-sm sm:text-base text-stone-600 font-sans leading-relaxed max-w-3xl mb-8 whitespace-pre-line border-l-2 border-[#ffbc45] pl-4">
                 {proposal.intro}
               </p>
             )}

             {/* Client Tag */}
             <div className="inline-flex items-center gap-3.5 bg-stone-50 border border-stone-200 p-3 sm:p-3.5 pr-6 rounded-lg">
               <div className="size-10 rounded bg-[#0c1618] text-[#ffbc45] flex items-center justify-center font-bold text-xs font-mono shrink-0 overflow-hidden">
                 {client?.logo_url ? (
                   <StorageImage src={client.logo_url} className="w-full h-full object-cover" alt="Client Logo" />
                 ) : (
                   (lead?.name || client?.name || proposal.client_name).substring(0, 2).toUpperCase()
                 )}
               </div>
               <div>
                 <p className="text-[9px] uppercase font-mono font-bold text-stone-400 tracking-wider">Documento preparado para</p>
                 <p className="text-sm sm:text-base font-bold text-[#0c1618] font-sans">
                   {client?.company || lead?.company || proposal.client_name}
                 </p>
               </div>
             </div>
           </div>
        </div>

        {/* Dados do Contratante */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-stone-300/80 shadow-xs">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-stone-200">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#0c1618] flex items-center gap-2 font-mono">
              <span className="size-2 bg-[#ffbc45]" />
              Dados do Contratante
            </h2>
            <span className="text-[10px] font-mono text-stone-400">INFORMAÇÕES DE CADASTRO</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-[#0c1618]">
            <div className="border border-stone-200 p-4 rounded-lg bg-stone-50/50">
               <p className="text-[9px] font-mono uppercase font-bold text-stone-400 tracking-wider">Responsável</p>
               <p className="font-bold font-sans truncate text-sm mt-1 text-[#0c1618]">{lead?.name || client?.name || proposal.client_name || "—"}</p>
            </div>
            <div className="border border-stone-200 p-4 rounded-lg bg-stone-50/50">
               <p className="text-[9px] font-mono uppercase font-bold text-stone-400 tracking-wider">Empresa</p>
               <p className="font-bold font-sans truncate text-sm mt-1 text-[#0c1618]">{lead?.company || client?.company || proposal.client_name || '—'}</p>
            </div>
            <div className="border border-stone-200 p-4 rounded-lg bg-stone-50/50">
               <p className="text-[9px] font-mono uppercase font-bold text-stone-400 tracking-wider">Telefone</p>
               <p className="font-bold font-sans truncate text-sm mt-1 text-[#0c1618]">{lead?.phone || client?.phone || '—'}</p>
            </div>
            <div className="border border-stone-200 p-4 rounded-lg bg-stone-50/50">
               <p className="text-[9px] font-mono uppercase font-bold text-stone-400 tracking-wider">E-mail</p>
               <p className="font-bold font-sans truncate text-sm mt-1 text-[#0c1618]">{lead?.email || client?.email || proposal.client_email || '—'}</p>
            </div>
          </div>
        </div>

        {/* Escopo & Serviços */}
        <div className="bg-white p-6 sm:p-10 rounded-xl border border-stone-300/80 shadow-xs">
           <div className="flex items-center justify-between mb-8 pb-3 border-b border-stone-200">
             <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#0c1618] flex items-center gap-2 font-mono">
               <span className="size-2 bg-[#ffbc45]" />
               Escopo de Entregas & Serviços
             </h2>
             <span className="text-[10px] font-mono text-stone-400">DETALHAMENTO TÉCNICO</span>
           </div>

           <div className="bg-stone-50/60 p-6 sm:p-8 rounded-lg border border-stone-200">
              <ScopeRenderer text={proposal.scope_text || (proposal.scope as any)} className="text-[#0c1618]" />
           </div>
        </div>

        {/* Investimento */}
        <div className="bg-[#0c1618] text-white p-6 sm:p-10 rounded-xl border border-black shadow-md">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#ffbc45] flex items-center gap-2 font-mono">
                <span className="size-2 bg-[#ffbc45]" />
                Condições Comerciais & Investimento
              </h2>
              <span className="text-[10px] font-mono text-stone-400">VALORES E CONDIÇÕES</span>
            </div>

            { (proposal.contract_type === 'avulso' || proposal.contract_type === 'one_time') ? (
              <div className="flex flex-col items-center md:items-start mb-8">
                <div className="w-full text-center md:text-left mb-2">
                    <p className="text-[10px] uppercase font-mono tracking-widest text-stone-400">Investimento Total do Projeto</p>
                    <p className="text-4xl sm:text-6xl font-bold text-[#ffbc45] font-display tracking-tight mt-1">{formatCurrency(proposal.total || proposal.one_time_investment)}</p>
                </div>
                {proposal.installments && proposal.installments > 1 && (
                  <div className="w-full text-center md:text-left mt-2">
                    <span className="inline-block px-3.5 py-1.5 rounded border border-white/15 text-xs sm:text-sm font-medium text-stone-300 font-mono">
                      Condição: <strong className="text-white">{proposal.installments}x de {formatCurrency((proposal.total || proposal.one_time_investment) / proposal.installments)}</strong>
                    </span>
                  </div>
                )}
              </div>
            ) : proposal.monthly_investment <= 0 && proposal.one_time_investment > 0 ? (
              <div className="flex flex-col items-center md:items-start mb-8">
                <div className="w-full text-center md:text-left mb-2">
                  <p className="text-[10px] uppercase font-mono tracking-widest text-stone-400">
                    Entrada / Setup {(!proposal.installments || proposal.installments <= 1) ? "(à vista)" : `(em ${proposal.installments}x)`}
                  </p>
                  <p className="text-4xl sm:text-6xl font-bold text-[#ffbc45] font-display tracking-tight mt-1">{formatCurrency(proposal.one_time_investment)}</p>
                </div>
                {proposal.installments && proposal.installments > 1 && (
                  <div className="w-full text-center md:text-left mt-2">
                    <span className="inline-block px-3.5 py-1.5 rounded border border-white/15 text-xs sm:text-sm font-medium text-stone-300 font-mono">
                      {proposal.installments}x de <strong className="text-white">{formatCurrency(proposal.one_time_investment / proposal.installments)}</strong>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-lg bg-white/[0.04] border border-white/10 mb-6">
                    <div className="text-center md:text-left">
                        <p className="text-[10px] uppercase font-mono tracking-widest text-stone-400">Investimento Recorrente</p>
                        <p className="text-4xl sm:text-5xl font-bold text-[#ffbc45] font-display tracking-tight mt-1">{formatCurrency(proposal.monthly_investment)}<span className="text-sm sm:text-base font-sans text-stone-400 font-normal">/mês</span></p>
                    </div>
                    <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                        <p className="text-[10px] uppercase font-mono tracking-widest text-stone-400">Investimento Total no Ciclo</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white font-display tracking-tight mt-1">{formatCurrency(computeRecurringTotal(proposal.monthly_investment, proposal.recurring_months || 12, proposal.scheduled_adjustments) + proposal.one_time_investment)}</p>
                        <p className="text-[10px] text-stone-400 mt-1 font-mono">Período de {proposal.recurring_months || 12} meses</p>
                    </div>
                </div>
                {proposal.one_time_investment > 0 && (
                  <div className="bg-[#ffbc45]/10 border border-[#ffbc45]/25 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase font-mono tracking-widest text-[#ffbc45] font-bold">
                        Taxa de Implementação / Setup {(!proposal.installments || proposal.installments <= 1) ? "(à vista)" : `(em ${proposal.installments}x)`}
                      </p>
                      <p className="text-xs text-stone-300 font-sans mt-0.5">
                        {(!proposal.installments || proposal.installments <= 1)
                          ? "Faturamento inicial pago no início das operações"
                          : `${proposal.installments}x de ${formatCurrency(proposal.one_time_investment / proposal.installments)}`}
                      </p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-[#ffbc45] font-display shrink-0">{formatCurrency(proposal.one_time_investment)}</p>
                  </div>
                )}
              </div>
            )}


            {proposal.contract_type === 'recurring' && Array.isArray(proposal.scheduled_adjustments) && proposal.scheduled_adjustments.length > 0 && (
              <div className="mb-8 bg-white/5 border border-white/10 rounded-lg p-5">
                <p className="text-[10px] uppercase font-mono tracking-widest text-[#ffbc45] font-bold mb-3">Cronograma de Reajustes</p>
                <ul className="space-y-2">
                  <li className="flex justify-between text-xs sm:text-sm font-sans text-stone-300 pb-1.5 border-b border-white/5">
                    <span>A partir do 1º mês</span>
                    <span className="font-bold text-white font-mono">{formatCurrency(proposal.monthly_investment)}/mês</span>
                  </li>
                  {[...proposal.scheduled_adjustments]
                    .sort((a, b) => a.from_month - b.from_month)
                    .map((adj, i) => (
                      <li key={i} className="flex justify-between text-xs sm:text-sm font-sans text-stone-300 pb-1.5 border-b border-white/5">
                        <span>A partir do {adj.from_month}º mês</span>
                        <span className="font-bold text-[#ffbc45] font-mono">{formatCurrency(adj.value)}/mês</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {(() => {
              const setupOnly = proposal.monthly_investment <= 0 && proposal.one_time_investment > 0;
              const cols = setupOnly ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-4';
              return (
                <div className={`grid ${cols} gap-3 sm:gap-4`}>
                    <div className="bg-white/5 border border-white/10 p-3.5 sm:p-4 rounded-lg">
                        <p className="text-[9px] uppercase font-mono tracking-widest text-stone-400">Modelo</p>
                        <p className="text-xs sm:text-sm font-bold font-sans capitalize mt-0.5">
                          {setupOnly ? 'Projeto Pontual' : proposal.contract_type === 'recurring' ? 'Assinatura Mensal' : 'Projeto Pontual'}
                        </p>
                    </div>
                    {!setupOnly && (
                      <div className="bg-white/5 border border-white/10 p-3.5 sm:p-4 rounded-lg">
                          <p className="text-[9px] uppercase font-mono tracking-widest text-stone-400">Vigência</p>
                          <p className="text-xs sm:text-sm font-bold font-sans mt-0.5">{
                            proposal.contract_term === "indeterminado"
                              ? "Indeterminado"
                              : proposal.contract_term === "monthly"
                                ? "Mensal"
                                : `${proposal.recurring_months || 12} meses`
                          }</p>
                      </div>
                    )}
                    <div className="bg-white/5 border border-white/10 p-3.5 sm:p-4 rounded-lg">
                        <p className="text-[9px] uppercase font-mono tracking-widest text-stone-400">Início Previsto</p>
                        <p className="text-xs sm:text-sm font-bold font-sans mt-0.5">{proposal.service_start_date ? new Date(proposal.service_start_date + 'T00:00:00').toLocaleDateString("pt-BR") : 'Imediato'}</p>
                    </div>
                    {!setupOnly && (
                      <div className="bg-white/5 border border-white/10 p-3.5 sm:p-4 rounded-lg">
                          <p className="text-[9px] uppercase font-mono tracking-widest text-stone-400">Dia de Vencimento</p>
                          <p className="text-xs sm:text-sm font-bold font-sans mt-0.5">Todo dia {String(proposal.billing_day || (proposal.first_due_date ? new Date(proposal.first_due_date!).getDate() : "5"))}</p>
                      </div>
                    )}
                </div>
              );
            })()}
        </div>

        {/* Contract */}
        {contractContent && proposal.contract_template_id && (
          <div className="bg-white p-6 sm:p-10 rounded-xl border border-stone-300/80 shadow-xs page-break-before">
             <div className="flex items-center justify-between mb-8 pb-3 border-b border-stone-200">
               <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#0c1618] flex items-center gap-2 font-mono">
                 <span className="size-2 bg-[#ffbc45]" />
                 Instrumento Jurídico & Termos
               </h2>
               <span className="text-[10px] font-mono text-stone-400">MINUTA CONTRATUAL</span>
             </div>

             <h3 className="text-lg sm:text-xl font-bold text-[#0c1618] mb-8 text-center font-display">Contrato de Prestação de Serviços</h3>

            <div className="text-xs sm:text-sm leading-relaxed text-stone-700 text-justify space-y-4 font-sans max-w-3xl mx-auto">
              {contractContent.split('\n').map((line, i) => {
                const isClauseTitle = /^\d+\.\s+[A-Z\s]+$/.test(line.trim());
                if (isClauseTitle) {
                  return <div key={i} className="font-display font-bold text-base mt-6 mb-3 text-[#0c1618]">{line}</div>;
                }
                return <p key={i}>{line}</p>;
              })}
            </div>
          </div>
        )}

        {/* Aceite & Assinatura Digital */}
        <div className="bg-white p-6 sm:p-10 rounded-xl border border-stone-300/80 shadow-xs">
          <div className="flex items-center justify-between mb-8 pb-3 border-b border-stone-200">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#0c1618] flex items-center gap-2 font-mono">
              <span className="size-2 bg-[#ffbc45]" />
              Validação & Assinatura Eletrônica
            </h2>
            <span className="text-[10px] font-mono text-stone-400">VALOR JURÍDICO</span>
          </div>

          {accepted ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 flex items-center gap-4 text-emerald-950">
                <div className="size-10 rounded bg-emerald-700 text-white grid place-items-center shrink-0">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base font-sans">Proposta Aprovada com Sucesso</h4>
                  <p className="text-xs text-emerald-800 font-sans mt-0.5">
                    Este documento foi autenticado digitalmente e possui validade jurídica conforme a legislação brasileira.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div className="p-6 rounded-lg border bg-stone-50/50 border-emerald-300 relative overflow-hidden font-sans">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase font-mono font-bold text-stone-400">Contratante (Cliente)</p>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <p className="font-bold text-base text-[#0c1618]">{proposal.accepted_name}</p>
                  <div className="border-t border-stone-200 pt-4 mt-3 flex flex-col items-center justify-center min-h-[90px]">
                     {proposal.client_signature_data ? (
                       <img src={proposal.client_signature_data} alt="Assinatura" className="max-h-16 object-contain" />
                     ) : (
                       <p className="italic text-stone-400 text-xs font-mono">Assinado digitalmente</p>
                     )}
                     <p className="text-[9px] text-stone-400 mt-3 font-mono">Assinado em: {proposal.accepted_at ? new Date(proposal.accepted_at).toLocaleString("pt-BR") : '—'}</p>
                  </div>
                </div>

                <div className="p-6 rounded-lg border bg-stone-50/50 border-stone-200 relative overflow-hidden font-sans">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#ffbc45]" />
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] uppercase font-mono font-bold text-stone-400">Contratada (Agência)</p>
                    <CheckCircle2 className="size-4 text-[#0c1618]" />
                  </div>
                  <p className="font-bold text-base text-[#0c1618]">Kasa Marketing & Consultoria</p>
                  <div className="border-t border-stone-200 pt-4 mt-3 flex flex-col items-center justify-center min-h-[90px]">
                     {agency?.agency_signature_url ? (
                       <img src={agency.agency_signature_url} alt="Assinatura" className="max-h-16 object-contain" />
                     ) : (
                       <p className="italic text-stone-400 text-xs font-mono">Assinado digitalmente</p>
                     )}
                     <p className="text-[9px] text-stone-400 mt-3 font-mono">Representante Legal</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 font-sans">
               <div className="no-print bg-stone-50/70 rounded-lg p-6 sm:p-8 border border-stone-200">
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-widest">Nome completo</label>
                      <Input value={signerName} onChange={(e) => {
                        setSignerName(e.target.value);
                        if (!typedSignature) setTypedSignature(e.target.value);
                      }} placeholder="Seu nome" className="bg-white rounded h-11 border-stone-300" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-widest">CPF</label>
                      <Input value={signerCpf} onChange={(e) => setSignerCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} className="bg-white rounded h-11 border-stone-300" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-widest">Cargo na Empresa</label>
                      <Input value={signerRole} onChange={(e) => setSignerRole(e.target.value)} placeholder="Ex: Sócio / Diretor" className="bg-white rounded h-11 border-stone-300" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-widest">E-mail Corporativo</label>
                      <Input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="seu@empresa.com" className="bg-white rounded h-11 border-stone-300" />
                    </div>
                  </div>

                  <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-widest">Assinatura</label>
                      <div className="flex items-center gap-1 bg-stone-200 p-1 rounded">
                        <button
                          type="button"
                          onClick={() => setSignMode("type")}
                          className={cn(
                            "px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer",
                            signMode === "type" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                          )}
                        >
                          Digitar Nome
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignMode("draw")}
                          className={cn(
                            "px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer",
                            signMode === "draw" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                          )}
                        >
                          Desenhar
                        </button>
                      </div>
                    </div>

                    {signMode === "type" ? (
                      <div className="space-y-2 bg-white p-5 rounded border border-stone-300 shadow-xs">
                        <div className="min-h-[100px] flex items-center justify-center bg-stone-50 rounded border border-dashed border-stone-300 p-4">
                          <span className="text-2xl sm:text-3xl font-display italic font-semibold text-[#0c1618] select-none tracking-wide text-center">
                            {typedSignature.trim() || signerName.trim() || "Sua Assinatura"}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-stone-400 text-center">
                          Sua assinatura digital será vinculada com carimbo de tempo e IP.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white border border-stone-300 rounded overflow-hidden relative shadow-xs">
                        <div className="absolute top-2 right-2 z-10">
                          <Button variant="ghost" size="sm" onClick={() => sigPad.current?.clear()} className="h-6 text-[10px] text-stone-500 hover:text-stone-800">
                            Limpar
                          </Button>
                        </div>
                        <SignatureCanvas ref={sigPad} penColor='#0c1618' canvasProps={{ className: 'w-full min-h-[130px] cursor-crosshair bg-white' }} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-8">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <Checkbox checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} className="mt-0.5 rounded" />
                      <span className="text-xs text-stone-700 leading-snug">Declaro que li e concordo integralmente com os termos e valores descritos nesta proposta comercial.</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <Checkbox checked={acceptRepresentation} onCheckedChange={(v) => setAcceptRepresentation(v === true)} className="mt-0.5 rounded" />
                      <span className="text-xs text-stone-700 leading-snug">Declaro possuir plenos poderes para representar a empresa contratante.</span>
                    </label>
                  </div>

                  <Button onClick={sign} disabled={signing} className="w-full h-12 bg-[#ffbc45] hover:bg-[#ffc864] text-[#0c1618] font-bold uppercase tracking-widest text-xs sm:text-sm rounded transition-all shadow-md hover:shadow-lg cursor-pointer">
                    {signing ? <Loader2 className="animate-spin size-5" /> : "Aprovar e Assinar Proposta"}
                  </Button>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-stone-300/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="size-2 bg-[#ffbc45]" />
              <p className="text-[11px] font-mono text-stone-500">© 2026 Kasa Marketing & Consultoria · Documento confidencial</p>
            </div>
            <p className="text-[11px] text-[#0c1618] font-bold uppercase tracking-wider font-mono">Autenticidade & Segurança Digital</p>
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

