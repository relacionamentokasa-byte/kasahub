import type {
  IcpBreakdown,
  IcpTier,
  IcpWeightsConfig,
  IcpPresetKey,
  Prospect,
  DecisionMaker,
  BusinessModelType,
} from "./types";

/**
 * Presets Estratégicos Nativos para a Kasa Hub
 */
export const ICP_PRESETS: Record<IcpPresetKey, IcpWeightsConfig> = {
  padrao_kasa: {
    id: "preset-padrao",
    name: "🎯 Padrão Kasa Hub (Equilibrado)",
    isDefault: true,
    presetKey: "padrao_kasa",
    dealbreakers: {
      excludeFranchises: true,
      excludeLowCapital: true,
      minCompanyAgeMonths: 12,
    },
    weights: {
      // 1. Capacidade Financeira & Porte (35 pts)
      capitalSocialOrB2B: 20,
      priorityNiche: 15,

      // 2. Gaps de Marketing & Oportunidade de Venda (35 pts)
      noPixelOpportunity: 15,
      needsWebsiteOrRevamp: 10,
      trafficOpportunity: 10,

      // 3. Acessibilidade do Decisor (30 pts)
      hasDecisionMakerQsa: 15,
      hasDirectWhatsapp: 15,

      // Retrocompatibilidade
      hasWebsite: 10,
      hasWhatsapp: 25,
      hasInstagram: 10,
      minRating4_5: 10,
      highReviewCount: 15,
      hasDecisionMaker: 15,
    },
    priorityNiches: [
      "Cosméticos & Beleza",
      "EPIs & Segurança do Trabalho",
      "Indústria / Fabricante",
      "Distribuidora & Atacado",
      "Alimentos & Bebidas",
      "Autopeças & Automotivo",
      "Construção & Arquitetura",
      "Química & Farmacêutica",
      "Clínica Médica",
      "Clínica Odontológica",
      "Estética Avançada",
      "Escola Particular",
      "Imobiliária",
      "Advocacia",
      "Contabilidade",
    ],
    targetLocations: ["São Paulo", "Curitiba", "Rio de Janeiro", "Belo Horizonte", "Campinas", "Florianópolis"],
    negativeKeywords: [
      "franquia",
      "franchising",
      "unidade",
      "quiosque",
      "filial",
      "ponto de coleta",
      "MEI",
      "Fechado temporariamente",
      "Sem contato",
    ],
    excludeFranchises: true,
    targetServices: [
      "Tráfego Pago & Performance (Meta/Google Ads)",
      "Criação de Landing Pages & Sites de Alta Conversão",
      "Gestão de Redes Sociais & Posicionamento",
      "Assessoria Comercial & CRM",
    ],
    agencyPositioning: {
      minTicket: 2500,
      idealTicket: 5000,
      servicesOffered: ["Tráfego Pago", "Criação de Sites", "Social Media", "CRM"],
    },
  },

  b2b_industria: {
    id: "preset-b2b",
    name: "🏭 B2B & Alto Ticket (Indústria / Atacado)",
    isDefault: false,
    presetKey: "b2b_industria",
    dealbreakers: {
      excludeFranchises: true,
      excludeLowCapital: true,
      minCompanyAgeMonths: 24,
    },
    weights: {
      // Foco máximo em Capital Social, Decisor no QSA e Modelo B2B
      capitalSocialOrB2B: 30,
      priorityNiche: 20,

      noPixelOpportunity: 15,
      needsWebsiteOrRevamp: 10,
      trafficOpportunity: 5,

      hasDecisionMakerQsa: 20,
      hasDirectWhatsapp: 15,

      hasWebsite: 15,
      hasWhatsapp: 20,
      hasInstagram: 5,
      minRating4_5: 5,
      highReviewCount: 5,
      hasDecisionMaker: 25,
    },
    priorityNiches: [
      "Indústria / Fabricante",
      "Distribuidora & Atacado",
      "EPIs & Segurança do Trabalho",
      "Autopeças & Automotivo",
      "Construção & Arquitetura",
      "Química & Farmacêutica",
    ],
    targetLocations: ["São Paulo", "Curitiba", "Belo Horizonte", "Campinas", "Joinville", "Caxias do Sul"],
    negativeKeywords: ["franquia", "quiosque", "varejo", "MEI"],
    excludeFranchises: true,
    targetServices: [
      "Tráfego Pago & Performance (Meta/Google Ads)",
      "Criação de Landing Pages & Sites de Alta Conversão",
      "Assessoria Comercial & CRM",
    ],
    agencyPositioning: {
      minTicket: 4000,
      idealTicket: 8500,
      servicesOffered: ["Tráfego B2B", "Landing Pages", "CRM Integrado"],
    },
  },

  varejo_clinicas: {
    id: "preset-varejo",
    name: "🏪 Varejo Local, Clínicas & Estética",
    isDefault: false,
    presetKey: "varejo_clinicas",
    dealbreakers: {
      excludeFranchises: true,
      excludeLowCapital: false,
      minCompanyAgeMonths: 6,
    },
    weights: {
      // Foco em Contato Direto, Avaliações, Instagram e Captação de Pacientes/Clientes
      capitalSocialOrB2B: 15,
      priorityNiche: 15,

      noPixelOpportunity: 15,
      needsWebsiteOrRevamp: 10,
      trafficOpportunity: 15,

      hasDecisionMakerQsa: 10,
      hasDirectWhatsapp: 25,

      hasWebsite: 10,
      hasWhatsapp: 30,
      hasInstagram: 20,
      minRating4_5: 10,
      highReviewCount: 15,
      hasDecisionMaker: 15,
    },
    priorityNiches: [
      "Clínica Médica",
      "Clínica Odontológica",
      "Estética Avançada",
      "Cosméticos & Beleza",
      "Móveis & Decoração",
      "Escola Particular",
      "Gastronomia",
    ],
    targetLocations: ["São Paulo", "Curitiba", "Rio de Janeiro", "Florianópolis"],
    negativeKeywords: ["franquia", "filial"],
    excludeFranchises: true,
    targetServices: [
      "Tráfego Pago & Performance (Meta/Google Ads)",
      "Gestão de Redes Sociais & Posicionamento",
      "Criação de Landing Pages & Sites de Alta Conversão",
    ],
    agencyPositioning: {
      minTicket: 2000,
      idealTicket: 4500,
      servicesOffered: ["Tráfego Local", "Social Media", "Landing Pages"],
    },
  },

  gold_mine_gaps: {
    id: "preset-gold-mine",
    name: "🏆 Mina de Ouro (Gap Crítico de Vendas)",
    isDefault: false,
    presetKey: "gold_mine_gaps",
    dealbreakers: {
      excludeFranchises: true,
      excludeLowCapital: true,
      minCompanyAgeMonths: 12,
    },
    weights: {
      // Foco absoluto em empresas com faturamento alto que NÃO possuem presença digital otimizada
      capitalSocialOrB2B: 25,
      priorityNiche: 15,

      noPixelOpportunity: 25,
      needsWebsiteOrRevamp: 15,
      trafficOpportunity: 10,

      hasDecisionMakerQsa: 15,
      hasDirectWhatsapp: 15,

      hasWebsite: 5,
      hasWhatsapp: 25,
      hasInstagram: 5,
      minRating4_5: 5,
      highReviewCount: 10,
      hasDecisionMaker: 20,
    },
    priorityNiches: [
      "Indústria / Fabricante",
      "Distribuidora & Atacado",
      "Construção & Arquitetura",
      "Clínica Médica",
      "Clínica Odontológica",
      "Autopeças & Automotivo",
    ],
    targetLocations: ["São Paulo", "Curitiba", "Rio de Janeiro", "Belo Horizonte"],
    negativeKeywords: ["franquia", "MEI"],
    excludeFranchises: true,
    targetServices: [
      "Tráfego Pago & Performance (Meta/Google Ads)",
      "Criação de Landing Pages & Sites de Alta Conversão",
      "Assessoria Comercial & CRM",
    ],
    agencyPositioning: {
      minTicket: 3500,
      idealTicket: 7000,
      servicesOffered: ["Modernização Digital", "Tráfego Pago", "CRM"],
    },
  },
};

