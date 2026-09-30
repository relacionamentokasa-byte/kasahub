import React, { useState, useRef, useEffect } from "react";
import {
  Video,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Download,
  Share2,
  Plus,
  Send,
  CornerDownRight,
  Check,
  ChevronRight,
  Film,
  Volume2,
  VolumeX,
  Maximize,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

export interface VideoVersion {
  id: string;
  versionLabel: "V1" | "V2" | "V3" | "FINAL";
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  durationSeconds: number;
  uploadedAt: string;
  status: "pending" | "approved" | "adjust_requested";
  comments: TimestampComment[];
}

export interface TimestampComment {
  id: string;
  timestamp: number; // segundos
  authorName: string;
  authorType: "client" | "team";
  text: string;
  createdAt: string;
  resolved?: boolean;
}

interface KasaVideoDeliverablesViewProps {
  clientBrandColor?: string;
  clientName?: string;
}

const SAMPLE_VIDEOS: VideoVersion[] = [
  {
    id: "vid-1",
    versionLabel: "V2",
    title: "Vídeo Institucional - Soluções & Propósito 2026",
    description: "Vídeo manifesto de 60s desenvolvido para veiculação no site oficial e abertura de eventos.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1080&auto=format&fit=crop&q=80",
    durationSeconds: 15,
    uploadedAt: "2026-09-28T14:30:00Z",
    status: "pending",
    comments: [
      {
        id: "c-1",
        timestamp: 4,
        authorName: "Cliente (Você)",
        authorType: "client",
        text: "A transição nesta cena ficou muito rápida, podemos segurar 1 segundo a mais no produto?",
        createdAt: "2026-09-29T10:15:00Z",
        resolved: false,
      },
      {
        id: "c-2",
        timestamp: 10,
        authorName: "Arthur (Editor Kasa)",
        authorType: "team",
        text: "Trilha sonora ajustada e equalizada no pico da fala!",
        createdAt: "2026-09-29T11:00:00Z",
        resolved: true,
      },
    ],
  },
  {
    id: "vid-2",
    versionLabel: "FINAL",
    title: "Depoimento de Caso de Sucesso - Linha Industrial",
    description: "Cortes dinâmicos de 45s com legenda animada para LinkedIn e YouTube Shorts.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=1080&auto=format&fit=crop&q=80",
    durationSeconds: 15,
    uploadedAt: "2026-09-20T16:00:00Z",
    status: "approved",
    comments: [],
  },
];

export function KasaVideoDeliverablesView({
  clientBrandColor = "#FFBC45",
  clientName = "Cliente",
}: KasaVideoDeliverablesViewProps) {
  const [videos, setVideos] = useState<VideoVersion[]>(SAMPLE_VIDEOS);
  const [selectedVideo, setSelectedVideo] = useState<VideoVersion>(SAMPLE_VIDEOS[0]);
  const [selectedVersion, setSelectedVersion] = useState<"V1" | "V2" | "FINAL">("V2");

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(15);
  const [isMuted, setIsMuted] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [filterResolved, setFilterResolved] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 15);
    }
  };

  const jumpToTime = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      if (!isPlaying) {
        videoRef.current.pause();
      }
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const newComment: TimestampComment = {
      id: `c-${Date.now()}`,
      timestamp: Math.floor(currentTime),
      authorName: "Você (Cliente)",
      authorType: "client",
      text: commentInput.trim(),
      createdAt: new Date().toISOString(),
      resolved: false,
    };

    const updated = {
      ...selectedVideo,
      comments: [...selectedVideo.comments, newComment],
      status: "adjust_requested" as const,
    };

    setSelectedVideo(updated);
    setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    setCommentInput("");
    toast.success(`Ajuste marcado no tempo ${formatSeconds(newComment.timestamp)}!`);
  };

  const handleApproveVideo = () => {
    const updated = { ...selectedVideo, status: "approved" as const };
    setSelectedVideo(updated);
    setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    toast.success("Vídeo aprovado com sucesso! A equipe iniciará a exportação final.");
  };

  const isApproved = selectedVideo.status === "approved";

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-5">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296] flex items-center gap-1.5">
            <Film className="size-3.5 text-[#FFBC45]" />
            AUDIOVISUAL & ENTREGAS · PLAYER COM TIMESTAMPS ESTILO FRAME.IO
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-1">
            Vídeos & Produção Audiovisual
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Revise versões de corte, marque comentários exatos no frame do vídeo e aprove a edição final.
          </p>
        </div>

        {/* Status de Versão e Aprovação */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isApproved ? (
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md">
              <CheckCircle2 className="size-3.5" />
              <span>Vídeo Aprovado</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleApproveVideo}
              style={{ backgroundColor: clientBrandColor }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#0C1618] flex items-center gap-2 shadow-md hover:opacity-90 transition active:scale-95 cursor-pointer"
            >
              <Check className="size-3.5" />
              <span>Aprovar Edição Final</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Seleção de Vídeo & Versões */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#121214] text-white flex items-center justify-center font-bold text-sm">
            <Video className="size-5 text-[#FFBC45]" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-[#0C1618]">
              {selectedVideo.title}
            </h3>
            <p className="text-xs text-[#6A787B]">
              Duração: {formatSeconds(duration)} · Enviado em {new Date(selectedVideo.uploadedAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        {/* Seletor de Versão (V1, V2, FINAL) */}
        <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E9E4DC]">
          <span className="text-[10px] font-mono font-bold text-[#869296] px-2">Versão:</span>
          {(["V1", "V2", "FINAL"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSelectedVersion(v)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedVersion === v
                  ? "bg-[#121214] text-white shadow-xs"
                  : "text-[#869296] hover:text-[#0C1618]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Player de Vídeo Interativo + Painel Lateral de Timestamps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Lado Esquerdo: Player de Vídeo (2 Colunas) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative aspect-[16/9] bg-[#09090B] rounded-3xl overflow-hidden shadow-2xl border border-[#121214] group">
            <video
              ref={videoRef}
              src={selectedVideo.videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
              muted={isMuted}
              playsInline
              className="w-full h-full object-contain cursor-pointer"
            />

            {/* Marcadores de Comentários na Linha do Tempo */}
            <div className="absolute bottom-16 inset-x-4 h-1.5 bg-white/20 rounded-full overflow-visible pointer-events-none">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(currentTime / (duration || 1)) * 100}%`,
                  backgroundColor: clientBrandColor,
                }}
              />
              {/* Pins de Comentários */}
              {selectedVideo.comments.map((cm) => (
                <div
                  key={cm.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    jumpToTime(cm.timestamp);
                  }}
                  title={`${formatSeconds(cm.timestamp)} - ${cm.authorName}: ${cm.text}`}
                  className="absolute -top-1.5 size-4 rounded-full bg-[#FFBC45] border-2 border-[#121214] cursor-pointer hover:scale-125 transition pointer-events-auto"
                  style={{
                    left: `${(cm.timestamp / (duration || 1)) * 100}%`,
                  }}
                />
              ))}
            </div>

            {/* Barra de Controles Inferiores */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
                >
                  {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-white" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
                >
                  {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>

                <span className="font-mono text-xs font-bold">
                  {formatSeconds(currentTime)} / {formatSeconds(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#A1A1AA]">
                  Clique no frame para pausar e comentar
                </span>
              </div>
            </div>
          </div>

          {/* Campo para Inserir Comentário no Segundo Exato (Estilo Frame.io) */}
          <form
            onSubmit={handleAddComment}
            className="p-3.5 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs flex items-center gap-3"
          >
            <div className="px-2.5 py-1.5 rounded-xl bg-[#121214] text-white font-mono text-xs font-bold shrink-0 flex items-center gap-1.5">
              <Clock className="size-3 text-[#FFBC45]" />
              <span>{formatSeconds(currentTime)}</span>
            </div>

            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={`Escreva um ajuste para o frame em ${formatSeconds(currentTime)}...`}
              className="flex-1 text-xs focus:outline-none bg-transparent font-sans"
            />

            <button
              type="submit"
              disabled={!commentInput.trim()}
              style={{ backgroundColor: clientBrandColor }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#0C1618] flex items-center gap-1.5 shadow-xs hover:opacity-90 transition disabled:opacity-40 cursor-pointer"
            >
              <Send className="size-3" />
              <span className="hidden sm:inline">Marcar Ajuste</span>
            </button>
          </form>
        </div>

        {/* Lado Direito: Histórico de Ajustes e Timestamps (1 Coluna) */}
        <div className="p-5 rounded-3xl bg-white border border-[#E9E4DC] shadow-xs space-y-4 max-h-[560px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E9E4DC] pb-3">
              <h4 className="font-display text-sm font-bold text-[#0C1618] flex items-center gap-2">
                <MessageSquare className="size-4 text-[#FFBC45]" />
                Comentários & Ajustes ({selectedVideo.comments.length})
              </h4>
            </div>

            {/* Lista de Comentários com Timestamps Clicáveis */}
            <div className="mt-3 space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
              {selectedVideo.comments.length === 0 ? (
                <div className="p-8 text-center text-[#869296] text-xs">
                  Nenhum ajuste marcado nesta versão. O corte está pronto para aprovação!
                </div>
              ) : (
                selectedVideo.comments.map((cm) => (
                  <div
                    key={cm.id}
                    onClick={() => jumpToTime(cm.timestamp)}
                    className="p-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F5F2EC] border border-[#E9E4DC] transition cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-[#121214] text-white font-mono text-[10px] font-bold">
                          {formatSeconds(cm.timestamp)}
                        </span>
                        <span className="text-[11px] font-bold text-[#0C1618]">
                          {cm.authorName}
                        </span>
                      </div>
                      {cm.resolved ? (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <Check className="size-3" /> Feito
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-bold">Pendente</span>
                      )}
                    </div>

                    <p className="text-xs text-[#6A787B] leading-relaxed">
                      {cm.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E9E4DC]">
            <a
              href={selectedVideo.videoUrl}
              download
              className="w-full py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F0ECE4] border border-[#E9E4DC] text-xs font-bold text-[#0C1618] flex items-center justify-center gap-1.5 transition"
            >
              <Download className="size-3.5 text-[#FFBC45]" />
              <span>Baixar Arquivo MP4 em Alta Resolução</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
