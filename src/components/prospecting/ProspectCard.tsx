import React, { useState } from "react";
import {
  Flame,
  Zap,
  Snowflake,
  ExternalLink,
  Phone,
  MessageCircle,
  Globe,
  MapPin,
  Star,
  Users,
  Send,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building2,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Check,
  Lightbulb,
  Search,
  Loader2,
  FileText,
} from "lucide-react";
import type { Prospect, DecisionMaker } from "@/lib/prospecting/types";
import { detectBusinessModel, detectIfFranchise } from "@/lib/prospecting/icp-scoring";
import { SocialIcon } from "@/components/editorial/SocialIcon";
import { enrichCnpjData } from "@/lib/prospecting/search-providers";
import { enrichCnpjServer } from "@/lib/prospecting/prospecting.functions";
import { toast } from "sonner";

interface ProspectCardProps {
  prospect: Prospect;
  onSendToCrm: (prospect: Prospect) => void;
  isImporting?: boolean;
  onUpdateProspect?: (updated: Prospect) => void;
}

export function ProspectCard({
  prospect,
  onSendToCrm,
  isImporting,
  onUpdateProspect,
}: ProspectCardProps) {
  const [showDecisors, setShowDecisors] = useState(true);
  const [showMarketingAudit, setShowMarketingAudit] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isEnrichingCnpj, setIsEnrichingCnpj] = useState(false);
  const [showCnpjInput, setShowCnpjInput] = useState(false);
  const [cnpjInput, setCnpjInput] = useState(prospect.cnpj || "");
  const [currentProspect, setCurrentProspect] = useState<Prospect>(prospect);

  // Sincroniza se o prospect mudar externamente
  React.useEffect(() => {
    setCurrentProspect(prospect);
    if (prospect.cnpj) setCnpjInput(prospect.cnpj);
  }, [prospect]);

  const p = currentProspect;
  const detectedModel = p.businessModel || detectBusinessModel(p);
  const isFranchise = p.isFranchise !== undefined ? p.isFranchise : detectIfFranchise(p);

  // Cores e Ícones do ICP Tier
  const tierConfig = {
    hot: {
      label: "ICP Quente",
      bg: "bg-red-50 text-red-700 border-red-200",
      icon: Flame,
      iconColor: "text-red-500",
    },
    warm: {
      label: "ICP Potencial",
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Zap,
      iconColor: "text-amber-500",
    },
    cold: {
      label: "ICP Frio",
      bg: "bg-blue-50 text-blue-700 border-blue-200",
      icon: Snowflake,
      iconColor: "text-blue-500",
    },
    unfit: {
      label: "Fora do ICP",
      bg: "bg-gray-50 text-gray-600 border-gray-200",
      icon: Snowflake,
      iconColor: "text-gray-400",
    },
  }[p.icpTier];

  const TierIcon = tierConfig.icon;
  const audit = p.marketingAudit;

  const primaryDecisor =
    p.decisionMakers.find((d) => d.isPrimary) || p.decisionMakers[0];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  const handleWhatsApp = () => {
    const clean = (p.whatsapp || p.phone).replace(/\D/g, "");
    const nameToCall = primaryDecisor ? primaryDecisor.name.split(" ")[0] : "Time";
    const feeSnippet = p.financialEstimate ? ` Estruturamos projetos para negócios do porte de vocês com fee sugerido em torno de ${p.financialEstimate.suggestedAgencyFee}.` : "";
    const pitchReason = audit?.salesPitchSuggestion || "identifiquei oportunidades claras de aceleração comercial e captação de clientes para vocês.";
    const msg = encodeURIComponent(
      `Olá ${nameToCall}! Aqui é da Kasa Hub. Analisei a presença digital da ${p.tradeName} e ${pitchReason}${feeSnippet}`
    );
    window.open(`https://wa.me/55${clean}?text=${msg}`, "_blank");
  };

  const handleCopyCustomPitch = () => {
    const nameToCall = primaryDecisor ? primaryDecisor.name.split(" ")[0] : "Time";
    const feeSnippet = p.financialEstimate ? `\n• Projeção de Investimento Kasa Hub: ${p.financialEstimate.suggestedAgencyFee}` : "";
    const pitchText = `Olá ${nameToCall}, tudo bem? Aqui é da Kasa Hub.

Estava analisando o posicionamento digital da *${p.tradeName}* em ${p.city} e notei pontos estratégicos:
${audit?.websiteDiagnosis ? `• Website: ${audit.websiteDiagnosis}` : ""}
${audit?.instagramDiagnosis ? `• Presença Digital: ${audit.instagramDiagnosis}` : ""}
• Diagnóstico Comercial: ${audit?.salesPitchSuggestion || audit?.pitchAngle || "Aceleração de tráfego pago e captação de clientes qualificados"}${feeSnippet}

Consegue 5 minutos nesta semana para conversarmos sobre como transformar essas oportunidades em faturamento direto para a ${p.tradeName}?`;

    navigator.clipboard.writeText(pitchText);
    toast.success("Script completo de abordagem com IA copiado!");
  };

  // Busca e Enriquecimento de Sócios via QSA / Receita Federal
  const handleEnrichCnpj = async (inputVal?: string) => {
    const rawCnpj = (inputVal || cnpjInput || "").replace(/\D/g, "");
    if (rawCnpj.length !== 14) {
      toast.error("Digite um CNPJ válido com 14 dígitos.");
      return;
    }

    setIsEnrichingCnpj(true);
    try {
      let qsaData: any = null;
      try {
        qsaData = await enrichCnpjServer({ data: { cnpj: rawCnpj } });
      } catch {
        qsaData = await enrichCnpjData(rawCnpj);
      }

      if (qsaData && qsaData.decisionMakers && qsaData.decisionMakers.length > 0) {
        const updated: Prospect = {
          ...p,
          cnpj: rawCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
          name: qsaData.razaoSocial || p.name,
          tradeName: qsaData.nomeFantasia || p.tradeName,
          decisionMakers: qsaData.decisionMakers,
        };
        setCurrentProspect(updated);
        onUpdateProspect?.(updated);
        setShowCnpjInput(false);
        toast.success(`${qsaData.decisionMakers.length} sócio(s) localizado(s) na Receita Federal!`);
      } else {
        toast.error("Nenhum sócio ou QSA encontrado para este CNPJ na Receita Federal.");
      }
    } catch (err: any) {
      toast.error(`Erro ao consultar Receita Federal: ${err?.message || "Tente novamente"}`);
    } finally {
      setIsEnrichingCnpj(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9E4DC] overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* 1. Imagem de Capa / Fachada da Empresa + Logo Avatar */}
        <div className="relative h-36 w-full bg-[#121214] overflow-hidden">
          {p.photoUrl && !imgError ? (
            <img
              src={p.photoUrl}
              alt={p.tradeName}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#121214] via-[#1E1E22] to-[#27272A] gap-1">
              <Building2 className="size-8 text-[#FFBC45] opacity-70" />
              <span className="text-[10px] font-mono text-[#869296]">Google Meu Negócio</span>
            </div>
          )}

          {/* Gradiente de Legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {/* Badge ICP Score no Topo da Imagem */}
          <div className="absolute top-2.5 right-2.5">
            <div
              className={`px-2.5 py-1 rounded-xl backdrop-blur-md border shadow-md flex items-center gap-1.5 ${tierConfig.bg}`}
            >
              <TierIcon className={`size-3.5 ${tierConfig.iconColor}`} />
              <span className="text-xs font-black font-mono leading-none">
                {p.icpScore}
                <span className="text-[9px] font-normal opacity-70">/100</span>
              </span>
            </div>
          </div>

          {/* Logo / Favicon da Empresa sobreposto */}
          <div className="absolute -bottom-3 left-4 flex items-end gap-2.5">
            <div className="size-12 rounded-xl bg-white p-0.5 border-2 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
              {p.logoUrl ? (
                <img
                  src={p.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-[#121214] text-[#FFBC45] font-black text-sm flex items-center justify-center rounded-lg">
                  {p.tradeName.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Informações Principais & Categoria */}
        <div className="p-4 pt-5 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#869296] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E9E4DC] truncate">
                  {p.category}
                </span>

                {detectedModel && detectedModel !== "Outro" && (
                  <span className="text-[10px] font-semibold text-[#0C1618] bg-white px-2 py-0.5 rounded-md border border-[#E9E4DC] shadow-2xs">
                    {detectedModel}
                  </span>
                )}

                {isFranchise && (
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 shrink-0">
                    ⚠️ Franquia
                  </span>
                )}
              </div>

              {p.rating > 0 && (
                <div className="flex items-center gap-1 text-[#B45309] font-bold text-xs shrink-0">
                  <Star className="size-3.5 fill-amber-400 text-amber-500" />
                  <span>{p.rating.toFixed(1)}</span>
                  <span className="text-[#869296] font-normal text-[11px]">
                    ({p.reviewCount})
                  </span>
                </div>
              )}
            </div>

            <h3 className="font-display text-base font-bold text-[#0C1618] mt-1 line-clamp-1 group-hover:text-[#FFBC45] transition-colors">
              {p.tradeName || p.name}
            </h3>

            <div className="flex items-center gap-1 text-xs text-[#6A787B] mt-0.5">
              <MapPin className="size-3 text-[#869296] shrink-0" />
              <span className="truncate">
                {p.neighborhood ? `${p.neighborhood}, ` : ""}
                {p.city} - {p.state}
              </span>
            </div>
          </div>

            {/* 3. Diagnóstico Financeiro & Porte Estimado (Visual Clean e Minimalista) */}
            {p.financialEstimate && (
              <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-[#FAF8F5] border border-[#E9E4DC]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[11px] text-[#0C1618]">
                    {p.financialEstimate.estimatedSize}
                  </span>
                  <span className="text-[#869296] text-[11px]">·</span>
                  <span className="text-[11px] text-[#6A787B]">
                    Fat: <strong className="text-[#0C1618] font-semibold">{p.financialEstimate.estimatedMonthlyRevenue.split("/")[0].trim()}</strong>
                  </span>
                </div>
                <div className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  Fee: {p.financialEstimate.suggestedAgencyFee.split("/")[0].trim()}
                </div>
              </div>
            )}

            {/* 4. Diagnóstico de Oportunidade (Clean e Direto) */}
            {audit && (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Lightbulb className="size-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold text-[11px] text-amber-900 truncate">
                      {audit.opportunityLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMarketingAudit(!showMarketingAudit)}
                    className="text-[10px] font-bold text-amber-800 hover:underline shrink-0 cursor-pointer"
                  >
                    {showMarketingAudit ? "Fechar" : "Raio-X"}
                  </button>
                </div>

                {showMarketingAudit && (
                  <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E9E4DC] space-y-1 text-[11px] text-[#6A787B]">
                    <p><strong className="text-[#0C1618]">Site:</strong> {audit.websiteDiagnosis}</p>
                    <p><strong className="text-[#0C1618]">Presença:</strong> {audit.instagramDiagnosis}</p>
                    {audit.salesPitchSuggestion && (
                      <p className="pt-1 text-[#78350F] italic border-t border-[#E9E4DC]">
                        "{audit.salesPitchSuggestion}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. CNPJ, Sócios & Decisores Oficiais */}
            <div className="rounded-xl p-3 bg-[#FAF8F5] border border-[#E9E4DC] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#0C1618] text-xs">
                  <Users className="size-3.5 text-[#0C1618]" />
                  <span>
                    {p.decisionMakers.some((dm) => dm.source === "qsa_receita")
                      ? `Sócios Receita Federal (${p.decisionMakers.filter((dm) => dm.source === "qsa_receita").length})`
                      : "Quadro de Sócios"}
                  </span>
                </div>

                {p.cnpj ? (
                  <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#E9E4DC]">
                    <span className="font-mono text-[10px] font-bold text-[#0C1618]">{p.cnpj}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(p.cnpj!, "CNPJ")}
                      className="p-0.5 text-[#869296] hover:text-[#0C1618] cursor-pointer"
                      title="Copiar CNPJ"
                    >
                      <Copy className="size-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCnpjInput(!showCnpjInput)}
                    className="text-[10px] font-bold text-[#121214] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="size-2.5" />
                    <span>{showCnpjInput ? "Fechar" : "+ Inserir CNPJ"}</span>
                  </button>
                )}
              </div>

              {/* Busca Manual / Atualização de CNPJ */}
              {showCnpjInput && (
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={cnpjInput}
                    onChange={(e) => setCnpjInput(e.target.value)}
                    placeholder="CNPJ (ex: 12.345.678/0001-90)..."
                    className="w-full text-xs px-2 py-1 bg-white border border-[#E9E4DC] rounded-md focus:outline-none text-[#0C1618] font-mono"
                  />
                  <button
                    type="button"
                    disabled={isEnrichingCnpj}
                    onClick={() => handleEnrichCnpj()}
                    className="px-2.5 py-1 bg-[#121214] text-white rounded-md text-[10px] font-bold shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isEnrichingCnpj ? <Loader2 className="size-3 animate-spin" /> : "Puxar Sócios"}
                  </button>
                </div>
              )}

              {/* Lista dos Sócios */}
              <div className="space-y-1.5">
                {p.decisionMakers.some((dm) => dm.source === "qsa_receita") ? (
                  p.decisionMakers
                    .filter((dm) => dm.source === "qsa_receita")
                    .map((dm) => (
                      <div
                        key={dm.id}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-[#E9E4DC] text-xs shadow-2xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-[#0C1618] text-xs block truncate">
                            {dm.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#869296] truncate">
                            <span>{dm.role}</span>
                            {dm.notes && <span>· {dm.notes}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(dm.name, "Nome do Sócio")}
                          className="p-1 rounded hover:bg-gray-100 text-[#869296] hover:text-[#0C1618] cursor-pointer shrink-0"
                          title="Copiar nome do sócio"
                        >
                          <Copy className="size-3" />
                        </button>
                      </div>
                    ))
                ) : (
                  <div className="text-[11px] text-[#869296] bg-white p-2 rounded-lg border border-[#E9E4DC] flex items-center justify-between">
                    <span>Sócio não identificado automaticamente</span>
                    {!showCnpjInput && (
                      <button
                        type="button"
                        onClick={() => setShowCnpjInput(true)}
                        className="text-[10px] text-[#0C1618] font-bold underline cursor-pointer"
                      >
                        Puxar via CNPJ
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Script de Abordagem para Recepção / Secretária */}
              {primaryDecisor && primaryDecisor.name !== "Diretor(a) / Proprietário(a)" && (
                <div className="pt-1 border-t border-[#E9E4DC]">
                  <button
                    type="button"
                    onClick={() => setShowScript(!showScript)}
                    className="text-[10px] font-bold text-[#0C1618] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="size-3 text-[#FFBC45]" />
                    <span>{showScript ? "Ocultar Script Recepção" : "Script de Passagem por Secretária"}</span>
                  </button>

                  {showScript && (
                    <div className="mt-1.5 p-2 rounded-lg bg-white border border-[#E9E4DC] text-[11px] text-[#0C1618] leading-relaxed">
                      "Olá, bom dia! Por favor, gostaria de falar com o <strong>{primaryDecisor.name.split(" ")[0]}</strong>. Aqui é da Kasa Hub sobre o projeto de captação digital da {p.tradeName}."
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Canais Rápidos */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {p.phone && (
                <button
                  type="button"
                  onClick={() => handleCopy(p.phone, "Telefone")}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[11px] font-medium text-[#0C1618] cursor-pointer"
                >
                  <Phone className="size-3 text-[#869296]" />
                  <span>{p.phone}</span>
                </button>
              )}

              {p.whatsapp && (
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-700 cursor-pointer"
                >
                  <MessageCircle className="size-3 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>
              )}

              {p.instagram && (
                <a
                  href={`https://instagram.com/${p.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 border border-pink-200 text-[11px] font-medium text-pink-700"
                >
                  <SocialIcon network="instagram" size={12} />
                  <span>@{p.instagram}</span>
                </a>
              )}

              {p.website && (
                <a
                  href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[11px] font-medium text-blue-700"
                >
                  <Globe className="size-3 text-blue-600" />
                  <span>Site</span>
                </a>
              )}

              {p.googleMapsUrl && (
                <a
                  href={p.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[11px] font-medium text-amber-800"
                >
                  <MapPin className="size-3 text-amber-600" />
                  <span>Maps</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 6. Footer de Conversão */}
      <div className="p-4 pt-3 border-t border-[#F0ECE4] flex items-center justify-between gap-2 bg-[#FAF8F5]">
        <div className="flex items-center gap-1.5">
          {p.status === "imported" ? (
            <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="size-3.5" /> No CRM
            </span>
          ) : (
            <button
              type="button"
              onClick={handleCopyCustomPitch}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[#78350F] text-[11px] font-bold transition active:scale-95 cursor-pointer"
              title="Copiar mensagem personalizada com dados do Sócio, Porte e Diagnóstico da empresa"
            >
              <Sparkles className="size-3 text-[#FFBC45]" />
              <span>Copiar Pitch IA</span>
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={p.status === "imported" || isImporting}
          onClick={() => onSendToCrm(p)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
            p.status === "imported"
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-[#121214] hover:bg-[#27272A] text-white active:scale-95"
          }`}
        >
          <Send className="size-3 text-[#FFBC45]" />
          <span>{p.status === "imported" ? "Lead Criado" : "Enviar para CRM"}</span>
        </button>
      </div>
    </div>
  );
}
