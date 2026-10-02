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
} from "lucide-react";
import type { Prospect, DecisionMaker } from "@/lib/prospecting/types";
import { SocialIcon } from "@/components/editorial/SocialIcon";
import { toast } from "sonner";

interface ProspectCardProps {
  prospect: Prospect;
  onSendToCrm: (prospect: Prospect) => void;
  isImporting?: boolean;
  onEnrichCnpj?: (prospect: Prospect) => void;
}

export function ProspectCard({
  prospect,
  onSendToCrm,
  isImporting,
  onEnrichCnpj,
}: ProspectCardProps) {
  const [showDecisors, setShowDecisors] = useState(true);
  const [showMarketingAudit, setShowMarketingAudit] = useState(true);
  const [showScript, setShowScript] = useState(false);

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
  }[prospect.icpTier];

  const TierIcon = tierConfig.icon;
  const audit = prospect.marketingAudit;

  const primaryDecisor =
    prospect.decisionMakers.find((d) => d.isPrimary) || prospect.decisionMakers[0];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  const handleWhatsApp = () => {
    const clean = (prospect.whatsapp || prospect.phone).replace(/\D/g, "");
    const nameToCall = primaryDecisor ? primaryDecisor.name.split(" ")[0] : "Time";
    const msg = encodeURIComponent(
      `Olá ${nameToCall}! Aqui é da Kasa Hub. Analisei a presença digital da ${prospect.tradeName} e identifiquei oportunidades claras de aceleração comercial para vocês.`
    );
    window.open(`https://wa.me/55${clean}?text=${msg}`, "_blank");
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9E4DC] p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div className="space-y-3.5">
        {/* 1. Header do Card: Categoria, Nome da Empresa e Score Badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#869296] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E9E4DC]">
              {prospect.category}
            </span>
            <h3 className="font-display text-base font-bold text-[#0C1618] mt-1.5 line-clamp-1 group-hover:text-[#FFBC45] transition-colors">
              {prospect.tradeName || prospect.name}
            </h3>
            {prospect.cnpj && (
              <p className="text-[11px] font-mono text-[#869296] mt-0.5">
                CNPJ: {prospect.cnpj}
              </p>
            )}
          </div>

          {/* Badge ICP Score */}
          <div
            className={`px-3 py-1 rounded-xl border flex items-center gap-1.5 shrink-0 ${tierConfig.bg}`}
          >
            <TierIcon className={`size-3.5 ${tierConfig.iconColor}`} />
            <div className="text-right">
              <span className="text-xs font-black font-mono leading-none block">
                {prospect.icpScore}
                <span className="text-[9px] font-normal opacity-70">/100</span>
              </span>
              <span className="text-[9px] font-bold block">{tierConfig.label}</span>
            </div>
          </div>
        </div>

        {/* 2. Badge de Oportunidade & Classificação de Marketing */}
        {audit && (
          <div className="space-y-2">
            <div
              className={`p-2.5 rounded-xl border flex items-start gap-2 text-xs leading-tight font-medium ${audit.opportunityBadgeColor}`}
            >
              <Lightbulb className="size-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">{audit.opportunityLabel}</span>
                <span className="text-[11px] opacity-90 block mt-0.5">
                  {audit.pitchAngle}
                </span>
              </div>
            </div>

            {/* Painel de Auditoria de Canais (Site, Insta, Tráfego) */}
            <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#E9E4DC]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#0C1618] flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-[#FFBC45]" />
                  Raio-X de Maturidade de Marketing
                </span>
                <button
                  type="button"
                  onClick={() => setShowMarketingAudit(!showMarketingAudit)}
                  className="text-[#869296] hover:text-[#0C1618] text-[10px] flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{showMarketingAudit ? "Ocultar" : "Detalhes"}</span>
                  {showMarketingAudit ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              </div>

              {showMarketingAudit && (
                <div className="mt-2.5 space-y-1.5 text-[11px]">
                  {/* Website & Pixel */}
                  <div className="flex items-start gap-2 bg-white p-2 rounded-lg border border-[#E9E4DC]">
                    <Globe className="size-3.5 text-[#869296] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[#0C1618] flex items-center gap-1.5">
                        <span>Website:</span>
                        {audit.websiteStatus === "active_with_pixel" ? (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 rounded-full font-bold">
                            Com Pixel
                          </span>
                        ) : audit.websiteStatus === "active_no_pixel" ? (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 rounded-full font-bold">
                            Sem Pixel
                          </span>
                        ) : (
                          <span className="text-[9px] bg-red-100 text-red-800 px-1.5 rounded-full font-bold">
                            Sem Site Próprio
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#6A787B] mt-0.5">
                        {audit.websiteDiagnosis}
                      </p>
                    </div>
                  </div>

                  {/* Instagram */}
                  <div className="flex items-start gap-2 bg-white p-2 rounded-lg border border-[#E9E4DC]">
                    <div className="shrink-0 mt-0.5">
                      <SocialIcon network="instagram" size={13} />
                    </div>
                    <div>
                      <div className="font-bold text-[#0C1618] flex items-center gap-1.5">
                        <span>Instagram:</span>
                        {audit.instagramStatus === "active_professional" ? (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 rounded-full font-bold">
                            Profissional
                          </span>
                        ) : audit.instagramStatus === "amateur_inhouse" ? (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 rounded-full font-bold">
                            Comunicação Amadora
                          </span>
                        ) : (
                          <span className="text-[9px] bg-gray-100 text-gray-700 px-1.5 rounded-full font-bold">
                            Não Localizado
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#6A787B] mt-0.5">
                        {audit.instagramDiagnosis}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Endereço e Avaliações Google */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6A787B] border-b border-[#F0ECE4] pb-3">
          <div className="flex items-center gap-1">
            <MapPin className="size-3.5 text-[#869296]" />
            <span>
              {prospect.neighborhood ? `${prospect.neighborhood}, ` : ""}
              {prospect.city} - {prospect.state}
            </span>
          </div>

          {prospect.rating > 0 && (
            <div className="flex items-center gap-1 bg-[#FFF9E6] text-[#B45309] px-2 py-0.5 rounded-md font-bold text-[11px]">
              <Star className="size-3 fill-amber-400 text-amber-500" />
              <span>{prospect.rating.toFixed(1)}</span>
              <span className="text-[#869296] font-normal">
                ({prospect.reviewCount})
              </span>
            </div>
          )}
        </div>

        {/* 4. Seção Estratégica de Decisores & Sócios */}
        <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#E9E4DC]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-[#FFBC45]" />
              <span className="text-xs font-bold text-[#0C1618]">
                Decisores & Sócios ({prospect.decisionMakers.length})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowDecisors(!showDecisors)}
              className="text-[#869296] hover:text-[#0C1618] text-[11px] flex items-center gap-0.5 cursor-pointer"
            >
              <span>{showDecisors ? "Ocultar" : "Ver"}</span>
              {showDecisors ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
          </div>

          {showDecisors && (
            <div className="mt-2.5 space-y-2">
              {prospect.decisionMakers.length === 0 ? (
                <div className="text-[11px] text-[#869296] italic py-1">
                  Nenhum sócio identificado no QSA. Consulte o CNPJ para enriquecer.
                </div>
              ) : (
                prospect.decisionMakers.map((dm) => (
                  <div
                    key={dm.id}
                    className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#E9E4DC] text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#0C1618]">{dm.name}</span>
                        {dm.isPrimary && (
                          <span className="text-[9px] bg-[#FFF2D6] text-[#B45309] px-1.5 py-0.2 rounded-full font-bold">
                            Decisor Principal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#6A787B] mt-0.5">
                        <span>{dm.role}</span>
                        <span className="text-[10px] text-[#869296]">
                          •{" "}
                          {dm.source === "qsa_receita"
                            ? "Receita Federal (QSA)"
                            : "LinkedIn"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {dm.linkedinUrl && (
                        <a
                          href={dm.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir LinkedIn do Decisor"
                          className="p-1.5 text-[#0A66C2] hover:bg-blue-50 rounded-md transition"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(dm.name, "Nome do decisor")}
                        title="Copiar Nome"
                        className="p-1.5 text-[#869296] hover:text-[#0C1618] hover:bg-gray-100 rounded-md transition cursor-pointer"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Script de Quebra de Recepção */}
              {primaryDecisor && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowScript(!showScript)}
                    className="text-[10px] font-bold text-[#B45309] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="size-3 text-[#FFBC45]" />
                    <span>
                      {showScript
                        ? "Fechar Script de Recepção"
                        : "Ver Script para Furar a Recepção (Ligação)"}
                    </span>
                  </button>

                  {showScript && (
                    <div className="mt-1.5 p-2.5 rounded-lg bg-[#FFF9E6] border border-[#FDE68A] text-[11px] text-[#78350F] leading-relaxed">
                      <strong>💡 Abordagem Direta na Recepção:</strong>
                      <p className="mt-0.5 italic">
                        "Olá, bom dia! Aqui é da Kasa Hub. Por favor, gostaria de
                        falar com o <strong>{primaryDecisor.name.split(" ")[0]}</strong>{" "}
                        a respeito do diagnóstico de captação digital da{" "}
                        {prospect.tradeName}."
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Canais de Contato Rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          {prospect.phone && (
            <button
              type="button"
              onClick={() => handleCopy(prospect.phone, "Telefone")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium text-[#0C1618] cursor-pointer"
            >
              <Phone className="size-3 text-[#869296]" />
              <span>{prospect.phone}</span>
            </button>
          )}

          {prospect.whatsapp && (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-700 cursor-pointer"
            >
              <MessageCircle className="size-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </button>
          )}

          {prospect.instagram && (
            <a
              href={`https://instagram.com/${prospect.instagram}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 border border-pink-200 text-xs font-medium text-pink-700"
            >
              <SocialIcon network="instagram" size={13} />
              <span>@{prospect.instagram}</span>
            </a>
          )}

          {prospect.website && (
            <a
              href={
                prospect.website.startsWith("http")
                  ? prospect.website
                  : `https://${prospect.website}`
              }
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-medium text-blue-700"
            >
              <Globe className="size-3 text-blue-600" />
              <span>Site</span>
            </a>
          )}
        </div>
      </div>

      {/* 6. Ação de Conversão no CRM */}
      <div className="mt-5 pt-3.5 border-t border-[#F0ECE4] flex items-center justify-between gap-3">
        <div className="text-[11px] text-[#869296]">
          {prospect.status === "imported" ? (
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> No CRM
            </span>
          ) : (
            <span>Descoberto via Garimpo</span>
          )}
        </div>

        <button
          type="button"
          disabled={prospect.status === "imported" || isImporting}
          onClick={() => onSendToCrm(prospect)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
            prospect.status === "imported"
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-[#121214] hover:bg-[#27272A] text-white active:scale-95"
          }`}
        >
          <Send className="size-3.5 text-[#FFBC45]" />
          <span>
            {prospect.status === "imported" ? "Lead Criado" : "Enviar para o CRM"}
          </span>
        </button>
      </div>
    </div>
  );
}
