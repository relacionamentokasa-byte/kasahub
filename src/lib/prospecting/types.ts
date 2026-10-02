export type IcpTier = "hot" | "warm" | "cold" | "unfit";

export type DecisionMakerSource = "qsa_receita" | "linkedin" | "website" | "manual";

export interface DecisionMaker {
  id: string;
  name: string;
  role: string;
  source: DecisionMakerSource;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface BusinessFinancialEstimate {
  estimatedSize: "ME" | "EPP" | "Médio Porte" | "Grande Porte";
  estimatedMonthlyRevenue: string;
  suggestedAgencyFee: string;
  potentialBudgetRating: "Baixo" | "Médio" | "Alto" | "Premium";
}

export interface IcpBreakdown {
  financialCapacityScore?: number;
  marketingGapScore?: number;
  accessibilityScore?: number;
  hasWebsite: number;
  hasWhatsapp: number;
  hasInstagram: number;
  ratingScore: number;
  reviewVolumeScore: number;
  priorityNiche: number;
  hasDecisionMaker: number;
  totalScore: number;
  maxPossible: number;
  isDealbreakerRejected?: boolean;
  dealbreakerReason?: string;
}

export interface MarketingMaturityAudit {
  opportunityType: "gold_mine" | "scaling_agency" | "unfit_low_budget" | "high_performer";
  opportunityLabel: string;
  opportunityBadgeColor: string;
  pitchAngle: string;
  salesPitchSuggestion?: string;
  websiteStatus: "active_with_pixel" | "active_no_pixel" | "no_website" | "broken";
  websiteDiagnosis: string;
  instagramStatus: "active_professional" | "abandoned" | "amateur_inhouse" | "no_instagram";
  instagramDiagnosis: string;
  trafficAdsStatus: "running_ads" | "not_running_ads" | "unknown";
  trafficAdsDiagnosis: string;
  googleMapsStatus: "optimized_high_reviews" | "unclaimed_low_reviews" | "average";
  googleMapsDiagnosis: string;
}

export type BusinessModelType = "all" | "industria_fabricante" | "distribuidora_atacado" | "varejo_loja" | "servicos_clinicas";

export type IcpPresetKey = "padrao_kasa" | "b2b_industria" | "varejo_clinicas" | "gold_mine_gaps";

export interface IcpWeightsConfig {
  id: string;
  name: string;
  isDefault: boolean;
  presetKey?: IcpPresetKey;
  dealbreakers?: {
    excludeFranchises: boolean;
    excludeLowCapital: boolean;
    minCompanyAgeMonths?: number;
  };
  weights: {
    // 1. Capacidade Financeira & Porte
    capitalSocialOrB2B?: number;
    priorityNiche: number;

    // 2. Gaps de Marketing & Oportunidade
    noPixelOpportunity?: number;
    needsWebsiteOrRevamp?: number;
    trafficOpportunity?: number;

    // 3. Acessibilidade do Decisor
    hasDecisionMakerQsa?: number;
    hasDirectWhatsapp?: number;

    // Campos legados mantidos para compatibilidade retroativa
    hasWebsite: number;
    hasWhatsapp: number;
    hasInstagram: number;
    minRating4_5: number;
    highReviewCount: number;
    hasDecisionMaker: number;
  };
  apiKeys?: {
    googlePlacesApiKey?: string;
    serpApiKey?: string;
  };
  priorityNiches: string[];
  targetLocations: string[];
  negativeKeywords: string[];
  excludeFranchises?: boolean;
  targetServices?: string[];
  agencyPositioning?: {
    minTicket: number;
    idealTicket: number;
    servicesOffered: string[];
  };
}

export interface Prospect {
  id: string;
  name: string;
  tradeName: string;
  cnpj?: string;
  category: string;
  businessModel?: "Indústria / Fabricante" | "Distribuidora / Atacado" | "Varejo / Loja" | "Serviços / Clínica" | "Outro";
  isFranchise?: boolean;
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  googleMapsUrl?: string;
  logoUrl?: string;
  photoUrl?: string;
  address: string;
  neighborhood?: string;
  city: string;
  state: string;
  rating: number;
  reviewCount: number;
  icpScore: number;
  icpTier: IcpTier;
  icpBreakdown: IcpBreakdown;
  decisionMakers: DecisionMaker[];
  marketingAudit: MarketingMaturityAudit;
  financialEstimate: BusinessFinancialEstimate;
  cnpjData?: {
    razaoSocial?: string;
    nomeFantasia?: string;
    capitalSocial?: number;
    cnaeDescricao?: string;
    dataAbertura?: string;
    situacaoCadastral?: string;
    qsa?: Array<{
      nome: string;
      qualificacao: string;
      faixaEtaria?: string;
    }>;
  };
  status: "discovered" | "saved" | "imported" | "discarded";
  importedLeadId?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface ProspectingSearchParams {
  query?: string;
  niche: string;
  businessModel?: BusinessModelType;
  city: string;
  state?: string;
  limit?: number;
  minScore?: number;
  onlyWithWhatsapp?: boolean;
  onlyWithDecisionMakers?: boolean;
  excludeFranchises?: boolean;
  tier?: IcpTier | "all";
  opportunityFilter?: "all" | "gold_mine" | "no_website" | "amateur_insta";
}
