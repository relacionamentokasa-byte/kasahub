import React, { useState } from "react";
import {
  Calendar,
  CheckSquare,
  Clock,
  ArrowRight,
  FileText,
  Video,
  CheckCircle2,
  FolderGit2,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
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

interface ClientDashboardProps {
  client: {
    name: string;
    company?: string | null;
    logo_url?: string | null;
    brand_primary?: string | null;
    portal_primary_color?: string | null;
    portal_cover_url?: string | null;
    portal_cover_color?: string | null;
  };
  featuredProject?: {
    title: string;
    progress: number;
    nextMilestoneDate: string;
    nextMilestoneLocation: string;
    id?: string;
  };
  contentsMonth?: {
    completed: number;
    total: number;
  };
  pendingApprovalsCount?: number;
  nextMeeting?: {
    date: string;
    time: string;
    topic: string;
    clientName?: string;
  };
  recentFilesCount?: number;
  deliverables?: Array<{
    id: string;
    type: "video" | "carousel" | "presentation" | "planning" | "event";
    title: string;
    dueDate: string;
    status: "em_producao" | "em_revisao" | "aguardando_voce" | "planejado";
  }>;
  onNavigateTab?: (tab: string) => void;
}

const PERFORMANCE_DATA = {
  "30": [
    { day: "01/09", instagram: 3840, linkedin: 1800 },
    { day: "05/09", instagram: 3950, linkedin: 1920 },
    { day: "10/09", instagram: 3880, linkedin: 2050 },
    { day: "15/09", instagram: 4100, linkedin: 2180 },
    { day: "20/09", instagram: 4050, linkedin: 2300 },
    { day: "25/09", instagram: 4280, linkedin: 2450 },
    { day: "30/09", instagram: 4301, linkedin: 2600 },
  ],
  "7": [
    { day: "24/09", instagram: 4200, linkedin: 2400 },
    { day: "26/09", instagram: 4230, linkedin: 2480 },
    { day: "28/09", instagram: 4270, linkedin: 2540 },
    { day: "30/09", instagram: 4301, linkedin: 2600 },
  ],
  "90": [
    { day: "Jul", instagram: 3400, linkedin: 1500 },
    { day: "Ago", instagram: 3850, linkedin: 1950 },
    { day: "Set", instagram: 4301, linkedin: 2600 },
  ],
};

const STATUS_TAGS: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  em_producao: {
    label: "Em produção",
    bg: "bg-amber-50 text-amber-700 border-amber-200/60",
    text: "text-amber-700",
  },
  em_revisao: {
    label: "Em correção",
    bg: "bg-purple-50 text-purple-700 border-purple-200/60",
    text: "text-purple-700",
  },
  aguardando_voce: {
    label: "Aguardando você",
    bg: "bg-orange-50 text-orange-700 border-orange-200/60",
    text: "text-orange-700",
  },
  planejado: {
    label: "Planejado",
    bg: "bg-slate-50 text-slate-600 border-slate-200/60",
    text: "text-slate-600",
  },
};

