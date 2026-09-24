import React, { useState } from "react";
import {
  TrendingUp,
  Users,
  Eye,
  Heart,
  Share2,
  Calendar,
  BarChart3,
  ArrowUpRight,
  Sparkles,
  Download,
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

interface KasaReportsViewProps {
  clientBrandColor?: string;
  clientName?: string;
}

const PERFORMANCE_DATA = [
  { month: "Jan", alcance: 8200, engajamento: 890, leads: 12 },
  { month: "Fev", alcance: 9400, engajamento: 940, leads: 15 },
  { month: "Mar", alcance: 11200, engajamento: 1100, leads: 22 },
  { month: "Abr", alcance: 10800, engajamento: 1050, leads: 18 },
  { month: "Mai", alcance: 13500, engajamento: 1250, leads: 28 },
  { month: "Jun", alcance: 14200, engajamento: 1320, leads: 31 },
  { month: "Jul", alcance: 15100, engajamento: 1390, leads: 35 },
  { month: "Ago", alcance: 16800, engajamento: 1480, leads: 42 },
  { month: "Set", alcance: 18900, engajamento: 1620, leads: 48 },
];

export function KasaReportsView({
  clientBrandColor = "#FFBC45",
  clientName = "Cliente",
}: KasaReportsViewProps) {
  const [period, setPeriod] = useState<"30" | "90" | "year">("90");

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Header do Módulo — Padrão Clean Kasa Hub */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-4">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296]">
            ESTRATÉGIA · RELATÓRIOS & PERFORMANCE
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-0.5">
            Relatórios de Performance
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Métricas estratégicas consolidadas, crescimento de audiência e conversões de {clientName}.
          </p>
        </div>

        {/* Seletor de Período em Pílula */}
        <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E9E4DC] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPeriod("30")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              period === "30"
                ? "bg-white text-[#0C1618] shadow-xs font-bold"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            onClick={() => setPeriod("90")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              period === "90"
                ? "bg-white text-[#0C1618] shadow-xs font-bold"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            Últimos 90 dias
          </button>
          <button
            type="button"
            onClick={() => setPeriod("year")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              period === "year"
                ? "bg-white text-[#0C1618] shadow-xs font-bold"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            Ano 2026
          </button>
        </div>
      </div>

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E9E4DC] rounded-xl p-5 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#869296] font-mono-kasa">
              Alcance Total
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="size-3" /> +28.4%
            </span>
          </div>
          <p className="text-2xl font-bold font-mono-kasa text-[#0C1618]">
            18.920
          </p>
          <p className="text-[11px] text-[#6A787B]">
            Pessoas impactadas nos canais oficiais
          </p>
        </div>

        <div className="bg-white border border-[#E9E4DC] rounded-xl p-5 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#869296] font-mono-kasa">
              Engajamento
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="size-3" /> +18.2%
            </span>
          </div>
          <p className="text-2xl font-bold font-mono-kasa text-[#0C1618]">
            1.620
          </p>
          <p className="text-[11px] text-[#6A787B]">
            Curtidas, comentários e salvamentos
          </p>
        </div>

        <div className="bg-white border border-[#E9E4DC] rounded-xl p-5 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#869296] font-mono-kasa">
              Leads Gerados
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="size-3" /> +41.0%
            </span>
          </div>
          <p
            className="text-2xl font-bold font-mono-kasa"
            style={{ color: clientBrandColor }}
          >
            48
          </p>
          <p className="text-[11px] text-[#6A787B]">
            Conversões e contatos comerciais
          </p>
        </div>

        <div className="bg-white border border-[#E9E4DC] rounded-xl p-5 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#869296] font-mono-kasa">
              Taxa de Conversão
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="size-3" /> +3.2%
            </span>
          </div>
          <p className="text-2xl font-bold font-mono-kasa text-[#0C1618]">
            4.2%
          </p>
          <p className="text-[11px] text-[#6A787B]">
            Média de eficiência por publicação
          </p>
        </div>
      </div>

      {/* Gráfico de Evolução */}
      <div className="bg-white border border-[#E9E4DC] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0C1618]">
              Crescimento de Alcance & Audiência
            </h3>
            <p className="text-xs text-[#6A787B] mt-0.5">
              Acompanhamento mensal do volume de visualizações nos canais da marca
            </p>
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-lg border border-[#E9E4DC] hover:border-[#0C1618] text-xs font-bold text-[#0C1618] transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Download className="size-3.5" />
            <span>Exportar Relatório PDF</span>
          </button>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={PERFORMANCE_DATA}>
              <defs>
                <linearGradient id="clientBrandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={clientBrandColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={clientBrandColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE1" />
              <XAxis dataKey="month" stroke="#869296" fontSize={11} />
              <YAxis stroke="#869296" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0C1618",
                  borderRadius: 8,
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="alcance"
                stroke={clientBrandColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#clientBrandGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
