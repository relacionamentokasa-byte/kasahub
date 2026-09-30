import React, { useState, useMemo } from "react";
import {
  Grid,
  Layers,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Send,
  ExternalLink,
  Copy,
  Check,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Tv,
  Eye,
  Link as LinkIcon,
  ShieldCheck,
  Compass,
  CheckCheck,
} from "lucide-react";
import { InstagramPostModal, type FeedPostItem, type FeedComment } from "./InstagramPostModal";
import { InstagramStoryReelModal } from "./InstagramStoryReelModal";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KasaInstagramFeedProps {
  client: {
    id: string;
    name: string;
    company?: string | null;
    logo_url?: string | null;
    brand_primary?: string | null;
    portal_primary_color?: string | null;
    portal_slug?: string | null;
  };
  slug?: string;
  approvalItems?: any[];
  editorialPosts?: any[];
  approvalComments?: Record<string, FeedComment[]>;
  onNavigateTab?: (tab: string) => void;
  onApproveAll?: () => void;
}

// Exemplos de mídias realistas 1080x1350 (4:5) de alta resolução
const FALLBACK_COVERS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1080&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1080&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1080&auto=format&fit=crop&q=85",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1080&auto=format&fit=crop&q=85",
];

export function KasaInstagramFeed({
  client,
  slug,
  approvalItems = [],
  editorialPosts = [],
  approvalComments = {},
  onNavigateTab,
  onApproveAll,
}: KasaInstagramFeedProps) {
  const [selectedPost, setSelectedPost] = useState<FeedPostItem | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<string>("todos");
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "carrosseis" | "pendentes">("posts");
  const [viewMode, setViewMode] = useState<"grid" | "feed">("grid");
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [storyViewerItems, setStoryViewerItems] = useState<FeedPostItem[]>([]);

  const displayName = client.company || client.name;
  const clientHandle = (client.portal_slug || client.name)
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._]/g, "");

  // Cor primária dinâmica da marca do cliente
  const clientBrandColor =
    client.portal_primary_color?.trim() ||
    client.brand_primary?.trim() ||
    "#FFBC45";

  // Unificar approval_items e editorial_posts em uma coleção única de FeedPostItem
  const allFeedItems = useMemo<FeedPostItem[]>(() => {
    const items: FeedPostItem[] = [];

    // 1. Mapear approval_items
    approvalItems.forEach((it, index) => {
      const isCarousel = it.format === "carousel" || (it.slides && it.slides.length > 1);
      const isVideo = it.content_type === "video" || it.format === "reels" || (it.slides && it.slides[0]?.kind === "video");
      const isStory = it.format === "story";

      const fallbackMedia = FALLBACK_COVERS[index % FALLBACK_COVERS.length];
      const mainMediaUrl = it.content_url || it.slides?.[0]?.url || fallbackMedia;
      const thumbUrl = it.thumbnail_url || it.slides?.[0]?.thumbnail_url || mainMediaUrl;

      const slides = it.slides && it.slides.length > 0
        ? it.slides
        : isCarousel
        ? [
            { id: `${it.id}-1`, url: mainMediaUrl, kind: "image" },
            { id: `${it.id}-2`, url: FALLBACK_COVERS[(index + 1) % FALLBACK_COVERS.length], kind: "image" },
            { id: `${it.id}-3`, url: FALLBACK_COVERS[(index + 2) % FALLBACK_COVERS.length], kind: "image" },
          ]
        : [{ id: `${it.id}-1`, url: mainMediaUrl, kind: isVideo ? "video" : "image" }];

      items.push({
        id: it.id,
        title: it.title || `Publicação #${index + 1}`,
        description: it.description,
        content_type: it.content_type || (isVideo ? "video" : "image"),
        content_url: mainMediaUrl,
        content_text: it.content_text,
        caption: it.caption || it.content_text || it.description || "🚀 Nova campanha estratégica desenvolvida pela Kasa Marketing para acelerar o engajamento e posicionamento de marca no mercado.\n\n👉 Comente o que achou desta edição e compartilhe com seu time!\n\n#marketing #estrategia #branding #crescimento #posicionamento",
        thumbnail_url: thumbUrl,
        status: it.status || "pending",
        feedback: it.feedback,
        sent_for_approval_at: it.sent_for_approval_at,
        created_at: it.created_at || new Date().toISOString(),
        format: isCarousel ? "carousel" : isStory ? "story" : isVideo ? "reels" : "single",
        slides: slides as any,
        slide_statuses: it.slide_statuses || {},
        likes: Math.floor(Math.random() * 85) + 38,
        comments_count: (approvalComments[it.id] || []).length || Math.floor(Math.random() * 6) + 1,
      });
    });

    // 2. Mapear editorial_posts que não sejam duplicados
    editorialPosts.forEach((ep, index) => {
      const alreadyHas = items.some((i) => i.id === ep.id || (ep.job_id && i.id === ep.job_id));
      if (!alreadyHas) {
        const isReels = ep.content_type === "reels" || ep.content_type === "video";
        const isCarousel = ep.content_type === "carousel";
        const fallbackMedia = FALLBACK_COVERS[(items.length + index) % FALLBACK_COVERS.length];
        const coverUrl = ep.cover_url || fallbackMedia;

        items.push({
          id: ep.id,
          title: ep.title || `Post #${items.length + 1}`,
          description: ep.description,
          content_type: isReels ? "video" : "image",
          content_url: coverUrl,
          thumbnail_url: coverUrl,
          caption: ep.description || "✨ Planejamento editorial de autoridade e conteúdo humanizado.\n\n#posicionamento #midiasdigitais",
          status: ep.status === "published" ? "approved" : "scheduled",
          created_at: ep.created_at || ep.scheduled_at || new Date().toISOString(),
          scheduled_at: ep.scheduled_at,
          format: isCarousel ? "carousel" : isReels ? "reels" : "single",
          slides: [{ id: `ep-${ep.id}`, url: coverUrl, kind: isReels ? "video" : "image" }],
          likes: Math.floor(Math.random() * 110) + 45,
          comments_count: Math.floor(Math.random() * 9) + 2,
        });
      }
    });

    // Ordenar: Pendentes primeiro, depois por data mais recente
    return items.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [approvalItems, editorialPosts, approvalComments]);

  // Estatísticas do Perfil
  const totalPosts = allFeedItems.length;
  const approvedCount = allFeedItems.filter((i) => i.status === "approved" || i.status === "published").length;
  const pendingCount = allFeedItems.filter((i) => i.status === "pending" || i.status === "approval").length;

  // Destaques (Story Highlights) com contadores
  const highlights = [
    { id: "todos", label: "Todos", count: totalPosts, emoji: "✨" },
    { id: "pendentes", label: "Pendentes", count: pendingCount, emoji: "⏳", isAlert: pendingCount > 0 },
    { id: "aprovados", label: "Aprovados", count: approvedCount, emoji: "✅" },
    { id: "carrosseis", label: "Carrossel", count: allFeedItems.filter((i) => i.format === "carousel").length, emoji: "🎠" },
    { id: "reels", label: "Reels", count: allFeedItems.filter((i) => i.format === "reels" || i.content_type === "video").length, emoji: "🎬" },
  ];

  // Filtragem dos Posts
  const filteredItems = useMemo(() => {
    let result = allFeedItems;

    if (activeHighlight === "pendentes") {
      result = result.filter((i) => i.status === "pending" || i.status === "approval");
    } else if (activeHighlight === "aprovados") {
      result = result.filter((i) => i.status === "approved" || i.status === "published");
    } else if (activeHighlight === "carrosseis") {
      result = result.filter((i) => i.format === "carousel");
    } else if (activeHighlight === "reels") {
      result = result.filter((i) => i.format === "reels" || i.content_type === "video");
    }

    if (activeTab === "reels") {
      result = result.filter((i) => i.format === "reels" || i.content_type === "video");
    } else if (activeTab === "carrosseis") {
      result = result.filter((i) => i.format === "carousel");
    } else if (activeTab === "pendentes") {
      result = result.filter((i) => i.status === "pending" || i.status === "approval");
    }

    return result;
  }, [allFeedItems, activeHighlight, activeTab]);

  const toggleLike = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLikedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSave = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSavedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link do perfil copiado!");
  };

  const handleApproveBatch = () => {
    if (onApproveAll) {
      onApproveAll();
      toast.success("Todas as publicações foram aprovadas com sucesso! 🎉");
    }
  };

  // Abrir Visualizador 9:16 de Stories e Reels
  const openStoryViewer = (itemsList: FeedPostItem[], startIndex = 0) => {
    if (itemsList.length === 0) {
      toast.info("Nenhuma publicação disponível neste formato.");
      return;
    }
    setStoryViewerItems(itemsList);
    setStoryViewerIndex(startIndex);
    setStoryViewerOpen(true);
  };

  // Abrir Stories a partir dos pendentes ou de todos
  const handleOpenStoriesFromAvatar = () => {
    const pendings = allFeedItems.filter((i) => i.status === "pending" || i.status === "approval");
    if (pendings.length > 0) {
      openStoryViewer(pendings, 0);
    } else {
      openStoryViewer(allFeedItems, 0);
    }
  };

  return (
    <div className="max-w-[935px] mx-auto space-y-4 sm:space-y-6 font-sans pb-16 antialiased text-[#262626]">
      {/* ========================================================================= */}
      {/* 1. HEADER DO PERFIL OFICIAL INSTAGRAM (INTEGRAÇÃO TOTAL DA MARCA)         */}
      {/* ========================================================================= */}
      <header className="bg-white border border-[#DBDBDB] sm:rounded-2xl p-6 sm:p-10 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-14">
          {/* Avatar com Story Ring Oficial do Instagram e Logo do Cliente */}
          <div
            onClick={handleOpenStoriesFromAvatar}
            className="relative shrink-0 cursor-pointer group"
            title="Clique para assistir aos Stories em 9:16"
          >
            <div
              className={`size-28 sm:size-38 rounded-full p-[3px] flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${
                pendingCount > 0
                  ? "bg-gradient-to-tr from-[#FFB800] via-[#FA7E1E] via-[#D62976] via-[#962FBF] to-[#4F5BD5] shadow-sm animate-pulse"
                  : "bg-gradient-to-tr from-[#DBDBDB] to-[#EFEFEF]"
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-white p-[2px] flex items-center justify-center">
                {client.logo_url ? (
                  <img
                    src={client.logo_url}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center text-white font-display text-4xl font-black shadow-inner"
                    style={{ backgroundColor: clientBrandColor }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {pendingCount > 0 && (
              <span className="absolute -bottom-1 -right-1 px-3 py-0.5 rounded-full bg-[#E1306C] text-white text-[10px] font-bold shadow-md border-2 border-white tracking-tight animate-bounce">
                {pendingCount} para aprovar
              </span>
            )}
          </div>

          {/* Dados do Perfil */}
          <div className="flex-1 text-center sm:text-left space-y-5 w-full">
            {/* Linha 1: Username @handle + Selo Azul + Ações */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center justify-center sm:justify-start gap-2.5">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0C1618] tracking-tight">
                  @{clientHandle}
                </h1>
                {/* Selo Azul de Verificado */}
                <svg
                  className="size-5 text-[#0095F6] shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" />
                </svg>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-center sm:justify-start gap-2">
                {pendingCount > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHighlight("pendentes");
                        setActiveTab("pendentes");
                      }}
                      style={{ backgroundColor: clientBrandColor }}
                      className="px-4 py-2 rounded-xl text-[#0C1618] hover:opacity-95 text-xs font-display font-bold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <Clock className="size-3.5" />
                      <span>Aprovar Peças ({pendingCount})</span>
                    </button>

                    {onApproveAll && (
                      <button
                        type="button"
                        onClick={handleApproveBatch}
                        className="px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-display font-bold transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        title="Aprovar todas as peças pendentes do mês de uma vez"
                      >
                        <CheckCheck className="size-3.5 text-emerald-600" />
                        <span className="hidden md:inline">Aprovar Tudo</span>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveHighlight("todos");
                      setActiveTab("posts");
                    }}
                    className="px-4 py-2 rounded-xl bg-[#EFEFEF] hover:bg-[#DBDBDB] text-[#0C1618] text-xs font-display font-bold transition active:scale-95 cursor-pointer"
                  >
                    Tudo Aprovado ✨
                  </button>
                )}

                <button
                  type="button"
                  onClick={copyProfileLink}
                  className="px-3.5 py-2 rounded-xl bg-[#EFEFEF] hover:bg-[#DBDBDB] text-[#0C1618] text-xs font-display font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Share2 className="size-3.5" />
                  <span>Compartilhar</span>
                </button>
              </div>
            </div>

            {/* Linha 2: Estatísticas com Tipografia Kasa Hub */}
            <div className="flex items-center justify-center sm:justify-start gap-8 sm:gap-10 text-sm">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-black text-base text-[#0C1618]">
                  {totalPosts}
                </span>
                <span className="text-xs text-[#6A787B] font-medium">publicações</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-black text-base text-[#0095F6]">
                  {approvedCount}
                </span>
                <span className="text-xs text-[#6A787B] font-medium">aprovados</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-black text-base text-[#E1306C]">
                  {pendingCount}
                </span>
                <span className="text-xs text-[#6A787B] font-medium">aguardando</span>
              </div>
            </div>

            {/* Linha 3: Bio Completa com Cores da Marca e Tipografia Onest */}
            <div className="text-sm text-[#0C1618] space-y-1.5 max-w-lg leading-relaxed font-sans">
              <p className="font-display font-bold text-base text-[#0C1618]">{displayName}</p>
              <p className="text-xs text-[#6A787B] font-semibold tracking-wide uppercase">
                Agência de Marketing & Redes Sociais
              </p>
              <p className="text-xs text-[#2D3E42] whitespace-pre-line leading-normal">
                Estratégia de conteúdo, criação de autoridade & produção de impacto digital.
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-1 text-[#00376B] text-xs font-semibold pt-0.5">
                <LinkIcon className="size-3 text-[#6A787B]" />
                <a
                  href={`https://instagram.com/${clientHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline font-mono text-[11px]"
                >
                  instagram.com/{clientHandle}
                </a>
              </div>
              <p className="text-[11px] text-[#6A787B] flex items-center justify-center sm:justify-start gap-1 pt-0.5 font-medium">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span>Gerenciado por <strong className="font-display text-[#0C1618]">Kasa Hub</strong></span>
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. DESTAQUES DOS STORIES (STORY HIGHLIGHTS REPLICADOS)                     */}
        {/* ========================================================================= */}
        <div className="mt-8 pt-6 border-t border-[#EFEFEF] overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <div className="flex items-center gap-5 sm:gap-8 min-w-max">
            {highlights.map((h) => {
              const active = activeHighlight === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setActiveHighlight(h.id);
                    if (h.id === "carrosseis") setActiveTab("carrosseis");
                    else if (h.id === "reels") {
                      setActiveTab("reels");
                      const reelsItems = allFeedItems.filter((i) => i.format === "reels" || i.content_type === "video");
                      if (reelsItems.length > 0) openStoryViewer(reelsItems, 0);
                    } else if (h.id === "pendentes") {
                      setActiveTab("pendentes");
                      const pendings = allFeedItems.filter((i) => i.status === "pending" || i.status === "approval");
                      if (pendings.length > 0) openStoryViewer(pendings, 0);
                    } else {
                      setActiveTab("posts");
                      openStoryViewer(allFeedItems, 0);
                    }
                  }}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div
                    className={`size-18 sm:size-20 rounded-full p-[2px] transition-all duration-200 ${
                      active
                        ? "bg-[#262626] scale-105 shadow-sm"
                        : h.isAlert
                        ? "bg-gradient-to-tr from-[#FFB800] via-[#FA7E1E] to-[#D62976] hover:scale-105 shadow-2xs"
                        : "bg-[#DBDBDB] hover:border-[#262626]"
                    }`}
                  >
                    <div
                      className={`w-full h-full rounded-full flex flex-col items-center justify-center border-2 border-white text-xl transition-colors ${
                        active ? "bg-[#FAFAFA] text-[#262626]" : "bg-[#FAFAFA] text-[#737373] group-hover:bg-white"
                      }`}
                    >
                      <span className="text-2xl leading-none">{h.emoji}</span>
                      <span className="text-[10px] font-mono-kasa font-bold text-[#8E8E8E] mt-0.5">
                        {h.count}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-sans transition-colors ${
                      active ? "text-[#0C1618] font-bold" : "text-[#6A787B] group-hover:text-[#0C1618] font-medium"
                    }`}
                  >
                    {h.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. BARRA DE SUB-ABAS NATIVAS INSTAGRAM COM TIPOGRAFIA KASA HUB            */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white sm:rounded-2xl px-4 py-1 shadow-2xs">
        {/* Abas Oficiais do Instagram */}
        <div className="flex items-center justify-center sm:justify-start gap-4 sm:gap-8 -mb-[1px]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("posts");
              setActiveHighlight("todos");
            }}
            className={`flex items-center gap-2 py-3 border-t sm:border-t-0 sm:border-b-2 text-xs font-display uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === "posts" && activeHighlight === "todos"
                ? "border-[#0C1618] text-[#0C1618] font-black"
                : "border-transparent text-[#6A787B] hover:text-[#0C1618] font-bold"
            }`}
          >
            {/* Ícone 3x3 Grid */}
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h4v4H3zm6 0h4v4H9zm6 0h4v4h-4zm-12 6h4v4H3zm6 0h4v4H9zm6 0h4v4h-4zm-12 6h4v4H3zm6 0h4v4H9zm6 0h4v4h-4z" />
            </svg>
            <span className="hidden sm:inline">Publicações</span>
            <span className="sm:hidden">Grade</span>
            <span className="text-[11px] font-mono text-[#869296]">({allFeedItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("reels");
              setActiveHighlight("reels");
              const reelsItems = allFeedItems.filter((i) => i.format === "reels" || i.content_type === "video");
              if (reelsItems.length > 0) {
                openStoryViewer(reelsItems, 0);
              }
            }}
            className={`flex items-center gap-2 py-3 border-t sm:border-t-0 sm:border-b-2 text-xs font-display uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === "reels" || activeHighlight === "reels"
                ? "border-[#0C1618] text-[#0C1618] font-black"
                : "border-transparent text-[#6A787B] hover:text-[#0C1618] font-bold"
            }`}
          >
            {/* Ícone Reels */}
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="m10 8 6 4-6 4V8zm11-5H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14z" />
            </svg>
            <span>Reels (9:16)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("carrosseis");
              setActiveHighlight("carrosseis");
            }}
            className={`flex items-center gap-2 py-3 border-t sm:border-t-0 sm:border-b-2 text-xs font-display uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === "carrosseis" || activeHighlight === "carrosseis"
                ? "border-[#0C1618] text-[#0C1618] font-black"
                : "border-transparent text-[#6A787B] hover:text-[#0C1618] font-bold"
            }`}
          >
            <Layers className="size-4" />
            <span>Carrossel</span>
          </button>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("pendentes");
                setActiveHighlight("pendentes");
              }}
              className={`flex items-center gap-2 py-3 border-t sm:border-t-0 sm:border-b-2 text-xs font-display uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === "pendentes" || activeHighlight === "pendentes"
                  ? "border-[#E1306C] text-[#E1306C] font-black"
                  : "border-transparent text-[#E1306C]/80 hover:text-[#E1306C] font-bold"
              }`}
            >
              <Clock className="size-4 text-[#E1306C]" />
              <span>Pendentes</span>
              <span className="px-2 py-0.5 rounded-full bg-[#E1306C] text-white text-[10px] font-mono font-bold">
                {pendingCount}
              </span>
            </button>
          )}
        </div>

        {/* Alternador de Visualização: Grade 1080x1350 vs Feed Timeline */}
        <div className="flex items-center gap-1 bg-[#F5F5F5] p-1 rounded-lg border border-[#DBDBDB]">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            title="Visualização em Grade 1080x1350 (4:5)"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-white text-[#262626] shadow-2xs font-bold"
                : "text-[#8E8E8E] hover:text-[#262626]"
            }`}
          >
            <Grid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("feed")}
            title="Visualização em Feed Contínuo"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === "feed"
                ? "bg-white text-[#262626] shadow-2xs font-bold"
                : "text-[#8E8E8E] hover:text-[#262626]"
            }`}
          >
            <Tv className="size-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. GRADE FIXA 1080x1350 (4:5) COM ESPAÇAMENTO ULTRA-COMPACTO                */}
      {/* ========================================================================= */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-[#DBDBDB] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <div className="size-14 rounded-full border-2 border-[#262626] text-[#262626] flex items-center justify-center mx-auto">
            <Compass className="size-7" />
          </div>
          <h3 className="font-bold text-base text-[#262626]">
            Nenhuma publicação neste filtro
          </h3>
          <p className="text-xs text-[#737373] max-w-sm mx-auto">
            Não há conteúdos cadastrados nesta categoria no momento. Clique abaixo para ver todas as publicações.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveHighlight("todos");
              setActiveTab("posts");
            }}
            className="px-5 py-2 rounded-lg bg-[#0095F6] hover:bg-[#1877F2] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Ver Todas as Publicações
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* ================= 4A. GRADE FIXA 4:5 (1080x1350) EM 3 COLUNAS ULTRA-COMPACTA ================= */
        <div className="grid grid-cols-3 gap-[1px] sm:gap-[2px] md:gap-[3px] bg-[#DBDBDB] p-[1px] rounded-lg overflow-hidden">
          {filteredItems.map((post) => {
            const isVideo = post.content_type === "video" || post.format === "reels";
            const isCarousel = post.format === "carousel" || (post.slides && post.slides.length > 1);
            const isPending = post.status === "pending" || post.status === "approval";
            const isApproved = post.status === "approved" || post.status === "published";
            const isAdjust = post.status === "rejected";

            const mediaUrl = post.thumbnail_url || post.content_url || post.slides?.[0]?.thumbnail_url || post.slides?.[0]?.url;

            return (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="group relative aspect-[4/5] overflow-hidden cursor-pointer bg-[#1A1A1A] select-none transition-all"
              >
                {/* Mídia em 1080x1350 */}
                {mediaUrl ? (
                  isVideo ? (
                    <video
                      src={mediaUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#2D3E42] to-[#0C1618] p-4 flex flex-col justify-between text-white">
                    <span className="text-[10px] font-mono-kasa uppercase font-bold text-[#FFBC45]">
                      {post.format || "Post"}
                    </span>
                    <p className="text-xs font-bold line-clamp-3 text-white/90">
                      {post.title}
                    </p>
                    <span className="text-[9px] text-white/50 font-mono-kasa">
                      1080x1350 px
                    </span>
                  </div>
                )}

                {/* Ícone de Formato no Canto Superior Direito */}
                <div className="absolute top-2 right-2 z-10 pointer-events-none drop-shadow-md">
                  {isCarousel && (
                    <svg className="size-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />
                    </svg>
                  )}
                  {isVideo && (
                    <svg className="size-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="m10 8 6 4-6 4V8zm11-5H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14z" />
                    </svg>
                  )}
                </div>

                {/* Badge de Status no Canto Superior Esquerdo */}
                <div className="absolute top-2 left-2 z-10 pointer-events-none">
                  {isPending && (
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-[#E1306C] text-white text-[9px] sm:text-[10px] font-bold shadow-md tracking-tight animate-pulse">
                      <Clock className="size-2.5" />
                      <span>Pendente</span>
                    </span>
                  )}
                  {isApproved && (
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] sm:text-[10px] font-bold shadow-md tracking-tight">
                      <Check className="size-2.5" />
                      <span>Aprovado</span>
                    </span>
                  )}
                  {isAdjust && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold shadow-md tracking-tight">
                      <AlertCircle className="size-2.5" />
                      <span>Ajuste</span>
                    </span>
                  )}
                </div>

                {/* Overlay no Hover com Likes & Comentários */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-5 text-white font-bold text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <Heart className="size-4 sm:size-5 fill-white" />
                    <span>{post.likes}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="size-4 sm:size-5 fill-white" />
                    <span>{post.comments_count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= 4B. FEED TIMELINE CONTÍNUO ================= */
        <div className="space-y-6 max-w-xl mx-auto">
          {filteredItems.map((post) => {
            const isVideo = post.content_type === "video" || post.format === "reels";
            const isCarousel = post.format === "carousel" || (post.slides && post.slides.length > 1);
            const isPending = post.status === "pending" || post.status === "approval";
            const isApproved = post.status === "approved" || post.status === "published";
            const isLiked = likedPosts[post.id];
            const isSaved = savedPosts[post.id];

            const mediaUrl = post.thumbnail_url || post.content_url || post.slides?.[0]?.thumbnail_url || post.slides?.[0]?.url;

            return (
              <article
                key={post.id}
                className="bg-white border border-[#DBDBDB] sm:rounded-2xl overflow-hidden shadow-2xs"
              >
                {/* Header do Post */}
                <div className="p-3.5 flex items-center justify-between border-b border-[#EFEFEF]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-9 rounded-full p-[2px] flex items-center justify-center ${
                        isPending
                          ? "bg-gradient-to-tr from-[#FFB800] via-[#FA7E1E] to-[#D62976]"
                          : "bg-[#DBDBDB]"
                      }`}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-white border border-white flex items-center justify-center">
                        {client.logo_url ? (
                          <img src={client.logo_url} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-[#262626]">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#262626]">{clientHandle}</span>
                        <span className="text-[10px] text-[#0095F6] font-bold">✓</span>
                      </div>
                      <span className="text-[10px] text-[#8E8E8E]">
                        {post.created_at
                          ? format(new Date(post.created_at), "dd 'de' MMMM", { locale: ptBR })
                          : "Programado"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E1306C] text-white text-[10px] font-bold">
                        Pendente
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        Aprovado
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="p-1 text-[#8E8E8E] hover:text-[#262626] cursor-pointer"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Mídia Principal em 1080x1350 (4:5) */}
                <div
                  onClick={() => setSelectedPost(post)}
                  className="relative aspect-[4/5] bg-black flex items-center justify-center cursor-pointer select-none overflow-hidden"
                >
                  {mediaUrl ? (
                    isVideo ? (
                      <video
                        src={mediaUrl}
                        controls
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="p-8 text-center text-white/70 space-y-2">
                      <Sparkles className="size-10 mx-auto text-[#FFBC45]" />
                      <p className="text-sm font-bold">{post.title}</p>
                      <p className="text-xs text-white/50">Clique para abrir e aprovar</p>
                    </div>
                  )}

                  {isCarousel && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-bold flex items-center gap-1">
                      <Layers className="size-3 text-[#FFBC45]" />
                      <span>Carrossel</span>
                    </div>
                  )}
                </div>

                {/* Barra de Ações Sociais */}
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-[#262626]">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={(e) => toggleLike(post.id, e)}
                        className={`transition-colors cursor-pointer ${
                          isLiked ? "text-[#ED4956] fill-[#ED4956]" : "hover:text-[#ED4956]"
                        }`}
                      >
                        <Heart className={`size-6 ${isLiked ? "fill-[#ED4956] text-[#ED4956]" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPost(post)}
                        className="hover:text-slate-600 cursor-pointer"
                      >
                        <MessageSquare className="size-6" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPost(post)}
                        className="hover:text-slate-600 cursor-pointer"
                      >
                        <Share2 className="size-6" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleSave(post.id, e)}
                      className={`transition-colors cursor-pointer ${
                        isSaved ? "text-[#FFBC45] fill-[#FFBC45]" : "hover:text-[#FFBC45]"
                      }`}
                    >
                      <Bookmark className={`size-6 ${isSaved ? "fill-[#FFBC45]" : ""}`} />
                    </button>
                  </div>

                  {/* Likes */}
                  <p className="text-xs font-bold text-[#262626]">
                    {post.likes} curtidas
                  </p>

                  {/* Legenda do Post */}
                  <div className="text-xs text-[#262626] leading-relaxed">
                    <span className="font-bold mr-1.5">{clientHandle}</span>
                    <span className="text-[#374151]">
                      {post.caption || post.description || post.title}
                    </span>
                  </div>

                  {/* Botão de Ação Rápida */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="flex-1 py-2 px-3 rounded-lg bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                    >
                      <Eye className="size-3.5" />
                      <span>Revisar & Aprovar</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL DE INSPEÇÃO & APROVAÇÃO DO POST                                   */}
      {/* ========================================================================= */}
      <InstagramPostModal
        slug={slug}
        post={selectedPost}
        clientName={displayName}
        clientAvatar={client.logo_url}
        clientBrandColor={clientBrandColor}
        comments={selectedPost ? approvalComments[selectedPost.id] || [] : []}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onApprove={(id) => {
          setSelectedPost((prev) => (prev ? { ...prev, status: "approved" } : null));
        }}
        onRequestChange={(id, feedback) => {
          setSelectedPost((prev) => (prev ? { ...prev, status: "rejected", feedback } : null));
        }}
      />

      {/* ========================================================================= */}
      {/* 6. VISUALIZADOR DE STORIES E REELS EM 9:16 (1080x1920 PX)                  */}
      {/* ========================================================================= */}
      <InstagramStoryReelModal
        isOpen={storyViewerOpen}
        onClose={() => setStoryViewerOpen(false)}
        items={storyViewerItems}
        initialIndex={storyViewerIndex}
        client={client}
        slug={slug}
        onApprove={(id) => {
          setStoryViewerItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, status: "approved" } : it))
          );
        }}
        onRequestChange={(id, feedback) => {
          setStoryViewerItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, status: "rejected", feedback } : it))
          );
        }}
      />
    </div>
  );
}