export const DEFAULT_ICP_CONFIG: IcpWeightsConfig = ICP_PRESETS.padrao_kasa;

/**
 * Detecta se uma empresa é uma Franquia ou Grande Rede Comercial
 */
export function detectIfFranchise(prospect: Partial<Prospect>): boolean {
  const name = (prospect.tradeName || prospect.name || "").toLowerCase();
  const address = (prospect.address || "").toLowerCase();
  const website = (prospect.website || "").toLowerCase();

  const franchiseKeywords = [
    "franquia",
    "franchise",
    "franchising",
    "unidade ",
    "unid.",
    "loja ",
    "shopping",
    "quiosque",
    "subway",
    "mcdonald",
    "burger king",
    "cacau show",
    "o boticario",
    "boticário",
    "c&a",
    "renner",
    "riachuelo",
    "ortobom",
    "wizard",
    "cna",
    "kumon",
    "fisk",
    "smart fit",
    "bluefit",
    "chilli beans",
    "havaianas",
    "arezzo",
    "drogasil",
    "droga raia",
    "pague menos",
    "farmácia são joão",
  ];

  if (franchiseKeywords.some((kw) => name.includes(kw))) return true;
  if (website.includes("/franquias") || website.includes("/seja-um-franqueado") || website.includes("/unidades")) return true;
  if (name.match(/\b(unidade|filial|loja)\s+\d+\b/i)) return true;

  return false;
}

