import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  MessageSquare,
  Send,
  Play,
  Layers,
  Heart,
  Share2,
  Bookmark,
  Sparkles,
  ExternalLink,
  Download,
  MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface FeedSlide {
  id: string;
  url: string;
  thumbnail_url?: string | null;
  kind?: "image" | "video";
  mime_type?: string | null;
}

export interface FeedComment {
  id: string;
  approval_item_id?: string;
  slide_id?: string | null;
  author_type: "client" | "team";
  author_name: string | null;
  body: string;
  is_change_request?: boolean;
  created_at: string;
}

export interface FeedPostItem {
  id: string;
  title: string;
  description?: string | null;
  content_type: "image" | "video" | "pdf" | "text" | string;
  content_url?: string | null;
  content_text?: string | null;
  caption?: string | null;
  thumbnail_url?: string | null;
  status: "pending" | "approved" | "rejected" | "scheduled" | "published" | string;
  feedback?: string | null;
  sent_for_approval_at?: string;
  created_at?: string;
  format?: "single" | "carousel" | "story" | "reels" | string;
  slides?: FeedSlide[];
  slide_statuses?: Record<string, "pending" | "approved" | "rejected">;
  likes?: number;
  comments_count?: number;
  scheduled_at?: string | null;
}

interface InstagramPostModalProps {
  slug?: string;
  post: FeedPostItem | null;
  clientName: string;
  clientAvatar?: string | null;
  clientBrandColor?: string;
  comments?: FeedComment[];
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onRequestChange?: (id: string, feedback: string) => void;
  onSlideAction?: (action: string, slideId: string, feedback?: string) => void;
}

