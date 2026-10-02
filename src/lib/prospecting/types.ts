export type IcpTier = "hot" | "warm" | "cold" | "unfit";

export type DecisionMakerSource = "qsa_receita" | "linkedin" | "website" | "manual";

export interface DecisionMaker {
  id: string;
  name: string;
  role: string; // Ex: "Sócio-Administrador", "Gerente de Marketing", "Diretor Comercial", "CEO"
  source: DecisionMakerSource;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface IcpBreakdown {
  hasWebsite: number;
  hasWhatsapp: number;
  hasInstagram: number;
  ratingScore: number;
  reviewVolumeScore: number;
  priorityNiche: number;
  hasDecisionMaker: number;
  totalScore: number;
  maxPossible: number;
}

export interface MarketingMaturityAudit {
  opportunityType: "gold_mine" | "scaling_agency" | "unfit_low_budget" | "high_performer";
  opportunityLabel: string;
  opportunityBadgeColor: string;
  pitchAngle: string;
  websiteStatus: "active_with_pixel" | "active_no_pixel" | "no_website" | "broken";
  websiteDiagnosis: string;
  instagramStatus: "active_professional" | "abandoned" | "amateur_inhouse" | "no_instagram";
  instagramDiagnosis: string;
  trafficAdsStatus: "running_ads" | "not_running_ads" | "unknown";
  trafficAdsDiagnosis: string;
  googleMapsStatus: "optimized_high_reviews" | "unclaimed_low_reviews" | "average";
  googleMapsDiagnosis: string;
}

export interface IcpWeightsConfig {
  id: string;
  name: string;
  isDefault: boolean;
  weights: {
    hasWebsite: number;
    hasWhatsapp: number;
    hasInstagram: number;
    minRating4_5: number;
    highReviewCount: number;
    priorityNiche: number;
    hasDecisionMaker: number;
  };
  apiKeys?: {
    googlePlacesApiKey?: string;
    serpApiKey?: string;
  };
  priorityNiches: string[];
  targetLocations: string[];
  negativeKeywords: string[];
}

export interface Prospect {
  id: string;
  name: string;
  tradeName: string;
  cnpj?: string;
  category: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  googleMapsUrl?: string;
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
  city: string;
  state?: string;
  minScore?: number;
  onlyWithWhatsapp?: boolean;
  onlyWithDecisionMakers?: boolean;
  tier?: IcpTier | "all";
  opportunityFilter?: "all" | "gold_mine" | "no_website" | "amateur_insta";
}
