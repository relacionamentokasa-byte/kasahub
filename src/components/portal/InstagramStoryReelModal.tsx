import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Send,
  Heart,
  MessageSquare,
  Sparkles,
  Layers,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FeedPostItem } from "./InstagramPostModal";

interface InstagramStoryReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FeedPostItem[];
  initialIndex?: number;
  client: {
    name: string;
    company?: string | null;
    logo_url?: string | null;
    portal_slug?: string | null;
    brand_primary?: string | null;
    portal_primary_color?: string | null;
  };
  slug?: string;
  onApprove?: (id: string) => void;
  onRequestChange?: (id: string, feedback: string) => void;
}

const STORY_DURATION_MS = 6000; // 6 segundos por slide de imagem

export function InstagramStoryReelModal({
  isOpen,
  onClose,
  items = [],
  initialIndex = 0,
  client,
  slug,
  onApprove,
  onRequestChange,
}: InstagramStoryReelModalProps) {
  const qc = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showAdjustInput, setShowAdjustInput] = useState(false);
  const [adjustText, setAdjustText] = useState("");
  const [commentText, setCommentText] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);

  const displayName = client.company || client.name;
  const clientHandle = (client.portal_slug || client.name)
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._]/g, "");

  const currentItem = items[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
    elapsedBeforePauseRef.current = 0;
    setShowAdjustInput(false);
    setAdjustText("");
  }, [initialIndex, isOpen]);

  // Controle de avanço de slides
  const nextSlide = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
    } else {
      onClose();
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
    }
  };

  // Timer para Stories de Imagem e Sincronização com Vídeos
  useEffect(() => {
    if (!isOpen || !currentItem || showAdjustInput) return;

    const isVideo =
      currentItem.content_type === "video" ||
      currentItem.format === "reels" ||
      (currentItem.slides && currentItem.slides[0]?.kind === "video");

    if (isVideo && videoRef.current) {
      const vid = videoRef.current;
      vid.muted = isMuted;
      if (isPaused) {
        vid.pause();
      } else {
        vid.play().catch(() => {});
      }

      const handleTimeUpdate = () => {
        if (vid.duration) {
          setProgress((vid.currentTime / vid.duration) * 100);
        }
      };

      const handleEnded = () => {
        nextSlide();
      };

      vid.addEventListener("timeupdate", handleTimeUpdate);
      vid.addEventListener("ended", handleEnded);

      return () => {
        vid.removeEventListener("timeupdate", handleTimeUpdate);
        vid.removeEventListener("ended", handleEnded);
      };
    } else {
      // É Imagem: Barra de progresso linear
      if (isPaused) return;

      const duration = STORY_DURATION_MS;
      startTimeRef.current = Date.now() - elapsedBeforePauseRef.current;

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const p = Math.min((elapsed / duration) * 100, 100);
        setProgress(p);

        if (p >= 100) {
          clearInterval(interval);
          nextSlide();
        }
      }, 30);

      timerRef.current = interval;

      return () => {
        clearInterval(interval);
        elapsedBeforePauseRef.current = Date.now() - startTimeRef.current;
      };
    }
  }, [currentIndex, isPaused, isOpen, currentItem, showAdjustInput, isMuted]);

  // Teclado (Esc, Setas)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, items.length]);

  // Mutações de Aprovação
  const approvalMutation = useMutation({
    mutationFn: async (payload: { action: string; feedback?: string | null; comment?: string | null }) => {
      if (!slug || !currentItem) return payload;
      const res = await fetch(`/api/public/portal-approval-action/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: currentItem.id, ...payload }),
      });
      if (!res.ok) throw new Error("action_failed");
      return payload;
    },
    onSuccess: (vars) => {
      if (slug) qc.invalidateQueries({ queryKey: ["minha-kasa", slug] });
      if (vars.action === "approve") {
        toast.success("Story / Reel aprovado com sucesso! 🎉");
        onApprove?.(currentItem!.id);
      } else if (vars.action === "reject") {
        toast.success("Solicitação de ajuste enviada! 📝");
        onRequestChange?.(currentItem!.id, vars.feedback || "");
        setShowAdjustInput(false);
        setAdjustText("");
      } else if (vars.action === "comment") {
        toast.success("Mensagem enviada à equipe! 💬");
        setCommentText("");
      }
    },
    onError: () => {
      toast.error("Não foi possível enviar a ação. Tente novamente.");
    },
  });

  if (!isOpen || !currentItem) return null;

  const isPending = currentItem.status === "pending" || currentItem.status === "approval";
  const isApproved = currentItem.status === "approved" || currentItem.status === "published";
  const mediaUrl =
    currentItem.content_url ||
    currentItem.thumbnail_url ||
    currentItem.slides?.[0]?.url;

  const isVideo =
    currentItem.content_type === "video" ||
    currentItem.format === "reels" ||
    (currentItem.slides && currentItem.slides[0]?.kind === "video");

  const handleSendApproval = () => {
    approvalMutation.mutate({ action: "approve" });
  };

  const handleSendAdjustment = () => {
    if (!adjustText.trim()) {
      toast.error("Por favor, descreva o ajuste necessário.");
      return;
    }
    approvalMutation.mutate({ action: "reject", feedback: adjustText.trim() });
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    approvalMutation.mutate({ action: "comment", comment: commentText.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Botão Fechar no Desktop */}
      <button
        type="button"
        onClick={onClose}
        className="hidden sm:flex absolute top-6 right-6 z-50 size-11 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center backdrop-blur-md transition cursor-pointer"
        title="Fechar (Esc)"
      >
        <X className="size-6" />
      </button>

      {/* Seta Esquerda Navegação */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-40 size-12 rounded-full bg-white/10 hover:bg-white/25 text-white items-center justify-center backdrop-blur-md transition cursor-pointer"
        >
          <ChevronLeft className="size-7" />
        </button>
      )}

      {/* Seta Direita Navegação */}
      {currentIndex < items.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-40 size-12 rounded-full bg-white/10 hover:bg-white/25 text-white items-center justify-center backdrop-blur-md transition cursor-pointer"
        >
          <ChevronRight className="size-7" />
        </button>
      )}

      {/* ========================================================================= */}
      {/* CONTAINER 9:16 (1080x1920) ESTILO STORY / REELS NATIVO                    */}
      {/* ========================================================================= */}
      <div
        className="relative w-full max-w-[420px] h-full sm:h-[92vh] sm:max-h-[850px] aspect-[9/16] bg-[#121212] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between border sm:border-white/15"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* ================= TOPO: BARRAS DE PROGRESSO SEGMENTADAS ================= */}
        <div className="absolute top-0 inset-x-0 z-30 p-3 pt-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent space-y-3">
          {/* Segmentos de Progresso */}
          <div className="flex items-center gap-1.5 w-full">
            {items.map((it, idx) => {
              let fillPercent = 0;
              if (idx < currentIndex) fillPercent = 100;
              else if (idx === currentIndex) fillPercent = progress;
              else fillPercent = 0;

              return (
                <div
                  key={it.id || idx}
                  className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Header do Perfil: Avatar, Nome, Tempo e Controles */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full p-[1.5px] bg-gradient-to-tr from-[#FFB800] via-[#FA7E1E] to-[#D62976]">
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                  {client.logo_url ? (
                    <img src={client.logo_url} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-[#0C1618]">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold">{clientHandle}</span>
                  <span className="text-[10px] text-blue-400 font-bold">✓</span>
                  <span className="text-[10px] text-white/70 ml-1">
                    {currentItem.created_at
                      ? format(new Date(currentItem.created_at), "HH:mm")
                      : "Agora"}
                  </span>
                </div>
              </div>
            </div>

            {/* Controles de Áudio, Pausa e Fechar */}
            <div className="flex items-center gap-2">
              {isVideo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white cursor-pointer"
                >
                  {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(!isPaused);
                }}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white cursor-pointer"
              >
                {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="sm:hidden p-1.5 rounded-full bg-black/40 text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= ZONAS DE TOQUE (TOQUE ESQUERDA / DIREITA) ================= */}
        <div className="absolute inset-0 z-10 flex">
          <div
            className="w-1/3 h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
          />
          <div
            className="w-2/3 h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
          />
        </div>

        {/* ================= MÍDIA EM 9:16 (1080x1920) ================= */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
          {mediaUrl ? (
            isVideo ? (
              <video
                ref={videoRef}
                key={mediaUrl}
                src={mediaUrl}
                playsInline
                autoPlay
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                key={mediaUrl}
                src={mediaUrl}
                alt={currentItem.title}
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="p-8 text-center text-white/70 space-y-3">
              <Sparkles className="size-12 mx-auto text-[#FFBC45]" />
              <p className="text-base font-bold">{currentItem.title}</p>
              <p className="text-xs text-white/60">Story / Reel 9:16 (1080x1920 px)</p>
            </div>
          )}

          {/* Badge de Status Flutuante */}
          <div className="absolute top-20 right-3 z-20 pointer-events-none">
            {isPending && (
              <span className="px-2.5 py-1 rounded-full bg-[#E1306C] text-white text-[10px] font-bold shadow-lg flex items-center gap-1 animate-pulse">
                <Clock className="size-3" />
                <span>Pendente</span>
              </span>
            )}
            {isApproved && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-lg flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                <span>Aprovado</span>
              </span>
            )}
          </div>
        </div>

        {/* ================= RODAPÉ: AÇÕES DE APROVAÇÃO & COMENTÁRIO ================= */}
        <div className="relative z-30 p-4 pb-5 bg-gradient-to-t from-black via-black/70 to-transparent space-y-3">
          {/* Legenda / Título curto do Story */}
          {(currentItem.caption || currentItem.title) && (
            <div className="text-xs text-white/90 line-clamp-2 leading-relaxed px-1">
              <span className="font-bold mr-1.5">{clientHandle}</span>
              <span>{currentItem.caption || currentItem.title}</span>
            </div>
          )}

          {/* Formulário de Ajuste (Se aberto) */}
          {showAdjustInput ? (
            <div className="bg-black/85 backdrop-blur-md p-3 rounded-2xl border border-white/20 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span>O que você gostaria de ajustar?</span>
                <button
                  type="button"
                  onClick={() => setShowAdjustInput(false)}
                  className="text-[10px] text-white/60 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
              <textarea
                value={adjustText}
                onChange={(e) => setAdjustText(e.target.value)}
                rows={2}
                placeholder="Ex: alterar a fonte do texto e ajustar a música de fundo..."
                className="w-full bg-white/10 border border-white/20 rounded-xl p-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#FFBC45]"
                autoFocus
              />
              <button
                type="button"
                disabled={!adjustText.trim() || approvalMutation.isPending}
                onClick={handleSendAdjustment}
                className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
              >
                {approvalMutation.isPending ? "Enviando..." : "Enviar Solicitação de Ajuste"}
              </button>
            </div>
          ) : (
            <>
              {/* Barra de Envio de Mensagem Rápida */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendComment();
                  }}
                  placeholder="Enviar mensagem para o time..."
                  className="flex-1 bg-white/15 backdrop-blur-md border border-white/25 rounded-full px-4 py-2 text-xs text-white placeholder:text-white/60 focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => setLiked(!liked)}
                  className={`p-2 rounded-full backdrop-blur-md transition cursor-pointer ${
                    liked ? "text-rose-500 bg-rose-500/20" : "text-white bg-white/15 hover:bg-white/25"
                  }`}
                >
                  <Heart className={`size-5 ${liked ? "fill-rose-500" : ""}`} />
                </button>
              </div>

              {/* Botões de Decisão: Solicitar Ajuste vs Aprovar Story */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdjustInput(true)}
                  disabled={approvalMutation.isPending}
                  className="py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 backdrop-blur-md transition active:scale-95 cursor-pointer"
                >
                  <AlertCircle className="size-3.5 text-orange-400" />
                  <span>Pedir Ajuste</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendApproval}
                  disabled={approvalMutation.isPending || isApproved}
                  style={
                    !isApproved
                      ? {
                          backgroundColor:
                            client.portal_primary_color ||
                            client.brand_primary ||
                            "#FFBC45",
                          color: "#0C1618",
                        }
                      : undefined
                  }
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition active:scale-95 cursor-pointer ${
                    isApproved
                      ? "bg-emerald-600/90 text-white cursor-default"
                      : "hover:opacity-95"
                  }`}
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>{isApproved ? "Aprovado ✓" : "Aprovar Story"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
