import type { LucideIcon } from "lucide-react";
import {
  Laptop,
  Store,
  Sparkles,
  Globe,
  PartyPopper,
  Users2,
  FolderKanban,
  Video,
  Target,
} from "lucide-react";
import type { Job, Project } from "@/lib/ops-api";

export type MacroFrontId =
  | "platform"
  | "trade"
  | "branding"
  | "digital"
  | "performance"
  | "audiovisual"
  | "events"
  | "internal"
  | "general";

export interface MacroFrontConfig {
  id: MacroFrontId;
  title: string;
  shortDescription: string;
  icon: LucideIcon;
  badgeClass: string;
  accentColor: string;
  keywords: string[];
}

export const MACRO_FRONTS: MacroFrontConfig[] = [
  {
    id: "platform",
    title: "Plataforma & Produto",
    shortDescription: "Comparativos técnicos, ferramentas web, melhorias de plataforma e produto",
    icon: Laptop,
    badgeClass: "border-blue-500/30 text-blue-500 bg-blue-500/10",
    accentColor: "#3b82f6",
    keywords: [
      "plataforma",
      "comparativo",
      "sistema",
      "software",
      "portal",
      "app",
      "tecnico",
      "economico",
      "web",
      "dashboard",
      "ferramenta",
      "suporte",
    ],
  },
  {
    id: "trade",
    title: "Trade Marketing & PDV",
    shortDescription: "Displays acrílicos, testeiras de gôndola, balcão, catálogos distribuidores e materiais físicos",
    icon: Store,
    badgeClass: "border-orange-500/30 text-orange-500 bg-orange-500/10",
    accentColor: "#f97316",
    keywords: [
      "trade",
      "pdv",
      "display",
      "acrilico",
      "gondola",
      "testeira",
      "balcao",
      "catalogo",
      "distribuidor",
      "embalagem",
      "rotulo",
      "adesivo",
      "totem",
      "ponto de venda",
      "loja",
    ],
  },
  {
    id: "branding",
    title: "Branding & Comunicação",
    shortDescription: "Identidade visual, manual de marca, tom de voz, papelaria e institucional",
    icon: Sparkles,
    badgeClass: "border-purple-500/30 text-purple-500 bg-purple-500/10",
    accentColor: "#a855f7",
    keywords: [
      "branding",
      "marca",
      "logo",
      "identidade",
      "tom de voz",
      "manual",
      "brandbook",
      "institucional",
      "posicionamento",
      "manifesto",
      "apresentacao",
    ],
  },
  {
    id: "digital",
    title: "Digital & Social Media",
    shortDescription: "Redes sociais, conteúdos editoriais, posts, carrosséis e presença digital",
    icon: Globe,
    badgeClass: "border-pink-500/30 text-pink-500 bg-pink-500/10",
    accentColor: "#ec4899",
    keywords: [
      "social",
      "instagram",
      "linkedin",
      "post",
      "reels",
      "carrossel",
      "feed",
      "stories",
      "calendario",
      "conteudo",
      "redes",
      "artigo",
    ],
  },
  {
    id: "performance",
    title: "Performance & Tráfego",
    shortDescription: "Campanhas de mídia paga, Google Ads, Meta Ads e criativos de conversão",
    icon: Target,
    badgeClass: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
    accentColor: "#10b981",
    keywords: [
      "performance",
      "trafego",
      "campanha",
      "ads",
      "meta",
      "google",
      "conversao",
      "lead",
      "midia",
      "anuncio",
    ],
  },
  {
    id: "audiovisual",
    title: "Audiovisual & Motion",
    shortDescription: "Roteiros, captação, edição de vídeos, animações e motion graphics",
    icon: Video,
    badgeClass: "border-indigo-500/30 text-indigo-500 bg-indigo-500/10",
    accentColor: "#6366f1",
    keywords: [
      "video",
      "audiovisual",
      "motion",
      "roteiro",
      "gravacao",
      "captacao",
      "edicao",
      "animacao",
      "teaser",
      "podcast",
    ],
  },
  {
    id: "events",
    title: "Eventos & Ativações",
    shortDescription: "Feiras nacionais, convenções, estandes, ativações presenciais e brindes",
    icon: PartyPopper,
    badgeClass: "border-amber-500/30 text-amber-500 bg-amber-500/10",
    accentColor: "#f59e0b",
    keywords: [
      "evento",
      "feira",
      "estande",
      "convencao",
      "ativacao",
      "cenografia",
      "brinde",
      "presencial",
      "congresso",
    ],
  },
  {
    id: "internal",
    title: "Endomarketing & RH",
    shortDescription: "Comunicação interna, campanhas para equipe, alinhamento e treinamento",
    icon: Users2,
    badgeClass: "border-cyan-500/30 text-cyan-500 bg-cyan-500/10",
    accentColor: "#06b6d4",
    keywords: [
      "endomarketing",
      "interno",
      "rh",
      "treinamento",
      "colaborador",
      "equipe",
      "mural",
      "integracao",
    ],
  },
  {
    id: "general",
    title: "Operação Geral & Outros",
    shortDescription: "Demandas operacionais gerais, avulsas e projetos complementares",
    icon: FolderKanban,
    badgeClass: "border-slate-500/30 text-muted-foreground bg-muted/20",
    accentColor: "#64748b",
    keywords: [],
  },
];

export interface FrontClusterData {
  config: MacroFrontConfig;
  projects: Project[];
  jobs: Job[];
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    review: number;
    notStarted: number;
    overdue: number;
    progressPercentage: number;
  };
}
