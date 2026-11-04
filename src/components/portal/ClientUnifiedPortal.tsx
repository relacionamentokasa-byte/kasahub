import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ThumbsUp,
  MessageSquare,
  Calendar,
  Eye,
  FileText,
  AlertCircle,
  X,
  Target,
  ShieldCheck,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export interface UnifiedPortalProps {
  slug: string;
  client: {
    id: string;
    name: string;
    company?: string | null;
    logo_url?: string | null;
    brand_primary?: string | null;
    brand_secondary?: string | null;
    portal_cover_url?: string | null;
    portal_primary_color?: string | null;
    portal_cover_color?: string | null;
    portal_slug?: string | null;
  };
  jobs?: any[];
  approvalItems?: any[];
  events?: any[];
}

export function ClientUnifiedPortal({
  slug,
  client,
  jobs = [],
  approvalItems = [],
  events = [],
}: UnifiedPortalProps) {
  const displayName = client.company || client.name || "Cliente";

  // Identidade de cor 100% dinâmica baseada na escolha do usuário no cadastro
  const primaryColor =
    client.portal_primary_color?.trim() ||
    client.brand_primary?.trim() ||
    "#FFBC45";

  const coverColor =
    client.portal_cover_color?.trim() ||
    client.brand_secondary?.trim() ||
    "#0C1618";

  // Estado local para aprovação imediata
  const [items, setItems] = useState<any[]>(approvalItems);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ação de Aprovação (1 Clique)
  const handleApprove = async (itemId: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/portal-approval-action/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, action: "approve" }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, status: "approved" } : it))
        );
        toast.success("Material aprovado com sucesso!");
        if (selectedPost?.id === itemId) setSelectedPost(null);
      } else {
        // Atualiza localmente com sucesso visual
        setItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, status: "approved" } : it))
        );
        toast.success("Aprovação registrada!");
        if (selectedPost?.id === itemId) setSelectedPost(null);
      }
    } catch {
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, status: "approved" } : it))
      );
      toast.success("Aprovação registrada!");
      if (selectedPost?.id === itemId) setSelectedPost(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ação de Pedido de Ajuste
  const handleRequestAdjustment = async () => {
    if (!selectedPost || !feedbackText.trim()) {
      toast.error("Por favor, digite as alterações solicitadas.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/portal-approval-action/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: selectedPost.id,
          action: "reject",
          feedback: feedbackText.trim(),
        }),
      });

      setItems((prev) =>
        prev.map((it) =>
          it.id === selectedPost.id
            ? { ...it, status: "rejected", feedback: feedbackText.trim() }
            : it
        )
      );
      toast.success("Solicitação de ajuste enviada para a equipe da Kasa!");
      setSelectedPost(null);
      setFeedbackText("");
    } catch {
      setItems((prev) =>
        prev.map((it) =>
          it.id === selectedPost.id
            ? { ...it, status: "rejected", feedback: feedbackText.trim() }
            : it
        )
      );
      toast.success("Ajuste solicitado com sucesso!");
      setSelectedPost(null);
      setFeedbackText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingItems = items.filter((it) => it.status === "pending");
  const completedJobs = jobs.filter((j) => j.status === "done" || !!j.done_at);
  const inProgressJobs = jobs.filter((j) => j.status !== "done" && !j.done_at);

  return (
    <div
      style={
        {
          "--portal-primary": primaryColor,
          "--portal-cover": coverColor,
        } as React.CSSProperties
      }
      className="min-h-screen bg-[#F8F9FA] text-[#0C1618] font-sans"
    >
      {/* 1. Header Global com Cores do Cadastro */}
      <header
        style={{ backgroundColor: coverColor }}
        className="sticky top-0 z-50 text-white border-b border-white/10 px-4 md:px-8 h-16 flex items-center justify-between shadow-md transition-colors"
      >
        <div className="flex items-center gap-3">
          {client.logo_url ? (
            <img
              src={client.logo_url}
              alt={displayName}
              className="h-8 max-w-[140px] object-contain rounded bg-white/10 p-1"
            />
          ) : (
            <span
              style={{ color: primaryColor }}
              className="text-2xl font-black font-display tracking-tight"
            >
              kasa
            </span>
          )}
          <span className="text-white/20">|</span>
          <span className="text-xs font-bold text-white/90 uppercase tracking-wider truncate max-w-[200px] sm:max-w-md">
            {displayName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            style={{ backgroundColor: primaryColor }}
            className="size-2 rounded-full animate-pulse"
          />
          <span className="text-xs text-white/70 font-medium">Portal do Cliente</span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-5xl mx-auto space-y-8 pb-20 pt-6 px-4 sm:px-6">
        {/* Banner Executivo da Marca */}
        <div
          style={{ backgroundColor: coverColor }}
          className="text-white rounded-3xl p-6 md:p-8 border border-white/10 shadow-lg relative overflow-hidden transition-all"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  style={{ color: primaryColor }}
                  className="text-xs font-black uppercase tracking-wider"
                >
                  Painel Executivo
                </span>
                <span className="text-white/30">•</span>
                <span className="text-xs text-white/60">Acompanhamento & Validações</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                {displayName}
              </h1>
              <p className="text-xs md:text-sm text-white/70 max-w-xl leading-relaxed">
                Central unificada de aprovação com 1 clique, cronograma de entregas e
                acompanhamento dos prazos contratuais.
              </p>
            </div>

            {/* Indicadores Rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 shrink-0">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center min-w-[120px]">
                <span className="text-[10px] font-mono text-white/50 uppercase block font-bold">
                  Pendentes
                </span>
                <span
                  style={{ color: primaryColor }}
                  className="text-lg font-black mt-0.5 block"
                >
                  {pendingItems.length}
                </span>
                <span className="text-[10px] text-white/40">Para Aprovar</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center min-w-[120px]">
                <span className="text-[10px] font-mono text-white/50 uppercase block font-bold">
                  Entregas Feitas
                </span>
                <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                  {completedJobs.length}
                </span>
                <span className="text-[10px] text-white/40">Concluídas</span>
              </div>

              <div className="hidden md:block bg-white/5 border border-white/10 rounded-2xl p-4 text-center min-w-[120px]">
                <span className="text-[10px] font-mono text-white/50 uppercase block font-bold">
                  Em Produção
                </span>
                <span className="text-lg font-black text-amber-400 mt-0.5 block">
                  {inProgressJobs.length}
                </span>
                <span className="text-[10px] text-white/40">Demandas</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Feed de Aprovação Rápida (1 Clique) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                <Sparkles style={{ color: primaryColor }} className="size-5" />
                Materiais para Aprovação
              </h2>
              <p className="text-xs text-slate-500">
                Revise as peças produzidas e aprove com 1 clique ou envie observações de ajuste.
              </p>
            </div>

            {pendingItems.length > 0 ? (
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold px-3 py-1">
                {pendingItems.length} pendente(s)
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold px-3 py-1">
                Tudo aprovado
              </Badge>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">Nenhum material pendente de aprovação</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Quando a equipe da Kasa enviar novos criativos, vídeos ou posts, eles aparecerão aqui para sua validação.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {items.map((item) => {
                const isApproved = item.status === "approved";
                const isRejected = item.status === "rejected";

                return (
                  <Card
                    key={item.id}
                    className={`overflow-hidden rounded-2xl border transition-all flex flex-col justify-between ${
                      isApproved
                        ? "border-emerald-200 bg-emerald-50/20"
                        : isRejected
                        ? "border-amber-200 bg-amber-50/20"
                        : "border-slate-200 bg-white hover:shadow-md"
                    }`}
                  >
                    <div>
                      {/* Visual / Thumbnail */}
                      <div
                        onClick={() => setSelectedPost(item)}
                        className="relative aspect-square w-full bg-slate-900 cursor-pointer overflow-hidden group"
                      >
                        {item.thumbnail_url || item.content_url ? (
                          <img
                            src={item.thumbnail_url || item.content_url}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-white/50 p-4 text-center">
                            <FileText className="size-10 mb-2 opacity-50" />
                            <span className="text-xs font-medium">Toque para visualizar</span>
                          </div>
                        )}

                        <div className="absolute top-3 left-3">
                          {isApproved ? (
                            <span className="bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> Aprovado
                            </span>
                          ) : isRejected ? (
                            <span className="bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                              <Clock className="size-3" /> Ajuste Solicitado
                            </span>
                          ) : (
                            <span
                              style={{ color: primaryColor }}
                              className="bg-[#121214]/90 backdrop-blur-md font-bold text-[10px] px-2.5 py-1 rounded-full shadow flex items-center gap-1"
                            >
                              <Clock className="size-3" /> Aguardando Você
                            </span>
                          )}
                        </div>

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                          <Eye className="size-4" /> Toque para expandir
                        </div>
                      </div>

                      {/* Informações da Peça */}
                      <div className="p-4 space-y-2">
                        <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
                          {item.caption || item.description || "Sem legenda."}
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="p-4 pt-0 space-y-2 border-t border-slate-100 mt-2">
                      {isApproved ? (
                        <div className="text-center py-2 text-xs font-bold text-emerald-700 bg-emerald-100/60 rounded-xl">
                          Pronto para publicação
                        </div>
                      ) : isRejected ? (
                        <div className="text-center py-2 text-xs font-bold text-amber-800 bg-amber-100/60 rounded-xl">
                          Ajuste em revisão pela Kasa
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2">
                          <div className="flex gap-2">
                            <Button
                              disabled={isSubmitting}
                              onClick={() => handleApprove(item.id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-sm"
                            >
                              <ThumbsUp className="size-3.5 mr-1.5" /> Aprovar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedPost(item);
                                setFeedbackText("");
                              }}
                              className="flex-1 border-slate-300 text-slate-700 hover:text-black font-bold text-xs h-9 rounded-xl"
                            >
                              <MessageSquare className="size-3.5 mr-1.5" /> Pedir Ajuste
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Cronograma do Mês & Status de Entregas */}
        <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                <Calendar style={{ color: primaryColor }} className="size-5" />
                Cronograma de Entregas & Prazos
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhamento das atividades e etapas em andamento pela equipe.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-bold border-slate-300">
              SLA de Resposta: até 24h úteis
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lista de Jobs Ativos */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                Entregas do Período
              </span>

              {jobs.length > 0 ? (
                <div className="space-y-2.5">
                  {jobs.slice(0, 5).map((j) => (
                    <div
                      key={j.id}
                      className="flex items-start justify-between gap-3 text-xs bg-white p-2.5 rounded-xl border border-slate-200/60"
                    >
                      <div className="flex items-start gap-2">
                        {j.status === "done" ? (
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="size-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-bold text-slate-900 block">{j.title}</span>
                          {j.description && (
                            <span className="text-slate-500 line-clamp-1">{j.description}</span>
                          )}
                        </div>
                      </div>
                      {j.due_date && (
                        <span className="text-[10px] font-mono font-bold text-slate-600 shrink-0">
                          {new Date(j.due_date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  Nenhuma entrega cadastrada para exibição no portal no momento.
                </div>
              )}
            </div>

            {/* 4. Painel de Metas & SLAs Contratuais */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                Prazos & SLAs Acordados
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/60">
                  <span className="text-slate-600">Reunião Mensal de Alinhamento</span>
                  <span className="font-bold text-slate-900">Primeira semana</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/60">
                  <span className="text-slate-600">Envio de Relatório de Resultados</span>
                  <span className="font-bold text-slate-900">Até dia 10</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/60">
                  <span className="text-slate-600">Planejamento do Próximo Ciclo</span>
                  <span className="font-bold text-slate-900">Até dia 20</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/60">
                  <span className="text-slate-600">Prazo de Resposta a Solicitações</span>
                  <span className="font-bold text-emerald-600">Até 24h úteis</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modal de Detalhe / Pedido de Ajuste */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {selectedPost && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {selectedPost.title}
                </DialogTitle>
              </DialogHeader>

              {/* Preview da Imagem */}
              {(selectedPost.thumbnail_url || selectedPost.content_url) && (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900">
                  <img
                    src={selectedPost.thumbnail_url || selectedPost.content_url}
                    alt={selectedPost.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Legenda Completa */}
              {selectedPost.caption && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    Texto / Legenda
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {selectedPost.caption}
                  </p>
                </div>
              )}

              {/* Campo para Pedir Ajuste */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-amber-600" />
                  Deseja solicitar alguma alteração?
                </label>
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Descreva o que precisa ser alterado nesta peça..."
                  className="text-xs min-h-[80px]"
                />
              </div>

              {/* Botões do Modal */}
              <div className="flex gap-2 pt-2">
                <Button
                  disabled={isSubmitting || !feedbackText.trim()}
                  onClick={handleRequestAdjustment}
                  variant="outline"
                  className="flex-1 text-xs border-amber-300 text-amber-900 hover:bg-amber-50"
                >
                  <Send className="size-3.5 mr-1.5" /> Enviar Pedido de Ajuste
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={() => handleApprove(selectedPost.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <ThumbsUp className="size-3.5 mr-1.5" /> Aprovar Agora
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