export function KasaClientDashboard({
  client,
  featuredProject = {
    title: "Campanha FISP 2026",
    progress: 60,
    nextMilestoneDate: "05 de out. de 2026",
    nextMilestoneLocation: "Kasa Hub · Produção",
  },
  contentsMonth = { completed: 8, total: 12 },
  pendingApprovalsCount = 3,
  nextMeeting = {
    date: "22 de set. de 2026",
    time: "10:00",
    topic: "Planejamento Q4",
    clientName: "Nutriex",
  },
  recentFilesCount = 12,
  deliverables = [
    {
      id: "1",
      type: "video",
      title: "Vídeo HERO (LANÇAMENTO) - Linha EPI",
      dueDate: "18/09",
      status: "em_producao",
    },
    {
      id: "2",
      type: "carousel",
      title: "Carrossel - Segurança em foco",
      dueDate: "19/09",
      status: "em_revisao",
    },
    {
      id: "3",
      type: "presentation",
      title: "Apresentação Comercial Q4",
      dueDate: "22/09",
      status: "aguardando_voce",
    },
    {
      id: "4",
      type: "planning",
      title: "Planejamento Estratégico Outubro",
      dueDate: "25/09",
      status: "planejado",
    },
    {
      id: "5",
      type: "event",
      title: "Captação de Conteúdo FISP 2026",
      dueDate: "06/10",
      status: "planejado",
    },
  ],
  onNavigateTab,
}: ClientDashboardProps) {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const displayName = client.company || client.name;
  const contentPct = Math.round(
    (contentsMonth.completed / contentsMonth.total) * 100
  );

  const clientBrandColor =
    client.portal_primary_color?.trim() ||
    client.brand_primary?.trim() ||
    "#FFBC45";

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Topo Clean / Indicadores Estratégicos */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-4">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296]">
            PORTAL DO CLIENTE · VISÃO GERAL
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-0.5">
            Olá, {displayName}
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Acompanhe o andamento das entregas, aprovações e o pulso estratégico da sua marca.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[11px] font-medium text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Operação Ativa
          </span>
        </div>
      </div>

      {/* 2. Projeto em Destaque — Banner Clean & Profissional */}
      <div className="bg-white border border-[#E9E4DC] rounded-2xl p-5 lg:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-kasa font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF8F5] text-[#869296] border border-[#E9E4DC]">
              Projeto em Destaque
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#0C1618] tracking-tight">
              {featuredProject.title}
            </h2>
            <p className="text-xs text-[#6A787B] mt-0.5">
              Próximo marco: <strong className="text-[#0C1618]">{featuredProject.nextMilestoneDate}</strong> ({featuredProject.nextMilestoneLocation})
            </p>
          </div>

          {/* Barra de Progresso com cor do cliente */}
          <div className="space-y-1.5 max-w-md pt-1">
            <div className="flex items-center justify-between text-xs font-mono-kasa">
              <span className="text-[#869296] font-medium">Progresso geral</span>
              <span className="font-bold text-[#0C1618]">{featuredProject.progress}%</span>
            </div>
            <div className="h-2 w-full bg-[#F0EBE1] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${featuredProject.progress}%`,
                  backgroundColor: clientBrandColor,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-center border-t lg:border-t-0 lg:border-l border-[#F0EBE1] pt-4 lg:pt-0 lg:pl-6">
          <button
            type="button"
            onClick={() => onNavigateTab?.("projetos")}
            className="px-4 py-2.5 rounded-xl bg-[#0C1618] text-white hover:bg-[#1C2A2D] font-bold text-xs shadow-sm transition flex items-center gap-2"
          >
            <span>Ver projeto completo</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Grade de 4 Cards de Métricas e Acessos Rápidos (Estilo Dashboard Executivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Conteúdos */}
        <div className="bg-white border border-[#E9E4DC] rounded-2xl p-4.5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono-kasa font-bold uppercase tracking-wider text-[#869296]">
              CONTEÚDOS DO MÊS
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono-kasa text-[#0C1618]">
                {contentsMonth.completed}
              </span>
              <span className="text-xs text-[#869296] font-mono-kasa">
                / {contentsMonth.total} concluídos
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#F0EBE1]">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#F0EBE1] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${contentPct}%` }}
                />
              </div>
              <span className="text-[11px] font-mono-kasa font-bold text-[#869296]">
                {contentPct}%
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab?.("conteudos")}
              className="text-xs font-semibold text-[#0C1618] hover:text-[#FFBC45] flex items-center gap-1 transition"
            >
              <span>Ver grade</span>
              <ArrowRight className="size-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Aprovações */}
        <div className="bg-white border border-[#E9E4DC] rounded-2xl p-4.5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono-kasa font-bold uppercase tracking-wider text-[#869296]">
              APROVAÇÕES PENDENTES
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono-kasa text-[#0C1618]">
                {pendingApprovalsCount}
              </span>
              <span className="text-xs text-[#869296]">
                peças aguardando
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#F0EBE1] flex items-center justify-between">
            <span className="text-[11px] text-[#869296]">Revisão de artes & vídeos</span>
            <button
              type="button"
              onClick={() => onNavigateTab?.("aprovacoes")}
              className="px-3 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200/60 font-bold text-[11px] hover:bg-orange-100 transition"
            >
              Revisar agora →
            </button>
          </div>
        </div>

        {/* Card 3: Reunião */}
        <div className="bg-white border border-[#E9E4DC] rounded-2xl p-4.5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono-kasa font-bold uppercase tracking-wider text-[#869296]">
              PRÓXIMO ENCONTRO
            </span>
            <p className="text-sm font-bold text-[#0C1618] mt-1 truncate">
              {nextMeeting.topic}
            </p>
            <p className="text-xs text-[#6A787B] font-mono-kasa mt-0.5">
              {nextMeeting.date} às {nextMeeting.time}
            </p>
          </div>

          <div className="pt-2 border-t border-[#F0EBE1]">
            <button
              type="button"
              onClick={() => onNavigateTab?.("calendario")}
              className="text-xs font-semibold text-[#0C1618] hover:text-[#FFBC45] flex items-center gap-1 transition"
            >
              <span>Ver agenda</span>
              <ArrowRight className="size-3" />
            </button>
          </div>
        </div>

        {/* Card 4: Arquivos */}
        <div className="bg-white border border-[#E9E4DC] rounded-2xl p-4.5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono-kasa font-bold uppercase tracking-wider text-[#869296]">
              ARQUIVOS & ATIVOS
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono-kasa text-[#0C1618]">
                {recentFilesCount}
              </span>
              <span className="text-xs text-[#869296]">
                novos arquivos
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#F0EBE1]">
            <button
              type="button"
              onClick={() => onNavigateTab?.("arquivos")}
              className="text-xs font-semibold text-[#0C1618] hover:text-[#FFBC45] flex items-center gap-1 transition"
            >
              <span>Acessar biblioteca</span>
              <ArrowRight className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Grade Principal: Gráficos de Performance + Entregáveis em Lista Tabular */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico de Desempenho (Col 1-7) */}
        <div className="lg:col-span-7 bg-white border border-[#E9E4DC] rounded-2xl p-5 lg:p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0EBE1] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0C1618]">
                Desempenho & Alcance dos Canais
              </h3>
              <p className="text-xs text-[#869296]">
                Crescimento consolidado da presença digital da marca
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E9E4DC] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPeriod("7")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  period === "7" ? "bg-white text-[#0C1618] shadow-xs" : "text-[#869296]"
                }`}
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => setPeriod("30")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  period === "30" ? "bg-white text-[#0C1618] shadow-xs" : "text-[#869296]"
                }`}
              >
                30d
              </button>
              <button
                type="button"
                onClick={() => setPeriod("90")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  period === "90" ? "bg-white text-[#0C1618] shadow-xs" : "text-[#869296]"
                }`}
              >
                90d
              </button>
            </div>
          </div>

          {/* 3 Métricas Rápidas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E9E4DC]">
              <span className="text-[10px] font-mono-kasa font-bold uppercase text-[#869296]">
                Seguidores
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold font-mono-kasa text-[#0C1618]">4.301</span>
                <span className="text-[11px] font-bold text-emerald-600 font-mono-kasa">+12%</span>
              </div>
            </div>
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E9E4DC]">
              <span className="text-[10px] font-mono-kasa font-bold uppercase text-[#869296]">
                Alcance
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold font-mono-kasa text-[#0C1618]">15,9k</span>
                <span className="text-[11px] font-bold text-emerald-600 font-mono-kasa">+28%</span>
              </div>
            </div>
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E9E4DC]">
              <span className="text-[10px] font-mono-kasa font-bold uppercase text-[#869296]">
                Engajamento
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold font-mono-kasa text-[#0C1618]">1,4k</span>
                <span className="text-[11px] font-bold text-emerald-600 font-mono-kasa">+18%</span>
              </div>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PERFORMANCE_DATA[period]}>
                <defs>
                  <linearGradient id="clientBrandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={clientBrandColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={clientBrandColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE1" />
                <XAxis dataKey="day" stroke="#869296" fontSize={11} tickLine={false} />
                <YAxis stroke="#869296" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0C1618",
                    borderRadius: 10,
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="instagram"
                  name="Audiência Total"
                  stroke={clientBrandColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#clientBrandGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lista de Próximos Entregáveis (Col 8-12) */}
        <div className="lg:col-span-5 bg-white border border-[#E9E4DC] rounded-2xl p-5 lg:p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0C1618]">
                  Próximos Entregáveis
                </h3>
                <p className="text-xs text-[#869296]">
                  Status de criação e aprovação em tempo real
                </p>
              </div>
            </div>

            <div className="divide-y divide-[#F0EBE1] mt-2">
              {deliverables.map((item) => {
                const tag = STATUS_TAGS[item.status] || STATUS_TAGS.planejado;
                return (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#0C1618] truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#869296] font-mono-kasa mt-0.5">
                        Entrega: {item.dueDate}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${tag.bg}`}
                    >
                      {tag.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#F0EBE1]">
            <button
              type="button"
              onClick={() => onNavigateTab?.("projetos")}
              className="w-full py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F0EBE1] text-[#0C1618] text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>Ver todos os projetos e jobs</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
