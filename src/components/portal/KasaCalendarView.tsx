import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Video,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CalendarEventItem {
  id: string;
  title: string;
  description?: string | null;
  kind?: string | null;
  starts_at: string;
  ends_at?: string | null;
  all_day?: boolean | null;
  color?: string | null;
  meet_url?: string | null;
}

interface KasaCalendarViewProps {
  events?: CalendarEventItem[];
  clientBrandColor?: string;
  clientName?: string;
}

export function KasaCalendarView({
  events = [],
  clientBrandColor = "#FFBC45",
  clientName = "Cliente",
}: KasaCalendarViewProps) {
  const sampleEvents: CalendarEventItem[] =
    events.length > 0
      ? events
      : [
          {
            id: "ev-1",
            title: "Alinhamento Estratégico Q4",
            description: "Revisão de metas, campanhas e planejamento de tráfego pago.",
            starts_at: "2026-09-22T10:00:00Z",
            ends_at: "2026-09-22T11:00:00Z",
            kind: "meeting",
            meet_url: "https://meet.google.com",
          },
          {
            id: "ev-2",
            title: "Entrega do Vídeo Master EPI",
            description: "Disponibilização da peça final para veiculação no YouTube e Redes.",
            starts_at: "2026-09-25T15:00:00Z",
            kind: "delivery",
          },
          {
            id: "ev-3",
            title: "Gravação Institucional em Campo",
            description: "Captação de imagens e depoimentos da equipe técnica.",
            starts_at: "2026-09-28T09:00:00Z",
            kind: "production",
          },
        ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Header do Módulo — Padrão Clean Kasa Hub */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-4">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296]">
            AGENDA · REUNIÕES & ENTREGAS
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-0.5">
            Calendário & Reuniões
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Acompanhe a agenda compartilhada de encontros estratégicos e prazos de {clientName}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lista de Próximos Compromissos (Col 1-8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-[#E9E4DC] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#0C1618] flex items-center gap-2">
              <Clock className="size-4 text-[#0C1618]" />
              <span>Próximos Compromissos Agendados</span>
            </h3>

            <div className="space-y-3">
              {sampleEvents.map((ev) => {
                const isMeeting = ev.kind === "meeting" || !!ev.meet_url;
                const startDate = new Date(ev.starts_at);

                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl border border-[#E9E4DC] bg-white hover:bg-[#FAF8F5] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-lg bg-[#FAF8F5] border border-[#E9E4DC] flex flex-col items-center justify-center shrink-0 font-mono-kasa font-bold text-xs text-[#0C1618]">
                        <span>{format(startDate, "dd/MM", { locale: ptBR })}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isMeeting
                                ? "bg-blue-50 text-blue-700 border-blue-200/60"
                                : "bg-amber-50 text-amber-700 border-amber-200/60"
                            }`}
                          >
                            {isMeeting ? "Reunião Online" : "Marco de Entrega"}
                          </span>
                          <span className="text-xs text-[#869296] font-mono-kasa">
                            {format(startDate, "HH:mm", { locale: ptBR })}h
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-[#0C1618] mt-1">
                          {ev.title}
                        </h4>

                        {ev.description && (
                          <p className="text-[11px] text-[#6A787B] mt-0.5">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {ev.meet_url && (
                      <a
                        href={ev.meet_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-lg bg-[#0C1618] hover:bg-[#1C2A2D] text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 self-start sm:self-auto"
                      >
                        <Video className="size-3.5 text-emerald-400" />
                        <span>Entrar no Meet</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card Lateral Informativo (Col 9-12) */}
        <div className="lg:col-span-4 bg-white border border-[#E9E4DC] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="size-9 rounded-lg bg-[#FAF8F5] border border-[#E9E4DC] flex items-center justify-center text-[#0C1618]">
            <Users className="size-4.5" />
          </div>

          <div>
            <h3 className="font-bold text-sm text-[#0C1618]">
              Atendimento Dedicado
            </h3>
            <p className="text-xs text-[#6A787B] leading-relaxed mt-1">
              Reuniões de alinhamento focadas em estratégia, análise de performance e tomadas de decisão rápidas para o crescimento da sua marca.
            </p>
          </div>

          <div className="pt-3 border-t border-[#F0EBE1] space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#0C1618]">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Gravações e atas disponíveis</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#0C1618]">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Pautas compartilhadas com antecedência</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