export function InstagramPostModal({
  slug,
  post,
  clientName,
  clientAvatar,
  clientBrandColor = "#FFBC45",
  comments = [],
  isOpen,
  onClose,
  onApprove,
  onRequestChange,
}: InstagramPostModalProps) {
  const qc = useQueryClient();
  const [slideIdx, setSlideIdx] = useState(0);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [showAdjustInput, setShowAdjustInput] = useState(false);
  const [adjustText, setAdjustText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSlideIdx(0);
    setShowAdjustInput(false);
    setAdjustText("");
    setCommentText("");
  }, [post?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (post?.slides && post.slides.length > 1) {
        if (e.key === "ArrowRight") setSlideIdx((i) => Math.min(i + 1, (post.slides?.length || 1) - 1));
        if (e.key === "ArrowLeft") setSlideIdx((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, post?.slides]);

  const approvalMutation = useMutation({
    mutationFn: async (payload: { action: string; slide_id?: string | null; feedback?: string | null; comment?: string | null; author_name?: string | null }) => {
      if (!slug || !post) return payload;
      const res = await fetch(`/api/public/portal-approval-action/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: post.id, ...payload }),
      });
      if (!res.ok) throw new Error("action_failed");
      return payload;
    },
    onSuccess: (vars) => {
      if (slug) qc.invalidateQueries({ queryKey: ["minha-kasa", slug] });
      if (vars.action === "approve") {
        toast.success("Post aprovado com sucesso! 🎉");
        onApprove?.(post!.id);
      } else if (vars.action === "reject") {
        toast.success("Solicitação de ajuste enviada à equipe Kasa! 📝");
        onRequestChange?.(post!.id, vars.feedback || "");
        setShowAdjustInput(false);
        setAdjustText("");
      } else if (vars.action === "comment") {
        toast.success("Comentário adicionado! 💬");
        setCommentText("");
      }
    },
    onError: () => {
      toast.error("Não foi possível enviar a ação. Tente novamente.");
    },
  });

  if (!isOpen || !post) return null;

  const slides = post.slides && post.slides.length > 0
    ? post.slides
    : post.content_url
    ? [{ id: "slide-1", url: post.content_url, kind: (post.content_type === "video" ? "video" : "image") as any }]
    : [];

  const activeSlide = slides[slideIdx] || slides[0];
  const isPending = post.status === "pending" || post.status === "approval";
  const isApproved = post.status === "approved" || post.status === "published";
  const isRejected = post.status === "rejected";

  const handleCopyCaption = () => {
    const textToCopy = post.caption || post.description || post.content_text || "";
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedCaption(true);
      toast.success("Legenda copiada para a área de transferência!");
      setTimeout(() => setCopiedCaption(false), 2000);
    });
  };

  const handleSendApproval = () => {
    approvalMutation.mutate({ action: "approve" });
  };

  const handleSendAdjustment = () => {
    if (!adjustText.trim()) {
      toast.error("Por favor, descreva o que precisa ser ajustado.");
      return;
    }
    approvalMutation.mutate({ action: "reject", feedback: adjustText.trim() });
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    approvalMutation.mutate({
      action: "comment",
      comment: commentText.trim(),
      author_name: clientName,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Container Principal Estilo Modal Instagram Web */}
      <div
        className="relative w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] bg-white sm:rounded-2xl shadow-2xl overflow-hidden border border-[#DBDBDB] flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar Flutuante */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 size-9 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer"
          title="Fechar (Esc)"
        >
          <X className="size-5" />
        </button>

        {/* ================= COLUNA ESQUERDA: VISUALIZADOR DE MÍDIA 1080x1350 ================= */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[350px] md:min-h-[600px] max-h-[50vh] md:max-h-[92vh] overflow-hidden select-none">
          {activeSlide ? (
            activeSlide.kind === "video" || post.content_type === "video" ? (
              <video
                key={activeSlide.url}
                src={activeSlide.url}
                controls
                autoPlay
                playsInline
                className="w-full h-full max-h-[600px] object-contain mx-auto"
              />
            ) : (
              <img
                key={activeSlide.url}
                src={activeSlide.url}
                alt={post.title}
                className="w-full h-full max-h-[600px] object-contain mx-auto"
              />
            )
          ) : (
            <div className="p-8 text-center text-white/60 space-y-2">
              <Sparkles className="size-8 mx-auto text-[#FFBC45]" />
              <p className="text-sm font-medium">Pré-visualização do conteúdo</p>
            </div>
          )}

          {/* Navegação de Carrossel (Setas) */}
          {slides.length > 1 && (
            <>
              {slideIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setSlideIdx((i) => i - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center shadow-lg transition-all backdrop-blur-sm cursor-pointer"
                  title="Slide anterior"
                >
                  <ChevronLeft className="size-5" />
                </button>
              )}
              {slideIdx < slides.length - 1 && (
                <button
                  type="button"
                  onClick={() => setSlideIdx((i) => i + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center shadow-lg transition-all backdrop-blur-sm cursor-pointer"
                  title="Próximo slide"
                >
                  <ChevronRight className="size-5" />
                </button>
              )}

              {/* Indicador de Bolinhas (Dots) */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-none">
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === slideIdx ? "w-5 bg-[#0095F6]" : "w-1.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>

              {/* Contador de Slides */}
              <div className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-mono-kasa font-bold flex items-center gap-1 border border-white/10">
                <Layers className="size-3 text-[#FFBC45]" />
                <span>{slideIdx + 1}/{slides.length}</span>
              </div>
            </>
          )}

          {/* Badge de Status no Canto */}
          <div className="absolute bottom-4 left-4 z-10">
            {isPending && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E1306C] text-white text-xs font-bold shadow-lg">
                <Clock className="size-3.5" />
                Aguardando Aprovação
              </span>
            )}
            {isApproved && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-lg">
                <CheckCircle2 className="size-3.5" />
                Aprovado
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold shadow-lg">
                <AlertCircle className="size-3.5" />
                Ajuste Solicitado
              </span>
            )}
          </div>
        </div>

        {/* ================= COLUNA DIREITA: CONTEXTO, LEGENDA & AÇÕES ================= */}
        <div className="w-full md:w-[400px] bg-white flex flex-col justify-between border-t md:border-t-0 md:border-l border-[#DBDBDB]">
          {/* Topo do Post: Perfil */}
          <div className="p-4 border-b border-[#EFEFEF] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div
                className={`size-10 rounded-full p-[2px] flex items-center justify-center text-white font-bold text-xs shadow-2xs ${
                  isPending ? "bg-gradient-to-tr from-[#FFB800] via-[#FA7E1E] to-[#D62976]" : "bg-[#DBDBDB]"
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center border border-white">
                  {clientAvatar ? (
                    <img src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#262626] font-bold">{clientName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-[#262626] leading-none">{clientName}</h4>
                  <span className="text-[10px] text-[#0095F6] font-bold">✓</span>
                </div>
                <p className="text-[10px] text-[#737373] mt-0.5">
                  {post.created_at
                    ? format(new Date(post.created_at), "dd 'de' MMMM", { locale: ptBR })
                    : "Post Programado"}
                </p>
              </div>
            </div>

            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#FAFAFA] text-[#737373] border border-[#DBDBDB]">
              {post.format || post.content_type}
            </span>
          </div>

          {/* Meio: Legenda, Copy e Comentários (Scrollável) */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[300px] md:max-h-[340px]">
            {/* Título da Peça */}
            <div>
              <h3 className="text-sm font-bold text-[#262626] leading-snug">{post.title}</h3>
              {post.description && (
                <p className="text-xs text-[#737373] mt-1 leading-relaxed">{post.description}</p>
              )}
            </div>

            {/* Caixa da Legenda do Instagram */}
            {(post.caption || post.content_text) && (
              <div className="bg-[#FAFAFA] rounded-xl p-3.5 border border-[#DBDBDB] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#737373] tracking-wider">
                    Legenda do Post
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0095F6] hover:text-[#1877F2] transition-colors cursor-pointer"
                  >
                    {copiedCaption ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span className="text-emerald-600">Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copiar legenda</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-[#262626] leading-relaxed whitespace-pre-wrap font-sans">
                  {post.caption || post.content_text}
                </p>
              </div>
            )}

            {/* Feedback anterior de ajustes (se houver) */}
            {post.feedback && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1 text-[11px]">
                  <AlertCircle className="size-3.5 text-rose-600" />
                  Último ajuste solicitado:
                </p>
                <p className="leading-relaxed">{post.feedback}</p>
              </div>
            )}

            {/* Comentários / Histórico */}
            {comments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#EFEFEF]">
                <p className="text-[10px] uppercase font-bold text-[#737373]">
                  Comentários ({comments.length})
                </p>
                <div className="space-y-2">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-[#FAFAFA] p-2.5 rounded-lg border border-[#DBDBDB] text-xs">
                      <div className="flex items-center justify-between text-[10px] text-[#737373] mb-1">
                        <span className="font-bold text-[#262626]">
                          {c.author_name || (c.author_type === "client" ? clientName : "Time Kasa")}
                        </span>
                        <span>{format(new Date(c.created_at), "dd/MM HH:mm")}</span>
                      </div>
                      <p className="text-[#555] leading-relaxed">{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Barra de Engajamento Social Falso (Estilo Instagram) */}
          <div className="px-4 py-2.5 border-t border-[#EFEFEF] bg-white flex items-center justify-between text-[#262626]">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setLiked(!liked)}
                className={`transition-colors cursor-pointer ${liked ? "text-[#ED4956] fill-[#ED4956]" : "hover:text-[#ED4956]"}`}
              >
                <Heart className={`size-5 ${liked ? "fill-[#ED4956] text-[#ED4956]" : ""}`} />
              </button>
              <button type="button" onClick={() => document.getElementById("insta-comment-input")?.focus()} className="hover:text-slate-600 cursor-pointer">
                <MessageSquare className="size-5" />
              </button>
              <button type="button" onClick={handleCopyCaption} className="hover:text-slate-600 cursor-pointer">
                <Share2 className="size-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSaved(!saved)}
              className={`transition-colors cursor-pointer ${saved ? "text-[#FFBC45] fill-[#FFBC45]" : "hover:text-[#FFBC45]"}`}
            >
              <Bookmark className={`size-5 ${saved ? "fill-[#FFBC45]" : ""}`} />
            </button>
          </div>

          {/* Campo de Comentário Rápido */}
          <div className="p-3 bg-[#FAFAFA] border-t border-[#EFEFEF] flex items-center gap-2">
            <input
              id="insta-comment-input"
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendComment();
              }}
              placeholder="Adicione um comentário para a equipe..."
              className="flex-1 bg-white border border-[#DBDBDB] rounded-lg px-3 py-1.5 text-xs text-[#262626] placeholder:text-[#8E8E8E] focus:outline-none focus:border-[#262626]"
            />
            <button
              type="button"
              disabled={!commentText.trim() || approvalMutation.isPending}
              onClick={handleSendComment}
              className="p-2 rounded-lg bg-[#0095F6] text-white disabled:opacity-40 hover:bg-[#1877F2] transition-colors cursor-pointer"
              title="Enviar comentário"
            >
              <Send className="size-3.5" />
            </button>
          </div>

          {/* Rodapé: Ações de Aprovação Kasa Hub */}
          <div className="p-4 bg-white border-t border-[#EFEFEF] space-y-2">
            {!showAdjustInput ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustInput(true)}
                  disabled={approvalMutation.isPending}
                  className="w-full py-2.5 px-3 rounded-lg border border-[#DBDBDB] hover:border-[#262626] hover:bg-[#FAFAFA] text-[#262626] font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertCircle className="size-3.5 text-[#F97316]" />
                  <span>Solicitar Ajuste</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendApproval}
                  disabled={approvalMutation.isPending || isApproved}
                  style={
                    !isApproved
                      ? {
                          backgroundColor: clientBrandColor,
                          color: "#0C1618",
                        }
                      : undefined
                  }
                  className={`w-full py-2.5 px-3 rounded-lg disabled:opacity-60 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] cursor-pointer ${
                    isApproved
                      ? "bg-emerald-600 text-white"
                      : "hover:opacity-95"
                  }`}
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>{isApproved ? "Aprovado" : "Aprovar Post"}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 bg-[#FAFAFA] p-3 rounded-lg border border-[#DBDBDB] animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#262626]">
                    Descreva os ajustes necessários:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAdjustInput(false)}
                    className="text-[10px] text-[#737373] hover:text-[#262626] font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
                <textarea
                  value={adjustText}
                  onChange={(e) => setAdjustText(e.target.value)}
                  rows={3}
                  placeholder="Ex: trocar a cor do título no slide 2 para azul e encurtar o último parágrafo da legenda..."
                  className="w-full bg-white border border-[#DBDBDB] rounded-md p-2 text-xs text-[#262626] placeholder:text-[#8E8E8E] focus:outline-none focus:border-[#262626]"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={!adjustText.trim() || approvalMutation.isPending}
                  onClick={handleSendAdjustment}
                  className="w-full py-2 rounded-md bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs transition cursor-pointer"
                >
                  {approvalMutation.isPending ? "Enviando..." : "Enviar Solicitação de Ajuste"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
