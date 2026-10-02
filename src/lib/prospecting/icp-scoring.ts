import type { IcpBreakdown, IcpTier, IcpWeightsConfig, Prospect, DecisionMaker } from "./types";

export const DEFAULT_ICP_CONFIG: IcpWeightsConfig = {
  id: "default-config",
  name: "ICP Padrão Kasa Hub (B2B Alto Valor)",
  isDefault: true,
  weights: {
    hasWebsite: 10,
    hasWhatsapp: 25,
    hasInstagram: 10,
    minRating4_5: 10,
    highReviewCount: 15,
    priorityNiche: 15,
    hasDecisionMaker: 15,
  },
  priorityNiches: [
    "Clínica Médica",
    "Clínica Odontológica",
    "Estética Avançada",
    "Escola Particular",
    "Colégio",
    "Imobiliária",
    "Construtora",
    "Advocacia",
    "Contabilidade",
    "Restaurante / Gastronomia",
    "Academia / Fitness",
    "Autopeças / Concessionária",
    "Indústria / B2B",
  ],
  targetLocations: ["São Paulo", "Curitiba", "Rio de Janeiro", "Belo Horizonte", "Campinas", "Florianópolis"],
  negativeKeywords: ["MEI", "Fechado temporariamente", "Ponto de coleta", "Sem contato"],
};

export function calculateIcpScore(
  prospect: Partial<Prospect>,
  config: IcpWeightsConfig = DEFAULT_ICP_CONFIG
): { score: number; tier: IcpTier; breakdown: IcpBreakdown } {
  const w = config.weights;
  let totalScore = 0;

  // 1. Website
  const hasWebsiteScore = prospect.website && prospect.website.trim().length > 3 ? w.hasWebsite : 0;
  totalScore += hasWebsiteScore;

  // 2. WhatsApp
  const hasWhatsappScore = prospect.whatsapp || (prospect.phone && (prospect.phone.includes("9") || prospect.phone.length >= 10))
    ? w.hasWhatsapp
    : 0;
  totalScore += hasWhatsappScore;

  // 3. Instagram
  const hasInstagramScore = prospect.instagram && prospect.instagram.trim().length > 2 ? w.hasInstagram : 0;
  totalScore += hasInstagramScore;

  // 4. Nota Google (>= 4.4)
  const rating = Number(prospect.rating || 0);
  const ratingScore = rating >= 4.4 ? w.minRating4_5 : rating >= 4.0 ? Math.round(w.minRating4_5 * 0.6) : 0;
  totalScore += ratingScore;

  // 5. Volume de Avaliações
  const reviews = Number(prospect.reviewCount || 0);
  let reviewVolumeScore = 0;
  if (reviews >= 50) reviewVolumeScore = w.highReviewCount;
  else if (reviews >= 20) reviewVolumeScore = Math.round(w.highReviewCount * 0.7);
  else if (reviews >= 5) reviewVolumeScore = Math.round(w.highReviewCount * 0.4);
  totalScore += reviewVolumeScore;

  // 6. Nicho Prioritário
  const category = (prospect.category || "").toLowerCase();
  const isPriority = config.priorityNiches.some((n) => category.includes(n.toLowerCase()));
  const priorityNicheScore = isPriority ? w.priorityNiche : 0;
  totalScore += priorityNicheScore;

  // 7. Decisores Encontrados (Sócios / Gerentes de Marketing)
  const decisionMakersCount = (prospect.decisionMakers || []).length;
  const hasDecisionMakerScore = decisionMakersCount > 0 ? w.hasDecisionMaker : 0;
  totalScore += hasDecisionMakerScore;

  const maxPossible = Object.values(w).reduce((a, b) => a + b, 0);
  const normalizedScore = Math.min(100, Math.round((totalScore / (maxPossible || 100)) * 100));

  let tier: IcpTier = "cold";
  if (normalizedScore >= 75) tier = "hot";
  else if (normalizedScore >= 50) tier = "warm";
  else if (normalizedScore >= 30) tier = "cold";
  else tier = "unfit";

  const breakdown: IcpBreakdown = {
    hasWebsite: hasWebsiteScore,
    hasWhatsapp: hasWhatsappScore,
    hasInstagram: hasInstagramScore,
    ratingScore,
    reviewVolumeScore,
    priorityNiche: priorityNicheScore,
    hasDecisionMaker: hasDecisionMakerScore,
    totalScore: normalizedScore,
    maxPossible: 100,
  };

  return { score: normalizedScore, tier, breakdown };
}