/**
 * Identifica o Modelo de Negócio (Indústria/Fabricante, Distribuidora/Atacado, Varejo, Serviços)
 */
export function detectBusinessModel(prospect: Partial<Prospect>): Prospect["businessModel"] {
  const text = `${prospect.tradeName || ""} ${prospect.name || ""} ${prospect.category || ""} ${prospect.website || ""}`.toLowerCase();

  if (
    text.includes("indústria") ||
    text.includes("industria") ||
    text.includes("fabricante") ||
    text.includes("fábrica") ||
    text.includes("fabrica") ||
    text.includes("manufatura") ||
    text.includes("usinagem") ||
    text.includes("metalúrgica") ||
    text.includes("confecção")
  ) {
    return "Indústria / Fabricante";
  }

  if (
    text.includes("distribuidora") ||
    text.includes("distribuidor") ||
    text.includes("atacado") ||
    text.includes("atacadista") ||
    text.includes("representações") ||
    text.includes("representante") ||
    text.includes("importadora") ||
    text.includes("suprimentos")
  ) {
    return "Distribuidora / Atacado";
  }

  if (
    text.includes("clínica") ||
    text.includes("clinica") ||
    text.includes("consultoria") ||
    text.includes("advocacia") ||
    text.includes("odontologia") ||
    text.includes("estética") ||
    text.includes("estetica") ||
    text.includes("hospital") ||
    text.includes("escola") ||
    text.includes("colégio") ||
    text.includes("laboratório")
  ) {
    return "Serviços / Clínica";
  }

  if (
    text.includes("loja") ||
    text.includes("varejo") ||
    text.includes("boutique") ||
    text.includes("comércio") ||
    text.includes("comercio") ||
    text.includes("mercado") ||
    text.includes("e-commerce")
  ) {
    return "Varejo / Loja";
  }

  return "Outro";
}

