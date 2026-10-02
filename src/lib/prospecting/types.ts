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

export interface IcpWeightsConfig {
  id: string;
  name: string;
  isDefault: boolean;
  weights: {
    hasWebsite: number; // ex: 10
    hasWhatsapp: number; // ex: 25
    hasInstagram: number; // ex: 10
    minRating4_5: number; // ex: 10
    highReviewCount: number; // ex: 15
    priorityNiche: number; // ex: 15
    hasDecisionMaker: number; // ex: 15
  };
  priorityNiches: string[];
  targetLocations: string[];
  negativeKeywords: string[];
}

export interface Prospect {
  id: string;
  name: string; // Razão social ou nome principal
  tradeName: string; // Nome fantasia
  cnpj?: string;
  category: string; // Nicho (ex: "Clínica Odontológica", "Escola Particular")
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
}
