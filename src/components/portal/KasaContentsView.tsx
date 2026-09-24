import React, { useState } from "react";
import {
  Sparkles,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  Eye,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";
import { SocialIcon } from "@/components/editorial/SocialIcon";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ContentFeedItem {
  id: string;
  title: string;
  caption?: string | null;
  channel: "instagram" | "linkedin" | "tiktok" | "youtube" | "blog" | string;
  format_type: "reels" | "carousel" | "single" | "story" | "article" | string;
  publish_date?: string | null;
  status: "draft" | "approval" | "scheduled" | "published" | string;
  cover_url?: string | null;
  likes?: number;
  comments?: number;
}

interface KasaContentsViewProps {
  items?: ContentFeedItem[];
  clientBrandColor?: string;
  clientName?: string;
  onNavigateApproval?: (id?: string) => void;
}

export function KasaContentsView({
  items = [],
  clientBrandColor = "#FFBC45",
  clientName = "Cliente",
  onNavigateApproval,
}: KasaContentsViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const sampleContents: ContentFeedItem[] =
    items.length > 0
      ? items
      : [
          {
            id: "cnt-1",
            title: "Carrossel: 5 Normas Regulamentadoras Essenciais em 2026",
            caption: "Você sabia que a conformidade técnica pode reduzir custos operacionais em até 40%? Confira o carrossel completo.",
            channel: "instagram",
            format_type: "carousel",
            publish_date: "2026-09-24T18:00:00Z",
            status: "scheduled",
            likes: 142,
            comments: 18,
          },
          {
            id: "cnt-2",
            title: "Reels: Bastidores da Linha de Produção & Segurança",
            caption: "Tecnologia e precisão em cada detalhe. Conheça nossa fábrica.",
            channel: "instagram",
            format_type: "reels",
            publish_date: "2026-09-22T12:00:00Z",
            status: "published",
            likes: 520,
            comments: 43,
          },
          {
            id: "cnt-3",
            title: "Artigo: Tendências de Liderança e Gestão Estratégica",
            caption: "Como grandes gestores constroem culturas de alta performance com humanidade antes da meta.",
            channel: "linkedin",
            format_type: "article",
            publish_date: "2026-09-26T10:00:00Z",
            status: "draft",
          },
        ];

  const filteredContents = sampleContents.filter((c) => {
    if (channelFilter === "all") return true;
    return c.channel === channelFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Header do Módulo — Padrão Clean Kasa Hub */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-4">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296]">
            EDITORIAL · CONTEÚDOS & POSTS
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-0.5">
            Grade de Conteúdos
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Planejamento editorial, posts programados e histórico de publicações de {clientName}.
          </p>
        </div>

        {/* Controles: Filtro por Canal e Visualização em Pílula */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E9E4DC]">
            <button
              type="button"
              onClick={() => setChannelFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                channelFilter === "all"
                  ? "bg-white text-[#0C1618] shadow-xs font-bold"
                  : "text-[#869296] hover:text-[#0C1618]"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter("instagram")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                channelFilter === "instagram"
                  ? "bg-white text-[#0C1618] shadow-xs font-bold"
                  : "text-[#869296] hover:text-[#0C1618]"
              }`}
            >
              Instagram
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter("linkedin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                channelFilter === "linkedin"
                  ? "bg-white text-[#0C1618] shadow-xs font-bold"
                  : "text-[#869296] hover:text-[#0C1618]"
              }`}
            >
              LinkedIn
            </button>
          </div>

          <div className="flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-[#E9E4DC]">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid" ? "bg-white text-[#0C1618] shadow-xs" : "text-[#869296] hover:text-[#0C1618]"
              }`}
              title="Visualização em Grade"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "list" ? "bg-white text-[#0C1618] shadow-xs" : "text-[#869296] hover:text-[#0C1618]"
              }`}
              title="Visualização em Lista"
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Conteúdos */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContents.map((item) => {
            const isInstagram = item.channel === "instagram";
            const isPublished = item.status === "published";
            const isScheduled = item.status === "scheduled";

            return (
              <div
                key={item.id}
                className="bg-white border border-[#E9E4DC] rounded-xl p-4 hover:border-[#0C1618] hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
              >
                {/* Cabeçalho do Card */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-md bg-[#FAF8F5] text-[#0C1618] border border-[#E9E4DC] flex items-center justify-center">
                        <SocialIcon network={isInstagram ? "instagram" : "linkedin"} size={14} />
                      </span>
                      <span className="text-[10px] font-mono-kasa font-bold uppercase tracking-wider text-[#869296]">
                        {item.format_type}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isPublished
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : isScheduled
                          ? "bg-blue-50 text-blue-700 border-blue-200/60"
                          : "bg-orange-50 text-orange-700 border-orange-200/60"
                      }`}
                    >
                      {isPublished ? "Publicado" : isScheduled ? "Agendado" : "Em Produção"}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-[#0C1618] line-clamp-2">
                    {item.title}
                  </h3>

                  {item.caption && (
                    <p className="text-[11px] text-[#6A787B] line-clamp-3 leading-relaxed">
                      {item.caption}
                    </p>
                  )}
                </div>

                {/* Rodapé do Card com Data e Ação */}
                <div className="pt-2.5 border-t border-[#F0EBE1] flex items-center justify-between">
                  <div className="text-[11px] text-[#869296] font-mono-kasa">
                    {item.publish_date
                      ? format(new Date(item.publish_date), "dd/MM/yyyy · HH:mm", { locale: ptBR })
                      : "A definir"}
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateApproval?.(item.id)}
                    className="text-xs font-bold text-[#0C1618] hover:underline flex items-center gap-1 transition"
                  >
                    <span>Ver detalhes</span>
                    <ArrowRight className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Visualização em Lista */
        <div className="bg-white border border-[#E9E4DC] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#F0EBE1]">
          {filteredContents.map((item) => (
            <div
              key={item.id}
              className="p-4 hover:bg-[#FAF8F5] transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <span className="p-2 rounded-lg bg-[#FAF8F5] text-[#0C1618] border border-[#E9E4DC] shrink-0 mt-0.5 flex items-center justify-center">
                  <SocialIcon network={item.channel === "instagram" ? "instagram" : "linkedin"} size={16} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono-kasa uppercase font-bold text-[#869296]">
                      {item.format_type}
                    </span>
                    <span className="text-xs text-[#869296]">·</span>
                    <span className="text-xs text-[#869296] font-mono-kasa">
                      {item.publish_date ? format(new Date(item.publish_date), "dd/MM/yyyy", { locale: ptBR }) : "Em breve"}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#0C1618] mt-0.5">
                    {item.title}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateApproval?.(item.id)}
                className="px-3.5 py-1.5 rounded-lg border border-[#E9E4DC] hover:border-[#0C1618] text-[#0C1618] text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>Visualizar</span>
                <ArrowRight className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