/**
 * Motor Avançado de ICP Kasa Hub:
 * 1. Verificação de Regras Eliminatórias (Dealbreakers)
 * 2. Pilar 1: Capacidade Financeira & Porte
 * 3. Pilar 2: Gaps de Marketing & Oportunidade de Venda da Agência
 * 4. Pilar 3: Acessibilidade do Decisor (QSA/WhatsApp)
 */
export function calculateIcpScore(
  prospect: Partial<Prospect>,
  config: IcpWeightsConfig = DEFAULT_ICP_CONFIG
): { score: number; tier: IcpTier; breakdown: IcpBreakdown } {
  const w = config.weights;
  const dealbreakers = config.dealbreakers || {
    excludeFranchises: config.excludeFranchises ?? true,
    excludeLowCapital: true,
  };

  const isFranchise = detectIfFranchise(prospect);
  const capitalSocial = Number(prospect.cnpjData?.capitalSocial || 0);
  const isCnpjPresent = !!prospect.cnpj && prospect.cnpj.length >= 14;

  // 1. REGRAS ELIMINATÓRIAS (DEALBREAKERS)
  if (dealbreakers.excludeFranchises && isFranchise) {
    return {
      score: 15,
      tier: "unfit",
      breakdown: {
        financialCapacityScore: 0,
        marketingGapScore: 0,
        accessibilityScore: 0,
        hasWebsite: 0,
        hasWhatsapp: 0,
        hasInstagram: 0,
        ratingScore: 0,
        reviewVolumeScore: 0,
        priorityNiche: 0,
        hasDecisionMaker: 0,
        totalScore: 15,
        maxPossible: 100,
        isDealbreakerRejected: true,
        dealbreakerReason: "Franquia / Rede comercial sem autonomia regional de contratação",
      },
    };
  }

  if (dealbreakers.excludeLowCapital && isCnpjPresent && capitalSocial > 0 && capitalSocial < 20000) {
    return {
      score: 20,
      tier: "unfit",
      breakdown: {
        financialCapacityScore: 5,
        marketingGapScore: 5,
        accessibilityScore: 10,
        hasWebsite: 0,
        hasWhatsapp: 0,
        hasInstagram: 0,
        ratingScore: 0,
        reviewVolumeScore: 0,
        priorityNiche: 0,
        hasDecisionMaker: 0,
        totalScore: 20,
        maxPossible: 100,
        isDealbreakerRejected: true,
        dealbreakerReason: "Capital Social baixo (< R$ 20.000) com baixa verba de mídia",
      },
    };
  }

  // PILAR 1: CAPACIDADE FINANCEIRA & PORTE (0 a 35 pts)
  let financialScore = 0;
  const maxFinancial = (w.capitalSocialOrB2B ?? 20) + (w.priorityNiche ?? 15);
  const detectedModel = prospect.businessModel || detectBusinessModel(prospect);
  const isB2B = detectedModel === "Indústria / Fabricante" || detectedModel === "Distribuidora / Atacado";
  const category = (prospect.category || "").toLowerCase();
  const isPriorityNiche = config.priorityNiches.some((n) => category.includes(n.toLowerCase()));

  if (capitalSocial >= 5000000) financialScore += w.capitalSocialOrB2B ?? 20;
  else if (capitalSocial >= 500000 || isB2B) financialScore += Math.round((w.capitalSocialOrB2B ?? 20) * 0.9);
  else if (capitalSocial >= 100000) financialScore += Math.round((w.capitalSocialOrB2B ?? 20) * 0.7);
  else if (prospect.reviewCount && prospect.reviewCount >= 100) financialScore += Math.round((w.capitalSocialOrB2B ?? 20) * 0.6);
  else financialScore += Math.round((w.capitalSocialOrB2B ?? 20) * 0.3);

  if (isPriorityNiche) {
    financialScore += w.priorityNiche ?? 15;
  } else {
    financialScore += Math.round((w.priorityNiche ?? 15) * 0.3);
  }

  // PILAR 2: GAPS DE MARKETING & OPORTUNIDADE DE VENDA (0 a 35 pts)
  let marketingGapScore = 0;
  const audit = prospect.marketingAudit;
  const hasPixel = audit?.websiteStatus === "active_with_pixel";
  const hasNoWebsite = !prospect.website || audit?.websiteStatus === "no_website";
  const isRunningAds = audit?.trafficAdsStatus === "running_ads";

  // Gap de Pixel: Quem NÃO tem Pixel ganha pontos altos de oportunidade
  if (!hasPixel) {
    marketingGapScore += w.noPixelOpportunity ?? 15;
  } else {
    marketingGapScore += Math.round((w.noPixelOpportunity ?? 15) * 0.4); // Já usa pixel, foco é escala
  }

  // Oportunidade de Site / Landing Page
  if (hasNoWebsite) {
    marketingGapScore += w.needsWebsiteOrRevamp ?? 10;
  } else {
    marketingGapScore += Math.round((w.needsWebsiteOrRevamp ?? 10) * 0.6);
  }

  // Oportunidade de Tráfego Pago
  if (!isRunningAds) {
    marketingGapScore += w.trafficOpportunity ?? 10;
  } else {
    marketingGapScore += Math.round((w.trafficOpportunity ?? 10) * 0.5);
  }

  // PILAR 3: ACESSIBILIDADE DO DECISOR & CONTATO DIRETO (0 a 30 pts)
  let accessibilityScore = 0;
  const realDecisionMakers = (prospect.decisionMakers || []).filter(
    (dm) => dm.source === "qsa_receita" || (dm.name && !dm.name.toLowerCase().includes("sócio-diretor") && dm.name.length > 4)
  );
  const hasQsaDecisor = realDecisionMakers.length > 0;
  const hasWhatsapp = !!prospect.whatsapp || (!!prospect.phone && (prospect.phone.includes("9") || prospect.phone.length >= 10));

  if (hasQsaDecisor) {
    accessibilityScore += w.hasDecisionMakerQsa ?? (w.hasDecisionMaker || 15);
  } else if (prospect.decisionMakers?.length) {
    accessibilityScore += Math.round((w.hasDecisionMakerQsa ?? (w.hasDecisionMaker || 15)) * 0.5);
  }

  if (hasWhatsapp) {
    accessibilityScore += w.hasDirectWhatsapp ?? (w.hasWhatsapp || 15);
  } else if (prospect.phone) {
    accessibilityScore += Math.round((w.hasDirectWhatsapp ?? (w.hasWhatsapp || 15)) * 0.3);
  }

  // Pontuação Total Consolidada
  const rawTotal = financialScore + marketingGapScore + accessibilityScore;
  const totalScore = Math.min(100, Math.max(10, Math.round(rawTotal)));

  let tier: IcpTier = "cold";
  if (totalScore >= 75) tier = "hot";
  else if (totalScore >= 50) tier = "warm";
  else if (totalScore >= 30) tier = "cold";
  else tier = "unfit";

  const breakdown: IcpBreakdown = {
    financialCapacityScore: financialScore,
    marketingGapScore,
    accessibilityScore,
    hasWebsite: prospect.website ? 10 : 0,
    hasWhatsapp: hasWhatsapp ? 15 : 0,
    hasInstagram: prospect.instagram ? 10 : 0,
    ratingScore: Number(prospect.rating || 0) >= 4.4 ? 10 : 5,
    reviewVolumeScore: Number(prospect.reviewCount || 0) >= 20 ? 10 : 5,
    priorityNiche: isPriorityNiche ? 15 : 0,
    hasDecisionMaker: hasQsaDecisor ? 15 : 0,
    totalScore,
    maxPossible: 100,
    isDealbreakerRejected: false,
  };

  return { score: totalScore, tier, breakdown };
}
