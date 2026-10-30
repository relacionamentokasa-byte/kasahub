import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Users,
  Target,
  FileCheck,
  Send,
  ThumbsUp,
  MessageSquare,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { InstagramPostModal, type FeedPostItem } from "./InstagramPostModal";

interface Props {
  client: {
    name: string;
    company?: string | null;
    logo_url?: string | null;
    brand_primary?: string | null;
    portal_primary_color?: string | null;
  };
  jobs?: any[];
  approvalItems?: any[];
}

export function LibusSingleViewPortal({
  client,
  jobs = [],
  approvalItems = [],
}: Props) {
  const displayName = client.company || client.name || "Libus do Brasil";
  const primaryColor =
    client.portal_primary_color || client.brand_primary || "#FFBC45";

  // Itens de aprovação dinâmicos com fallback visual limpo
  const [items, setItems] = useState<any[]>(() => {
    if (approvalItems && approvalItems.length > 0) return approvalItems;
    return [
      {
        id: "libus-post-1",
        title: "Carrossel Técnico: Linha Capacete Genesis",
        format: "carousel",
        content_type: "image",
        status: "pending",
        caption:
          "Proteção que acompanha sua rotina industrial. Conheça as certificações da Linha Genesis e garanta segurança máxima para a sua equipe.\n\n👉 Consulte o distribuidor mais próximo de você.",
        thumbnail_url:
          "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1080&auto=format&fit=crop&q=80",
        slides: [
          {
            id: "s1",
            url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1080&auto=format&fit=crop&q=80",
          },
          {
            id: "s2",
            url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1080&auto=format&fit=crop&q=80",
          },
        ],
        due_text: "SLA: Revisão em até 2 dias úteis",
      },
      {
        id: "libus-post-2",
        title: "Vídeo Reels: Teste de Impacto & Normas ABNT",
        format: "reels",
        content_type: "video",
        status: "pending",
        caption:
          "Na segurança industrial, cada detalhe conta. Veja como testamos a durabilidade de cada componente antes de chegar à sua indústria.",
        thumbnail_url:
          "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1080&auto=format&fit=crop&q=80",
        due_text: "SLA: Revisão em até 2 dias úteis",
      },
      {
        id: "libus-post-3",
        title: "Card Institucional: Co-Marketing com Distribuidores",
        format: "single",
        content_type: "image",
        status: "approved",
        caption:
          "Parceria que gera confiança. A Libus e sua rede de distribuidores levam a proteção certa para todo o território nacional.",
        thumbnail_url:
          "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=1080&auto=format&fit=crop&q=80",
        due_text: "Aprovado pela coordenação",
      },
    ];
  });

  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [feedbackInput, setFeedbackInput] = useState<Record<string, string>>({});

  const handleApprove = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: "approved" } : it))
    );
    toast.success("Material aprovado com sucesso!");
    if (selectedPost?.id === id) setSelectedPost(null);
  };

  const handleRequestChange = (id: string) => {
    const text = feedbackInput[id]?.trim();
    if (!text) {
      toast.error("Por favor, digite o ajuste desejado antes de enviar.");
      return;
    }
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, status: "adjust_requested", feedback: text } : it
      )
    );
    setFeedbackInput((prev) => ({ ...prev, [id]: "" }));
    toast.success("Solicitação de ajuste enviada para a equipe da Kasa!");
    if (selectedPost?.id === id) setSelectedPost(null);
  };

  const pendingCount = items.filter((it) => it.status === "pending").length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans pb-20 pt-2 px-2 sm:px-4">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO EXECUTIVO E STATUS LIMPO                                     */}
      {/* ========================================================================= */}
      <header className="bg-[#121214] text-white rounded-3xl p-6 md:p-8 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#FFBC45]">
                Piloto 6 Meses
              </span>
              <span className="text-white/30">•</span>
              <span className="text-xs text-white/60">
                Trade Marketing & Relacionamento
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {displayName}
            </h1>
            <p className="text-xs md:text-sm text-white/60 max-w-xl">
              Painel de acompanhamento de entregas, aprovação rápida de peças e
              status das ações com a rede de distribuidores.
            </p>
          </div>

          {/* Cards Rápidos de Status */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-[#18181B] border border-white/10 rounded-2xl p-4 text-center min-w-[130px]">
              <span className="text-[10px] font-mono text-white/50 uppercase block font-bold">
                Fase Atual
              </span>
              <span className="text-lg font-black text-[#FFBC45] mt-0.5 block">
                Mês 1
              </span>
              <span className="text-[10px] text-white/40">Linha de Base</span>
            </div>

            <div className="bg-[#18181B] border border-white/10 rounded-2xl p-4 text-center min-w-[130px]">
              <span className="text-[10px] font-mono text-white/50 uppercase block font-bold">
                Ações Realizadas
              </span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                2 de 15
              </span>
              <span className="text-[10px] text-white/40">Distribuidores</span>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. ÁREA DE APROVAÇÃO RÁPIDA (O FEED DIRETO DE ENTREGAS)                   */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="size-5 text-[#FFBC45]" />
              Materiais para Aprovação
            </h2>
            <p className="text-xs text-slate-500">
              Revise e valide com 1 clique. As alterações solicitadas vão direto
              para a produção da Kasa.
            </p>
          </div>

          {pendingCount > 0 ? (
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold px-3 py-1">
              {pendingCount} pendente(s)
            </Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold px-3 py-1">
              Tudo aprovado
            </Badge>
          )}
        </div>

        {/* Grade de Cards Visuais Diretos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.map((item) => {
            const isApproved = item.status === "approved";
            const isAdjustRequested = item.status === "adjust_requested";

            return (
              <Card
                key={item.id}
                className={`overflow-hidden rounded-2xl border transition-all flex flex-col justify-between ${
                  isApproved
                    ? "border-emerald-200 bg-emerald-50/20"
                    : isAdjustRequested
                    ? "border-amber-200 bg-amber-50/20"
                    : "border-slate-200 bg-white hover:shadow-md"
                }`}
              >
                <div>
                  {/* Imagem / Capa */}
                  <div
                    onClick={() => setSelectedPost(item)}
                    className="relative aspect-square w-full bg-slate-900 cursor-pointer overflow-hidden group"
                  >
                    <img
                      src={item.thumbnail_url || item.content_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Badge de Status sobre a imagem */}
                    <div className="absolute top-3 left-3">
                      {isApproved ? (
                        <span className="bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Aprovado
                        </span>
                      ) : isAdjustRequested ? (
                        <span className="bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                          <Clock className="size-3" /> Ajuste Solicitado
                        </span>
                      ) : (
                        <span className="bg-[#121214]/90 backdrop-blur-md text-[#FFBC45] font-bold text-[10px] px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                          <Clock className="size-3" /> Aguardando Você
                        </span>
                      )}
                    </div>

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                      <Eye className="size-4" /> Toque para expandir
                    </div>
                  </div>

                  {/* Informações do Post */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {item.caption || "Sem legenda."}
                    </p>
                  </div>
                </div>

                {/* Ações Diretas */}
                <div className="p-4 pt-0 space-y-2 border-t border-slate-100 mt-2">
                  {isApproved ? (
                    <div className="text-center py-2 text-xs font-bold text-emerald-700 bg-emerald-100/60 rounded-xl">
                      Pronto para publicação
                    </div>
                  ) : isAdjustRequested ? (
                    <div className="text-center py-2 text-xs font-bold text-amber-800 bg-amber-100/60 rounded-xl">
                      Kasa revisando o ajuste
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(item.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-sm"
                        >
                          <ThumbsUp className="size-3.5 mr-1.5" /> Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedPost(item)}
                          className="flex-1 border-slate-300 text-slate-700 hover:text-black font-bold text-xs h-9 rounded-xl"
                        >
                          <MessageSquare className="size-3.5 mr-1.5" /> Pedir
                          Ajuste
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PAINEL DO MÊS (CRONOGRAMA E ENTREGAS ESSENCIAIS)                       */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
              <Calendar className="size-5 text-[#FFBC45]" />
              Cronograma do Mês 1 & Prazos
            </h2>
            <p className="text-xs text-slate-500">
              O que a Kasa está realizando no período e as datas combinadas.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-bold border-slate-300">
            SLA de Resposta: até 1 dia útil
          </Badge>
        </div>

        {/* Linha das entregas ativas do mês */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Entregas em Andamento
            </span>

            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs text-slate-800">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Mapeamento digital:</strong> auditoria das redes e
                  e-commerces dos distribuidores.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-800">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Produção de criativos técnicos:</strong> EPIs com foco
                  na Linha Capacete Genesis.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-800">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Linha de base:</strong> registro inicial para comparar
                  as metas de crescimento.
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Datas Importantes do Mês
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60">
                <span className="text-slate-600">Proposição de Mídia do Mês Seguinte</span>
                <span className="font-bold text-slate-900">Até dia 20</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60">
                <span className="text-slate-600">Aprovação do Calendário Editorial</span>
                <span className="font-bold text-slate-900">Até dia 25</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60">
                <span className="text-slate-600">Revisão Técnica pela Libus</span>
                <span className="font-bold text-emerald-600">Até 2 dias úteis</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal de Detalhe e Feedback caso queira ver ampliado */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="aspect-square bg-black relative">
              <img
                src={selectedPost.thumbnail_url || selectedPost.content_url}
                alt={selectedPost.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {selectedPost.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed max-h-28 overflow-y-auto">
                  {selectedPost.caption}
                </p>
              </div>

              {selectedPost.status !== "approved" && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Precisa de algum ajuste neste material?
                  </label>
                  <Textarea
                    placeholder="Descreva o que gostaria de mudar (ex: ajustar o texto da legenda, trocar imagem)..."
                    value={feedbackInput[selectedPost.id] || ""}
                    onChange={(e) =>
                      setFeedbackInput((prev) => ({
                        ...prev,
                        [selectedPost.id]: e.target.value,
                      }))
                    }
                    className="text-xs min-h-[70px] resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPost(null)}
                  className="text-xs font-bold text-slate-500"
                >
                  Fechar
                </Button>

                {selectedPost.status !== "approved" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRequestChange(selectedPost.id)}
                      className="text-xs font-bold text-amber-700 border-amber-300"
                    >
                      Enviar Ajuste
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(selectedPost.id)}
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Aprovar Agora
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
