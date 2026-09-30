import React, { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  MousePointerClick,
  Target,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Check,
  X,
  MessageSquare,
  ArrowUpRight,
  Eye,
  Sliders,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { SocialIcon } from "@/components/editorial/SocialIcon";

export interface TrafficCreative {
  id: string;
  title: string;
  headline: string;
  objective: string; // ex: "Geração de Leads", "Conversão de Vendas", "Reconhecimento"
  platform: "meta" | "google" | "tiktok";
  format: "story" | "feed" | "reels" | "search";
  mediaUrl: string;
  status: "pending" | "approved" | "active" | "adjust_requested";
  budgetSuggested: string;
  ctaText: string;
  targetAudience: string;
  previewUrl?: string;
  feedback?: string;
}

interface KasaTrafficAdsViewProps {
  clientBrandColor?: string;
  clientName?: string;
}

const METRICS_SUMMARY = {
  invested: "R$ 4.850,00",
  reach: "142.800",
  clicks: "6.420",
  leads: "318",
  cpl: "R$ 15,25",
  ctr: "4,49%",
};

const PERFORMANCE_CHART = [
  { date: "01/09", invest: 150, leads: 9, clicks: 180 },
  { date: "05/09", invest: 160, leads: 11, clicks: 210 },
  { date: "10/09", invest: 160, leads: 14, clicks: 245 },
  { date: "15/09", invest: 180, leads: 16, clicks: 290 },
  { date: "20/09", invest: 175, leads: 13, clicks: 270 },
  { date: "25/09", invest: 190, leads: 18, clicks: 340 },
  { date: "30/09", invest: 200, leads: 22, clicks: 380 },
];

const SAMPLE_CREATIVES: TrafficCreative[] = [
  {
    id: "cr-1",
    title: "Campanha Institucional - Q4 Soluções",
    headline: "Transforme a gestão da sua equipe com tecnologia de ponta.",
    objective: "Geração de Leads Qualificados",
    platform: "meta",
    format: "feed",
    mediaUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1080&auto=format&fit=crop&q=80",
    status: "pending",
    budgetSuggested: "R$ 60,00 / dia",
    ctaText: "Saiba Mais",
    targetAudience: "Diretores, Gestores e Tomadores de Decisão (Brasil)",
  },
  {
    id: "cr-2",
    title: "Vídeo Reels - Depoimento de Sucesso",
    headline: "Veja como aumentamos em 3x os resultados no último trimestre.",
    objective: "Reconhecimento & Conversão",
    platform: "meta",
    format: "reels",
    mediaUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1080&auto=format&fit=crop&q=80",
    status: "pending",
    budgetSuggested: "R$ 80,00 / dia",
    ctaText: "Fale Conosco",
    targetAudience: "Público Personalizado (Visitantes dos últimos 90 dias)",
  },
  {
    id: "cr-3",
    title: "Google Search - Palavras-chave Fundo de Funil",
    headline: "Consultoria Especializada · Agende Diagnóstico Gratuito",
    objective: "Fundo de Funil / Busca Ativa",
    platform: "google",
    format: "search",
    mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&auto=format&fit=crop&q=80",
    status: "active",
    budgetSuggested: "R$ 50,00 / dia",
    ctaText: "Acessar Site",
    targetAudience: "Pesquisas ativas no Google com alta intenção de compra",
  },
];

export function KasaTrafficAdsView({
  clientBrandColor = "#FFBC45",
  clientName = "Cliente",
}: KasaTrafficAdsViewProps) {
  const [creatives, setCreatives] = useState<TrafficCreative[]>(SAMPLE_CREATIVES);
  const [selectedCreative, setSelectedCreative] = useState<TrafficCreative | null>(null);
  const [adjustFeedback, setAdjustFeedback] = useState("");
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<"all" | "meta" | "google">("all");

  const handleApprove = (id: string) => {
    setCreatives((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "approved" } : c))
    );
    if (selectedCreative?.id === id) {
      setSelectedCreative((prev) => (prev ? { ...prev, status: "approved" } : null));
    }
  };

  const handleRequestAdjust = (id: string) => {
    if (!adjustFeedback.trim()) return;
    setCreatives((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: "adjust_requested", feedback: adjustFeedback } : c
      )
    );
    if (selectedCreative?.id === id) {
      setSelectedCreative((prev) =>
        prev ? { ...prev, status: "adjust_requested", feedback: adjustFeedback } : null
      );
    }
    setAdjustFeedback("");
    setIsAdjustOpen(false);
  };

  const filteredCreatives = creatives.filter((c) => {
    if (filterPlatform === "all") return true;
    return c.platform === filterPlatform;
  });

  const pendingCount = creatives.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-5">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296] flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-[#FFBC45]" />
            PERFORMANCE & MÍDIA PAGA · META ADS & GOOGLE ADS
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-1">
            Tráfego Pago & Anúncios
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Acompanhe o retorno do seu investimento em mídia e aprove novos criativos antes da veiculação.
          </p>
        </div>

        {/* Status de Criativos para Aprovar */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold animate-pulse">
            <Sparkles className="size-3.5 text-[#FFBC45]" />
            <span>{pendingCount} novos criativos aguardando aprovação</span>
          </div>
        )}
      </div>

      {/* 2. Cards de Métricas Principais (Simplicidade & Alto Impacto) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs hover:border-amber-300/50 transition">
          <div className="flex items-center justify-between text-[#869296]">
            <span className="text-xs font-semibold">Investimento no Mês</span>
            <DollarSign className="size-4 text-emerald-600" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-[#0C1618] mt-2">
            {METRICS_SUMMARY.invested}
          </p>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">
            ● Orçamento 100% otimizado
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs hover:border-amber-300/50 transition">
          <div className="flex items-center justify-between text-[#869296]">
            <span className="text-xs font-semibold">Pessoas Alcançadas</span>
            <Users className="size-4 text-blue-600" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-[#0C1618] mt-2">
            {METRICS_SUMMARY.reach}
          </p>
          <span className="text-[10px] text-blue-600 font-bold mt-1 inline-block">
            +18% em relação ao mês anterior
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs hover:border-amber-300/50 transition">
          <div className="flex items-center justify-between text-[#869296]">
            <span className="text-xs font-semibold">Cliques no Link / Anúncio</span>
            <MousePointerClick className="size-4 text-purple-600" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-[#0C1618] mt-2">
            {METRICS_SUMMARY.clicks}
          </p>
          <span className="text-[10px] text-[#6A787B] font-mono mt-1 inline-block">
            CTR Médio: {METRICS_SUMMARY.ctr}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs hover:border-amber-300/50 transition">
          <div className="flex items-center justify-between text-[#869296]">
            <span className="text-xs font-semibold">Leads & Oportunidades</span>
            <Target className="size-4 text-[#FFBC45]" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-[#0C1618] mt-2">
            {METRICS_SUMMARY.leads}
          </p>
          <span className="text-[10px] text-amber-700 font-mono font-bold mt-1 inline-block">
            Custo por Lead: {METRICS_SUMMARY.cpl}
          </span>
        </div>
      </div>

      {/* 3. Gráfico de Evolução de Leads e Tráfego */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="font-display text-base font-bold text-[#0C1618]">
              Evolução Diária de Conversões (Leads)
            </h3>
            <p className="text-xs text-[#6A787B]">
              Distribuição constante de contatos gerados pelas campanhas ativas.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="size-2 rounded-full bg-[#FFBC45]" />
              Leads Diários
            </span>
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="size-2 rounded-full bg-blue-500" />
              Cliques
            </span>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={PERFORMANCE_CHART} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={clientBrandColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={clientBrandColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE4" vertical={false} />
              <XAxis dataKey="date" stroke="#869296" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#869296" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#121214",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="leads"
                stroke={clientBrandColor}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#leadsGradient)"
                name="Leads"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Aprovação de Criativos de Tráfego (Antes de Subir ao Gerenciador) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#0C1618]">
              Criativos de Anúncios para Aprovação & Veiculação
            </h2>
            <p className="text-xs text-[#6A787B]">
              Revise as artes, títulos e textos que serão veiculados nos seus anúncios.
            </p>
          </div>

          {/* Filtro por Plataforma */}
          <div className="flex items-center gap-1 bg-[#F5F2EC] p-1 rounded-xl border border-[#E9E4DC]">
            <button
              type="button"
              onClick={() => setFilterPlatform("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterPlatform === "all"
                  ? "bg-white text-[#0C1618] shadow-xs"
                  : "text-[#869296] hover:text-[#0C1618]"
              }`}
            >
              Todos ({creatives.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterPlatform("meta")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterPlatform === "meta"
                  ? "bg-white text-[#0C1618] shadow-xs"
                  : "text-[#869296] hover:text-[#0C1618]"
              }`}
            >
              Meta Ads (Instagram/FB)
            </button>
            <button
              type="button"
              onClick={() => setFilterPlatform("google")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterPlatform === "google"
                  ? "bg-white text-[#0C1618] shadow-xs"
                  : "text-[#869296] hover:text-[#0C1618]"
              }`}
            >
              Google Ads
            </button>
          </div>
        </div>

        {/* Grid de Criativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCreatives.map((cr) => {
            const isApproved = cr.status === "approved" || cr.status === "active";
            const isAdjust = cr.status === "adjust_requested";

            return (
              <div
                key={cr.id}
                className="bg-white rounded-2xl border border-[#E9E4DC] overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Capa do Criativo */}
                  <div className="relative aspect-[16/10] bg-[#121214] overflow-hidden group">
                    <img
                      src={cr.mediaUrl}
                      alt={cr.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121214]/80 backdrop-blur-md text-white text-[10px] font-bold">
                      {cr.platform === "meta" ? "Instagram & Facebook" : "Google Ads"}
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      {isApproved ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                          <CheckCircle2 className="size-3" />
                          {cr.status === "active" ? "Veiculando" : "Aprovado"}
                        </span>
                      ) : isAdjust ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                          <Clock className="size-3" />
                          Ajuste Solicitado
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-[#FFBC45] text-[#0C1618] text-[10px] font-bold shadow-md">
                          Aguardando Você
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações Estratégicas */}
                  <div className="p-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-mono-kasa font-bold uppercase text-amber-700">
                        {cr.objective}
                      </span>
                      <h4 className="font-display text-sm font-bold text-[#0C1618] mt-0.5 line-clamp-1">
                        {cr.title}
                      </h4>
                      <p className="text-xs text-[#6A787B] mt-1 line-clamp-2 italic">
                        "{cr.headline}"
                      </p>
                    </div>

                    <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E9E4DC] text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#869296]">Orçamento Sugerido:</span>
                        <span className="font-bold text-[#0C1618]">{cr.budgetSuggested}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#869296]">Botão de Ação:</span>
                        <span className="font-bold text-[#0C1618]">{cr.ctaText}</span>
                      </div>
                      <div className="pt-1 border-t border-[#E9E4DC] text-[#6A787B] text-[10px]">
                        <strong>Segmentação:</strong> {cr.targetAudience}
                      </div>
                    </div>

                    {isAdjust && cr.feedback && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                        <strong>Seu ajuste:</strong> {cr.feedback}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="p-4 pt-0 border-t border-[#F5F2EC] flex items-center gap-2">
                  {!isApproved ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(cr.id)}
                        style={{ backgroundColor: clientBrandColor }}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-[#0C1618] flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 transition active:scale-95 cursor-pointer"
                      >
                        <Check className="size-3.5" />
                        <span>Aprovar Anúncio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCreative(cr);
                          setIsAdjustOpen(true);
                        }}
                        className="p-2 rounded-xl border border-[#E9E4DC] hover:bg-[#FAF8F5] text-[#6A787B] hover:text-[#0C1618] text-xs font-bold transition flex items-center justify-center cursor-pointer"
                        title="Solicitar Ajuste"
                      >
                        <MessageSquare className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="size-3.5" />
                      Pronto para Veiculação no Gerenciador
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Solicitação de Ajuste de Anúncio */}
      {isAdjustOpen && selectedCreative && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 border border-[#E9E4DC] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#0C1618]">
                Solicitar Ajuste no Anúncio
              </h3>
              <button
                type="button"
                onClick={() => setIsAdjustOpen(false)}
                className="p-1 text-[#869296] hover:text-[#0C1618]"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-[#6A787B]">
              Qual modificação você gostaria de fazer no criativo <strong>{selectedCreative.title}</strong>? (Ex: mudar headline, trocar imagem, ajustar público ou verba).
            </p>

            <textarea
              value={adjustFeedback}
              onChange={(e) => setAdjustFeedback(e.target.value)}
              placeholder="Descreva aqui o ajuste para o time de tráfego da Kasa..."
              className="w-full h-28 p-3 rounded-xl border border-[#E9E4DC] text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none font-sans"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdjustOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#869296] hover:bg-[#F5F2EC] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleRequestAdjust(selectedCreative.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#121214] text-white hover:bg-[#27272A] transition"
              >
                Enviar ao Time Kasa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
