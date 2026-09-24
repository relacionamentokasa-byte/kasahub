import React, { useState } from "react";
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  FileText,
  Video,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ApprovalItemData {
  id: string;
  title: string;
  description?: string | null;
  content_type: "image" | "video" | "pdf" | "text";
  content_url?: string | null;
  content_text?: string | null;
  caption?: string | null;
  thumbnail_url?: string | null;
  status: "pending" | "approved" | "rejected";
  feedback?: string | null;
  sent_for_approval_at?: string;
  created_at?: string;
  format?: "single" | "carousel" | "story";
  slides?: Array<{
    id: string;
    url: string;
    thumbnail_url?: string | null;
    kind?: "image" | "video";
  }>;
}

interface KasaApprovalsViewProps {
  items: ApprovalItemData[];
  onApprove?: (itemId: string) => Promise<void> | void;
  onRequestChange?: (itemId: string, feedback: string) => Promise<void> | void;
}

export function KasaApprovalsView({
  items,
  onApprove,
  onRequestChange,
}: KasaApprovalsViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    items[0]?.id || null
  );
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [isRequestingChange, setIsRequestingChange] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    "pending"
  );

  const selectedItem = items.find((it) => it.id === selectedId) || items[0];

  const filteredItems = items.filter((it) => {
    if (filter === "all") return true;
    return it.status === filter;
  });

  const pendingCount = items.filter((it) => it.status === "pending").length;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setActiveSlideIndex(0);
    setIsRequestingChange(false);
    setFeedbackText("");
  };

  const currentSlides =
    selectedItem?.slides && selectedItem.slides.length > 0
      ? selectedItem.slides
      : selectedItem?.content_url
      ? [
          {
            id: "single-1",
            url: selectedItem.content_url,
            kind: selectedItem.content_type === "video" ? ("video" as const) : ("image" as const),
          },
        ]
      : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Header do Módulo — Padrão Clean Kasa Hub */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-4">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296]">
            OPERAÇÃO · APROVAÇÕES
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-0.5">
            Central de Aprovações
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Avalie, aprove ou solicite ajustes nas peças e conteúdos criados pela Kasa.
          </p>
        </div>

        {/* Filtros em Pílula */}
        <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E9E4DC] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filter === "pending"
                ? "bg-white text-[#0C1618] shadow-xs font-bold"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            <span>Pendentes</span>
            {pendingCount > 0 && (
              <span className="size-4 rounded-full bg-orange-500 text-white text-[10px] font-mono-kasa flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilter("approved")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === "approved"
                ? "bg-white text-[#0C1618] shadow-xs font-bold"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            Aprovados
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === "all"
                ? "bg-white text-[#0C1618] shadow-xs font-bold"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            Todos ({items.length})
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-white border border-[#E9E4DC] rounded-2xl p-12 text-center space-y-2 shadow-sm">
          <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-5" />
          </div>
          <h3 className="font-bold text-sm text-[#0C1618]">
            Nenhuma peça pendente de aprovação
          </h3>
          <p className="text-xs text-[#869296] max-w-sm mx-auto">
            Todas as criações enviadas já foram avaliadas ou não há novos itens aguardando seu retorno.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna 1: Lista de Peças (Col 1-4) */}
          <div className="lg:col-span-4 bg-white border border-[#E9E4DC] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0EBE1]">
              <span className="text-[10px] font-mono-kasa uppercase font-bold text-[#869296]">
                Peças ({filteredItems.length})
              </span>
              <span className="text-[11px] text-[#869296]">Selecione para revisar</span>
            </div>

            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const isSelected = item.id === selectedItem?.id;
                const isPending = item.status === "pending";
                const isApproved = item.status === "approved";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#FAF8F5] border-[#0C1618] shadow-xs"
                        : "bg-white border-[#E9E4DC] hover:border-[#D1C9BC] hover:bg-[#FAF8F5]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono-kasa uppercase font-bold text-[#869296]">
                        {item.content_type} · {item.format || "Peça"}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isPending
                            ? "bg-orange-50 text-orange-700 border-orange-200/60"
                            : isApproved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                            : "bg-rose-50 text-rose-700 border-rose-200/60"
                        }`}
                      >
                        {isPending
                          ? "Aguardando você"
                          : isApproved
                          ? "Aprovado"
                          : "Com ajustes"}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#0C1618] mt-1.5 truncate">
                      {item.title}
                    </h4>

                    {item.caption && (
                      <p className="text-[11px] text-[#6A787B] line-clamp-2 mt-0.5 leading-relaxed">
                        {item.caption}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna 2: Visualizador & Decisão (Col 5-12) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedItem && (
              <div className="bg-white border border-[#E9E4DC] rounded-2xl overflow-hidden shadow-sm">
                {/* Header da Peça */}
                <div className="p-5 border-b border-[#E9E4DC] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono-kasa uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FAF8F5] text-[#869296] border border-[#E9E4DC]">
                        {selectedItem.content_type.toUpperCase()}
                      </span>
                      {selectedItem.created_at && (
                        <span className="text-xs text-[#869296] font-mono-kasa">
                          Enviado em{" "}
                          {format(new Date(selectedItem.created_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-[#0C1618] mt-1">
                      {selectedItem.title}
                    </h2>
                  </div>

                  <div>
                    {selectedItem.status === "pending" && (
                      <span className="text-xs font-bold px-3 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200/60 flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        Aguardando sua decisão
                      </span>
                    )}
                    {selectedItem.status === "approved" && (
                      <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5" />
                        Peça Aprovada
                      </span>
                    )}
                  </div>
                </div>

                {/* Área de Visualização da Mídia */}
                <div className="p-6 bg-[#FAF8F5] flex flex-col items-center justify-center min-h-[360px] relative">
                  {currentSlides.length > 0 && currentSlides[activeSlideIndex] ? (
                    <div className="max-w-md w-full rounded-xl overflow-hidden shadow-md border border-[#E9E4DC] bg-[#0C1618] relative group">
                      {currentSlides[activeSlideIndex].kind === "video" ? (
                        <video
                          src={currentSlides[activeSlideIndex].url}
                          controls
                          className="w-full max-h-[460px] object-contain mx-auto"
                        />
                      ) : (
                        <img
                          src={currentSlides[activeSlideIndex].url}
                          alt={selectedItem.title}
                          className="w-full max-h-[460px] object-contain mx-auto"
                        />
                      )}

                      {/* Paginação do Carrossel */}
                      {currentSlides.length > 1 && (
                        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 z-10">
                          {currentSlides.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setActiveSlideIndex(i)}
                              className={`size-2 rounded-full transition-all ${
                                i === activeSlideIndex
                                  ? "bg-white w-5"
                                  : "bg-white/50 hover:bg-white"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="max-w-md w-full bg-white border border-[#E9E4DC] rounded-xl p-8 text-center space-y-2 shadow-xs">
                      <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <FileText className="size-5" />
                      </div>
                      <h3 className="font-bold text-sm text-[#0C1618]">
                        {selectedItem.title}
                      </h3>
                      {selectedItem.caption && (
                        <p className="text-xs text-[#6A787B] leading-relaxed italic bg-[#FAF8F5] p-3.5 rounded-lg border border-[#E9E4DC]">
                          &ldquo;{selectedItem.caption}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {currentSlides.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveSlideIndex((prev) =>
                            prev > 0 ? prev - 1 : currentSlides.length - 1
                          )
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white border border-[#E9E4DC] text-[#0C1618] flex items-center justify-center shadow-md hover:bg-[#FAF8F5] transition"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveSlideIndex((prev) =>
                            prev < currentSlides.length - 1 ? prev + 1 : 0
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white border border-[#E9E4DC] text-[#0C1618] flex items-center justify-center shadow-md hover:bg-[#FAF8F5] transition"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Legenda / Copy */}
                {selectedItem.caption && (
                  <div className="p-5 border-t border-[#E9E4DC] space-y-1.5">
                    <span className="text-[10px] font-mono-kasa font-bold uppercase text-[#869296]">
                      Texto de Apoio / Legenda
                    </span>
                    <p className="text-xs text-[#0C1618] leading-relaxed whitespace-pre-line bg-[#FAF8F5] p-3 rounded-xl border border-[#E9E4DC]">
                      {selectedItem.caption}
                    </p>
                  </div>
                )}

                {/* Ações */}
                <div className="p-5 border-t border-[#E9E4DC] bg-white">
                  {!isRequestingChange ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setIsRequestingChange(true)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#E9E4DC] hover:border-[#0C1618] text-[#0C1618] font-bold text-xs transition flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="size-3.5" />
                        <span>Solicitar Alterações</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onApprove?.(selectedItem.id)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0C1618] hover:bg-[#1C2A2D] text-white font-bold text-xs shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="size-4 text-emerald-400" />
                        <span>Aprovar Peça</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-xl border border-[#E9E4DC]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0C1618]">
                          O que você gostaria de ajustar nesta peça?
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsRequestingChange(false)}
                          className="text-xs text-[#869296] hover:text-[#0C1618]"
                        >
                          Cancelar
                        </button>
                      </div>

                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Ex: Trocar a imagem do slide 2 e alterar o texto de chamada..."
                        rows={3}
                        className="w-full bg-white border border-[#E9E4DC] rounded-xl p-3 text-xs text-[#0C1618] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0C1618]"
                      />

                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!feedbackText.trim()}
                          onClick={() => {
                            onRequestChange?.(selectedItem.id, feedbackText);
                            setIsRequestingChange(false);
                            setFeedbackText("");
                          }}
                          className="px-4 py-2 rounded-xl bg-[#0C1618] hover:bg-[#1C2A2D] disabled:opacity-50 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                        >
                          <Send className="size-3.5" />
                          <span>Enviar Pedido de Ajuste</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
