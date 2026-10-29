import React, { useState } from "react";
import {
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Users,
  Building2,
  FileCheck,
  Layers,
  ChevronRight,
  BarChart3,
  Flame,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Props {
  clientName?: string;
  brandColor?: string;
  jobs?: any[];
  slug?: string;
}

export function LibusPilotTradeView({
  clientName = "Libus do Brasil",
  brandColor = "#FFBC45",
  jobs = [],
  slug,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number>(1);

  // Metas do Bloco 06 (15 Ações com Distribuidores)
  const DISTRIBUTOR_ACTIONS_TIMELINE = [
    {
      month: 1,
      targetMonth: 2,
      targetAccum: 2,
      title: "Mês 1 — Levantamento da Linha de Base",
      description: "Onboarding, mapeamento de distribuidores prioritários e diagnóstico de ativos digitais.",
      status: "in_progress" as const,
      deliverables: [
        "Auditoria dos canais digitais dos distribuidores parceiros",
        "Diagnóstico de catálogos e fichas técnicas no e-commerce",
        "Estruturação da linha de base de engajamento e métricas",
        "Disponibilização do 1º Kit Mensal de Conteúdo (até dia 05)",
      ],
    },
    {
      month: 2,
      targetMonth: 2,
      targetAccum: 4,
      title: "Mês 2 — Primeiras Ativações e Collabs",
      description: "Início das ações de co-marketing e primeiras publicações conjuntas.",
      status: "planned" as const,
      deliverables: [
        "2 Collabs publicadas em redes de distribuidores homologados",
        "Apresentação do 1º Caso de Sucesso / Depoimento Técnico",
        "Envio da proposta de mídia do Mês 3 (até dia 20)",
        "Validação de 30% dos parceiros com catálogo completo",
      ],
    },
    {
      month: 3,
      targetMonth: 2,
      targetAccum: 6,
      title: "Mês 3 — Marco Trimestral de Validação",
      description: "Fechamento da meta do 1º trimestre (6 ações acumuladas) e revisão da estratégia.",
      status: "planned" as const,
      deliverables: [
        "6 ações acumuladas com distribuidores atendidas",
        "50% dos distribuidores prioritários com posts ativos",
        "Meta de +20% em engajamento nas redes sociais da Libus",
        "Pesquisa de satisfação da coordenação comercial (Meta: ≥ 8.0)",
      ],
    },
    {
      month: 4,
      targetMonth: 3,
      targetAccum: 9,
      title: "Mês 4 — Expansão e Tração",
      description: "Aceleração do ritmo para 3 ativações por mês.",
      status: "planned" as const,
      deliverables: [
        "3 Collabs ativas em distribuidores estratégicos",
        "Captação técnica de novos EPIs em campo",
        "Aprovação do calendário editorial (até dia 25)",
      ],
    },
    {
      month: 5,
      targetMonth: 3,
      targetAccum: 12,
      title: "Mês 5 — Consolidação de Catálogo",
      description: "Ampliação da presença em e-commerces B2B e campanhas de alcance.",
      status: "planned" as const,
      deliverables: [
        "3 Ativações adicionais (12 acumuladas)",
        "Distribuição intensificada do kit técnico",
        "Preparação de cobertura para eventos/feiras",
      ],
    },
    {
      month: 6,
      targetMonth: 3,
      targetAccum: 15,
      title: "Mês 6 — Entrega Final do Piloto",
      description: "Consolidação das 15 ações completas e prestação de contas executiva.",
      status: "planned" as const,
      deliverables: [
        "15 ações totais de relacionamento e ativação realizadas",
        "80% dos parceiros prioritários ativos nos canais digitais",
        "+40% de crescimento em interações totais",
        "Dossiê final de retorno de marca e impacto de trade",
      ],
    },
  ];

  // 10 SLAs Oficiais da Proposta
  const SLA_RULES = [
    {
      activity: "Envio do Kit de Conteúdo aos Distribuidores",
      sla: "Até o dia 5 de cada mês",
      target: "Mensal",
      status: "Em dia (Próximo: Dia 05)",
      category: "Trade",
    },
    {
      activity: "Proposição do Plano de Mídia do Mês Seguinte",
      sla: "Até o dia 20 de cada mês",
      target: "Mensal",
      status: "No prazo",
      category: "Mídia & Tráfego",
    },
    {
      activity: "Aprovação do Calendário Editorial",
      sla: "Até o dia 25 do mês anterior",
      target: "Mensal",
      status: "No prazo",
      category: "Social Media",
    },
    {
      activity: "Caso de Sucesso ou Depoimento Técnico",
      sla: "1 por mês",
      target: "Acumulado: 6",
      status: "Mês 1 em produção",
      category: "Conteúdo Técnico",
    },
    {
      activity: "Resposta a Solicitações da Libus",
      sla: "Até 1 dia útil",
      target: "100%",
      status: "SLA cumprido",
      category: "Atendimento",
    },
    {
      activity: "Adaptação de Peça a partir de Template",
      sla: "Até 2 dias úteis",
      target: "Ágil",
      status: "SLA cumprido",
      category: "Design",
    },
    {
      activity: "Entrega de Vídeo ou Reel Editado",
      sla: "Até 5 dias úteis pós-captação",
      target: "Produção",
      status: "No prazo",
      category: "Audiovisual",
    },
    {
      activity: "Conteúdo de Evento (Feiras / FISP)",
      sla: "Publicação em até 48 horas",
      target: "Eventos",
      status: "Standby",
      category: "Cobertura",
    },
    {
      activity: "Rodadas de Ajustes por Peça",
      sla: "Até 2 por peça",
      target: "Alinhado",
      status: "Sem retrabalho",
      category: "Revisão",
    },
    {
      activity: "Revisão Técnica pela Libus",
      sla: "Até 2 dias úteis",
      target: "Validação",
      status: "Fluxo ativo",
      category: "Aprovação",
    },
  ];

  // Metas Mês 3 vs Mês 6 (Slide 14)
  const KPIS = [
    {
      name: "Distribuidores Prioritários Ativos nos Canais Digitais",
      measure: "Evidências e registros no relatório mensal",
      m3: "50%",
      m6: "80%",
      current: "Mapeando",
      progress: 20,
    },
    {
      name: "Publicações de Distribuidores com Conteúdo Libus",
      measure: "Contagem de publicações identificadas",
      m3: "20 / mês",
      m6: "40 / mês",
      current: "Linha de Base",
      progress: 15,
    },
    {
      name: "Distribuidores com Catálogo Libus no E-commerce",
      measure: "Verificação mensal de estoque e páginas",
      m3: "30%",
      m6: "70%",
      current: "Auditoria",
      progress: 25,
    },
    {
      name: "Casos de Sucesso e Depoimentos Publicados",
      measure: "Total acumulado no projeto",
      m3: "3 acumulados",
      m6: "6 acumulados",
      current: "1 em roteiro",
      progress: 16,
    },
    {
      name: "Collabs e Ações de Co-Marketing Realizadas",
      measure: "Total acumulado de ações conjuntas",
      m3: "6 acumuladas",
      m6: "15 acumuladas",
      current: "Mês 1 (Base)",
      progress: 10,
    },
    {
      name: "Crescimento de Engajamento nas Redes Sociais",
      measure: "Interações em relação ao alcance vs Linha de Base",
      m3: "+20%",
      m6: "+40%",
      current: "Medindo Base",
      progress: 15,
    },
    {
      name: "Crescimento de Seguidores (LinkedIn & Instagram)",
      measure: "Crescimento acumulado em relação à linha de base",
      m3: "+5%",
      m6: "+10%",
      current: "Ativo",
      progress: 30,
    },
    {
      name: "Cumprimento de Calendário e Prazos de SLA",
      measure: "Entregas realizadas no prazo acordado",
      m3: "85%",
      m6: "95%",
      current: "100%",
      progress: 100,
    },
    {
      name: "Satisfação da Coordenação de Marketing e Comercial",
      measure: "Pesquisa de avaliação de 1 a 10",
      m3: "Nota ≥ 8.0",
      m6: "Nota ≥ 8.0",
      current: "Excelente",
      progress: 95,
    },
  ];

  const handleDownloadKit = () => {
    toast.success("Download do Kit de Conteúdo dos Distribuidores iniciado!");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Cabeçalho Executivo */}
      <div className="bg-gradient-to-r from-[#0C1618] to-[#1C2826] text-white p-6 md:p-8 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[var(--client-primary)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-[var(--client-primary)] text-black font-bold uppercase tracking-wider text-[10px]">
                Projeto Piloto Oficial • 6 Meses
              </Badge>
              <Badge variant="outline" className="border-white/20 text-white/80 text-[10px]">
                Trade Marketing & Distribuidores
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Plano de Ações & Metas — {clientName}
            </h1>
            <p className="text-white/70 text-sm max-w-2xl leading-relaxed">
              Painel executivo de acompanhamento das 15 ações estratégicas com distribuidores,
              SLA operacional e metas contratuais (Mês 3 e Mês 6).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              onClick={handleDownloadKit}
              className="bg-[var(--client-primary)] hover:opacity-95 text-black font-bold px-5 shadow-lg"
            >
              <Download className="size-4 mr-2" />
              Kit Distribuidor (Mês Vigente)
            </Button>
          </div>
        </div>

        {/* Linha de Indicadores Rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-mono uppercase text-white/50 block">Ações Realizadas</span>
            <span className="text-xl font-black text-[var(--client-primary)]">2 / 15</span>
            <span className="text-[11px] text-white/60 block mt-0.5">Meta 100% no Mês 6</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-mono uppercase text-white/50 block">SLA Operacional</span>
            <span className="text-xl font-black text-emerald-400">100%</span>
            <span className="text-[11px] text-white/60 block mt-0.5">Meta: ≥ 85% Mês 3</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-mono uppercase text-white/50 block">Fase do Projeto</span>
            <span className="text-xl font-black text-white">Mês 1</span>
            <span className="text-[11px] text-white/60 block mt-0.5">Linha de Base & Trade</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-mono uppercase text-white/50 block">Próximo Marco</span>
            <span className="text-xl font-black text-amber-300">Dia 20</span>
            <span className="text-[11px] text-white/60 block mt-0.5">Plano de Mídia Mensal</span>
          </div>
        </div>
      </div>

      {/* 2. Abas do Piloto: Ações Distribuidores, SLAs e Metas */}
      <Tabs defaultValue="acoes" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="acoes"
            className="rounded-xl data-[state=active]:bg-[#0C1618] data-[state=active]:text-white font-bold text-xs py-2.5 px-4"
          >
            <Users className="size-3.5 mr-2" />
            15 Ações com Distribuidores (Bloco 06)
          </TabsTrigger>
          <TabsTrigger
            value="metas"
            className="rounded-xl data-[state=active]:bg-[#0C1618] data-[state=active]:text-white font-bold text-xs py-2.5 px-4"
          >
            <Target className="size-3.5 mr-2" />
            Metas de Evolução (Mês 3 vs Mês 6)
          </TabsTrigger>
          <TabsTrigger
            value="sla"
            className="rounded-xl data-[state=active]:bg-[#0C1618] data-[state=active]:text-white font-bold text-xs py-2.5 px-4"
          >
            <ShieldCheck className="size-3.5 mr-2" />
            Níveis de Serviço & SLAs (10 Prazos)
          </TabsTrigger>
          <TabsTrigger
            value="kit"
            className="rounded-xl data-[state=active]:bg-[#0C1618] data-[state=active]:text-white font-bold text-xs py-2.5 px-4"
          >
            <Download className="size-3.5 mr-2" />
            Kit Mensal para Distribuidores
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: 15 AÇÕES COM DISTRIBUIDORES */}
        <TabsContent value="acoes" className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Flame className="size-5 text-[var(--client-primary)]" />
                  Evolução das Ações de Relacionamento (Meta Acumulada: 15)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Distribuição acordada no briefing: 6 ações até o Mês 3 e 15 ações até o Mês 6.
                </p>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold px-3 py-1">
                Progresso: 2 de 15 ações
              </Badge>
            </div>

            {/* Linha do tempo dos 6 meses */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DISTRIBUTOR_ACTIONS_TIMELINE.map((item) => {
                const isActive = item.month === selectedMonth;
                return (
                  <div
                    key={item.month}
                    onClick={() => setSelectedMonth(item.month)}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                      item.status === "in_progress"
                        ? "border-[var(--client-primary)] bg-[var(--client-primary)]/5 shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Mês {item.month} do Piloto
                      </span>
                      <Badge
                        className={
                          item.status === "in_progress"
                            ? "bg-[var(--client-primary)] text-black font-bold"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        +{item.targetMonth} no mês • Total: {item.targetAccum}
                      </Badge>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">{item.description}</p>

                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Entregáveis Previstos:
                      </span>
                      {item.deliverables.map((d, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                          <CheckCircle2 className="size-3 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ABA 2: METAS MÊS 3 VS MÊS 6 */}
        <TabsContent value="metas" className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Target className="size-5 text-[var(--client-primary)]" />
                Matriz de Indicadores e Metas Contratuais
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Base oficial de acompanhamento da proposta para avaliação da diretoria da Libus.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {KPIS.map((kpi, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{kpi.name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">{kpi.measure}</p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                    <div className="bg-white rounded-xl p-2.5 border border-slate-200">
                      <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Meta Mês 3</span>
                      <span className="text-xs font-black text-amber-600 block">{kpi.m3}</span>
                    </div>
                    <div className="bg-white rounded-xl p-2.5 border border-slate-200">
                      <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Meta Mês 6</span>
                      <span className="text-xs font-black text-emerald-600 block">{kpi.m6}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-500 font-medium">Status Atual:</span>
                    <Badge variant="outline" className="font-bold border-slate-300 text-slate-800">
                      {kpi.current}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ABA 3: NÍVEIS DE SERVIÇO (SLA) */}
        <TabsContent value="sla" className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-600" />
                Níveis de Serviço (SLA) & Prazos Acordados
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Garantia de pontualidade e rigor técnico em todas as etapas operacionais da Kasa.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="py-3 px-4">Atividade / Entrega</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Prazo Acordado na Proposta</th>
                    <th className="py-3 px-4 text-right">Status em Tempo Real</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SLA_RULES.map((rule, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{rule.activity}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600 font-medium">
                          {rule.category}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{rule.sla}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="size-3" />
                          {rule.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ABA 4: KIT MENSAL PARA DISTRIBUIDORES */}
        <TabsContent value="kit" className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Download className="size-5 text-[var(--client-primary)]" />
                  Kit Mensal de Conteúdo para Distribuidores
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Disponibilizado impreterivelmente até o dia 05 de cada mês para uso dos parceiros comerciais.
                </p>
              </div>
              <Button onClick={handleDownloadKit} className="bg-[#0C1618] hover:bg-black text-white font-bold text-xs">
                <Download className="size-3.5 mr-1.5" /> Baixar Pacote Completo (ZIP)
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 border-slate-200 space-y-3 bg-gradient-to-br from-white to-slate-50">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">Redes Sociais</Badge>
                <h4 className="font-bold text-slate-900 text-sm">Posts & Carrosséis Técnicos</h4>
                <p className="text-xs text-slate-500">
                  Artes prontas em alta resolução e legendas sugeridas para Instagram e LinkedIn dos distribuidores.
                </p>
                <Button variant="outline" size="sm" className="w-full text-xs font-bold">
                  Baixar Artes
                </Button>
              </Card>

              <Card className="p-5 border-slate-200 space-y-3 bg-gradient-to-br from-white to-slate-50">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">WhatsApp & Vendas</Badge>
                <h4 className="font-bold text-slate-900 text-sm">Disparos & Cards Rápidos</h4>
                <p className="text-xs text-slate-500">
                  Imagens verticais e textos sintetizados para os vendedores dos distribuidores enviarem a clientes finais.
                </p>
                <Button variant="outline" size="sm" className="w-full text-xs font-bold">
                  Baixar Cards
                </Button>
              </Card>

              <Card className="p-5 border-slate-200 space-y-3 bg-gradient-to-br from-white to-slate-50">
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">Catálogo Digital</Badge>
                <h4 className="font-bold text-slate-900 text-sm">Fichas Técnicas & Banners</h4>
                <p className="text-xs text-slate-500">
                  Banners promocionais para e-commerces parceiros e fichas dos lançamentos de proteção industrial.
                </p>
                <Button variant="outline" size="sm" className="w-full text-xs font-bold">
                  Baixar Fichas
                </Button>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
