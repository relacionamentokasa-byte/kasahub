import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Flame,
  Zap,
  Users,
  Building2,
  MapPin,
  RefreshCw,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  CheckSquare,
  ArrowRight,
  ShieldCheck,
  Settings2,
  Lightbulb,
  Key,
  Globe,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProspects, convertProspectToLead, getIcpConfig, saveIcpConfig } from "@/lib/prospecting/prospecting-api";
import { ProspectCard } from "./ProspectCard";
import { CityAutocomplete } from "./CityAutocomplete";
import type { Prospect, ProspectingSearchParams, IcpWeightsConfig, BusinessModelType, IcpPresetKey } from "@/lib/prospecting/types";
import { ICP_PRESETS } from "@/lib/prospecting/icp-scoring";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function ProspectingView() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Estados dos Filtros de Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("todos");
  const [selectedBusinessModel, setSelectedBusinessModel] = useState<BusinessModelType>("all");
  const [selectedCity, setSelectedCity] = useState("São Paulo");
  const [selectedLimit, setSelectedLimit] = useState<number>(20);
  const [onlyWhatsapp, setOnlyWhatsapp] = useState(false);
  const [onlyDecisors, setOnlyDecisors] = useState(false);
  const [excludeFranchises, setExcludeFranchises] = useState<boolean>(true);
  const [selectedTier, setSelectedTier] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [opportunityFilter, setOpportunityFilter] = useState<"all" | "gold_mine" | "no_website" | "amateur_insta">("all");
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Carrega configurações de ICP e Chaves de API
  const [icpConfig, setIcpConfig] = useState<IcpWeightsConfig>(getIcpConfig());
  const [googleApiKey, setGoogleApiKey] = useState(icpConfig.apiKeys?.googlePlacesApiKey || "");
  const [serpApiKey, setSerpApiKey] = useState(icpConfig.apiKeys?.serpApiKey || "");

  // Parâmetros da busca ATIVA (executada exclusivamente ao clicar em 'Garimpar Empresas')
  const [activeSearchParams, setActiveSearchParams] = useState<ProspectingSearchParams>({
    query: "",
    niche: "todos",
    businessModel: "all",
    city: "São Paulo",
    limit: 20,
    onlyWithWhatsapp: false,
    onlyWithDecisionMakers: false,
    excludeFranchises: true,
    tier: "all",
    opportunityFilter: "all",
  });

  // Dispara a busca sob demanda
  const handleExecuteSearch = () => {
    setActiveSearchParams({
      query: searchTerm,
      niche: selectedNiche,
      businessModel: selectedBusinessModel,
      city: selectedCity,
      limit: selectedLimit,
      onlyWithWhatsapp: onlyWhatsapp,
      onlyWithDecisionMakers: onlyDecisors,
      excludeFranchises,
      tier: selectedTier,
      opportunityFilter,
    });
  };

  const { data: prospects = [], isLoading, refetch } = useQuery({
    queryKey: ["prospects", activeSearchParams],
    queryFn: () => fetchProspects(activeSearchParams),
  });

  // Mutação para Enviar para o CRM
  const [importingId, setImportingId] = useState<string | null>(null);

  const handleSendToCrm = async (prospect: Prospect) => {
    setImportingId(prospect.id);
    try {
      const res = await convertProspectToLead(prospect);
      if (res.success) {
        toast.success(`Lead "${prospect.tradeName}" criado no CRM com sucesso!`);
        refetch();
      } else {
        toast.error(`Erro ao criar lead: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Falha: ${err.message}`);
    } finally {
      setImportingId(null);
    }
  };

  // Salvar ajustes de pesos ICP e Chaves de API
  const handleSaveConfig = () => {
    const updatedConfig: IcpWeightsConfig = {
      ...icpConfig,
      apiKeys: {
        googlePlacesApiKey: googleApiKey.trim() || undefined,
        serpApiKey: serpApiKey.trim() || undefined,
      },
    };
    saveIcpConfig(updatedConfig);
    setIcpConfig(updatedConfig);
    setIsConfigOpen(false);
    toast.success("Critérios de ICP e Chaves de API salvos com sucesso!");
    refetch();
  };

  // Contadores de Tiers e Oportunidades
  const hotCount = prospects.filter((p) => p.icpTier === "hot").length;
  const warmCount = prospects.filter((p) => p.icpTier === "warm").length;
  const goldCount = prospects.filter((p) => p.marketingAudit?.opportunityType === "gold_mine").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. Header do Módulo de Garimpo */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-[#869296] flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[#FFBC45]" />
            MOTOR DE PROSPECÇÃO ATIVA & RAIO-X DE MARKETING
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-1">
            Garimpo de Leads, Decisores & Raio-X Digital
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Descubra empresas qualificadas por nicho e região, identifique os sócios/decisores reais e analise a maturidade de marketing antes da abordagem.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E9E4DC] text-xs font-bold text-[#0C1618] shadow-xs hover:bg-[#FAF8F5] transition cursor-pointer"
          >
            <Settings2 className="size-3.5 text-[#869296]" />
            <span>Configurar Pesos & APIs</span>
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/crm" })}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121214] text-white text-xs font-bold shadow-xs hover:bg-[#27272A] transition cursor-pointer"
          >
            <span>Ver Kanban CRM</span>
            <ArrowRight className="size-3.5 text-[#FFBC45]" />
          </button>
        </div>
      </div>

      {/* 2. Barra de Busca e Filtros de Garimpo */}
      <div className="p-5 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Campo de Busca por Nome / Palavra-Chave */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#869296]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por empresa, sócio ou palavra..."
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E9E4DC] rounded-xl text-xs text-[#0C1618] focus:outline-none focus:border-[#FFBC45] transition"
            />
          </div>

          {/* Seletor de Modelo de Negócio B2B (Ortogonal ao Nicho) */}
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#869296]" />
            <select
              value={selectedBusinessModel}
              onChange={(e) => setSelectedBusinessModel(e.target.value as BusinessModelType)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E9E4DC] rounded-xl text-xs font-medium text-[#0C1618] focus:outline-none focus:border-[#FFBC45] transition cursor-pointer"
            >
              <option value="all">Todos os Modelos</option>
              <option value="industria_fabricante">🏭 Indústria / Fabricante</option>
              <option value="distribuidora_atacado">📦 Distribuidora / Atacado</option>
              <option value="varejo_loja">🛍️ Varejo / Loja</option>
              <option value="servicos_clinicas">🩺 Serviços / Clínicas</option>
            </select>
          </div>

          {/* Seletor de Nicho Prioritário */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#869296]" />
            <select
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E9E4DC] rounded-xl text-xs text-[#0C1618] focus:outline-none focus:border-[#FFBC45] transition cursor-pointer"
            >
              <option value="todos">Todos os Nichos</option>
              <option value="cosméticos">Cosméticos & Beleza</option>
              <option value="epi">EPIs & Segurança do Trabalho</option>
              <option value="indústria">Indústrias & Fabricantes</option>
              <option value="distribuidora atacado">Distribuidoras & Atacado</option>
              <option value="varejo">Varejo & Lojas</option>
              <option value="odontológica">Clínicas Odontológicas</option>
              <option value="estética">Estética & Dermatologia</option>
              <option value="escola">Escolas & Colégios</option>
              <option value="imobiliária">Imobiliárias & Construtoras</option>
              <option value="gastronomia">Restaurantes & Gastronomia</option>
            </select>
          </div>

          {/* Localização / Cidade com Autocomplete de Todo o Brasil */}
          <div className="relative">
            <CityAutocomplete
              value={selectedCity}
              onChange={(city) => setSelectedCity(city)}
              placeholder="Cidade ou Estado no Brasil..."
            />
          </div>

          {/* Seletor de Quantidade de Empresas */}
          <div className="relative">
            <select
              value={selectedLimit}
              onChange={(e) => setSelectedLimit(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E9E4DC] rounded-xl text-xs font-semibold text-[#0C1618] focus:outline-none focus:border-[#FFBC45] transition cursor-pointer"
            >
              <option value={20}>Buscar 20 empresas</option>
              <option value={50}>Buscar 50 empresas (Varredura Ampla)</option>
              <option value={100}>Buscar 100 empresas (Cidade Inteira)</option>
            </select>
          </div>

          {/* Botão de Atualizar Busca */}
          <button
            type="button"
            onClick={handleExecuteSearch}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#FFBC45] hover:bg-[#F2AC35] text-[#09090B] font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Garimpar Empresas</span>
          </button>
        </div>

        {/* Filtros Rápidos de Segmentação e Oportunidades de Marketing */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F0ECE4]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-[#869296] mr-1">Filtros Estratégicos:</span>

            {/* Ignorar Franquias e Redes */}
            <button
              type="button"
              onClick={() => setExcludeFranchises(!excludeFranchises)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                excludeFranchises
                  ? "bg-slate-900 text-white border border-slate-900 font-bold"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              🚫 Ignorar Franquias
            </button>

            {/* Apenas Oportunidades Ouro */}
            <button
              type="button"
              onClick={() => setOpportunityFilter(opportunityFilter === "gold_mine" ? "all" : "gold_mine")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                opportunityFilter === "gold_mine"
                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              🏆 Oportunidades Ouro ({goldCount})
            </button>

            {/* Apenas com WhatsApp */}
            <button
              type="button"
              onClick={() => setOnlyWhatsapp(!onlyWhatsapp)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                onlyWhatsapp
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              📱 Com WhatsApp
            </button>

            {/* Apenas com Decisores Mapeados */}
            <button
              type="button"
              onClick={() => setOnlyDecisors(!onlyDecisors)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                onlyDecisors
                  ? "bg-[#FFF2D6] text-[#B45309] border border-[#FDE68A]"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              👥 Sócios / Decisores Mapeados
            </button>

            {/* Sem Site Próprio */}
            <button
              type="button"
              onClick={() => setOpportunityFilter(opportunityFilter === "no_website" ? "all" : "no_website")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                opportunityFilter === "no_website"
                  ? "bg-red-100 text-red-800 border border-red-300 font-bold"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              🌐 Sem Site Próprio
            </button>
          </div>

          {/* Segmented Control por Score Tier */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E9E4DC]">
            {(
              [
                { id: "all", label: `Todos (${prospects.length})` },
                { id: "hot", label: `🔥 ICP Quente (${hotCount})` },
                { id: "warm", label: `⚡ Potencial (${warmCount})` },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTier(t.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedTier === t.id
                    ? "bg-[#121214] text-white shadow-xs"
                    : "text-[#869296] hover:text-[#0C1618]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Grid de Resultados de Prospects com Raio-X de Marketing */}
      {isLoading ? (
        <div className="p-16 text-center text-[#869296] bg-white rounded-2xl border border-[#E9E4DC]">
          <RefreshCw className="size-6 animate-spin mx-auto text-[#FFBC45] mb-2" />
          <p className="text-xs font-bold">Consultando registros e analisando maturidade de marketing...</p>
        </div>
      ) : prospects.length === 0 ? (
        <div className="p-16 text-center text-[#869296] bg-white rounded-2xl border border-[#E9E4DC]">
          <p className="text-sm font-bold text-[#0C1618]">Nenhum prospect encontrado com os filtros atuais.</p>
          <p className="text-xs mt-1">Tente ampliar os nichos ou selecionar outro filtro estratégico.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {prospects.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              onSendToCrm={handleSendToCrm}
              isImporting={importingId === prospect.id}
              onUpdateProspect={(updated) => {
                queryClient.setQueryData(["prospects", activeSearchParams], (old: Prospect[] | undefined) => {
                  if (!old) return [updated];
                  return old.map((item) => (item.id === updated.id ? updated : item));
                });
              }}
            />
          ))}
        </div>
      )}

      {/* 4. Modal de Configuração de Pesos do ICP & Chaves de API */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl bg-white text-[#0C1618] rounded-3xl p-6 font-sans max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
                <Settings2 className="size-5 text-[#FFBC45]" />
                Matriz Estratégica de ICP & Pesos do Algoritmo
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6A787B]">
              Selecione um preset salvo ou calibre os 4 pilares: Dealbreakers, Finanças, Oportunidades de Marketing e Decisores.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 my-4">
            {/* Presets Nativos Salvos da Kasa Hub */}
            <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E9E4DC] space-y-2">
              <span className="text-[11px] font-bold text-[#0C1618] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[#FFBC45]" />
                Perfis Estratégicos Salvos (Presets Prontos)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: "padrao_kasa" as IcpPresetKey, label: "🎯 Padrão Kasa", desc: "Equilibrado" },
                  { key: "b2b_industria" as IcpPresetKey, label: "🏭 B2B / Indústria", desc: "Alto Ticket" },
                  { key: "varejo_clinicas" as IcpPresetKey, label: "🏪 Varejo & Clínicas", desc: "Local / Social" },
                  { key: "gold_mine_gaps" as IcpPresetKey, label: "🏆 Mina de Ouro", desc: "Gaps de Vendas" },
                ].map((preset) => {
                  const isActive = icpConfig.presetKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => {
                        const target = ICP_PRESETS[preset.key];
                        if (target) {
                          setIcpConfig({
                            ...target,
                            apiKeys: icpConfig.apiKeys, // preserva chaves de API já salvas
                          });
                          toast.success(`Preset "${target.name}" aplicado!`);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isActive
                          ? "bg-[#121214] text-white border-[#121214] shadow-sm"
                          : "bg-white text-[#0C1618] border-[#E9E4DC] hover:border-[#FFBC45]"
                      }`}
                    >
                      <span className="text-xs font-bold truncate">{preset.label}</span>
                      <span className={`text-[10px] ${isActive ? "text-[#FFBC45]" : "text-[#869296]"}`}>
                        {preset.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PILAR 0: Filtros Eliminatórios (Dealbreakers) */}
            <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-red-200/70">
              <span className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-red-200 pb-1.5">
                <ShieldCheck className="size-4 text-red-600" />
                🚫 Filtros Eliminatórios Imediatos (Dealbreakers)
              </span>
              <p className="text-[11px] text-[#6A787B]">
                Leads que se enquadram nestas regras são rebaixados automaticamente para <strong>Fora do ICP</strong>:
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#E9E4DC] hover:border-red-300 cursor-pointer transition text-xs font-medium text-[#0C1618]">
                  <input
                    type="checkbox"
                    checked={icpConfig.dealbreakers?.excludeFranchises ?? true}
                    onChange={(e) =>
                      setIcpConfig({
                        ...icpConfig,
                        dealbreakers: {
                          ...icpConfig.dealbreakers,
                          excludeFranchises: e.target.checked,
                          excludeLowCapital: icpConfig.dealbreakers?.excludeLowCapital ?? true,
                        },
                      })
                    }
                    className="rounded accent-red-600"
                  />
                  <span>Descartar Franquias & Redes Sem Autonomia Local de Contratação</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#E9E4DC] hover:border-red-300 cursor-pointer transition text-xs font-medium text-[#0C1618]">
                  <input
                    type="checkbox"
                    checked={icpConfig.dealbreakers?.excludeLowCapital ?? true}
                    onChange={(e) =>
                      setIcpConfig({
                        ...icpConfig,
                        dealbreakers: {
                          ...icpConfig.dealbreakers,
                          excludeFranchises: icpConfig.dealbreakers?.excludeFranchises ?? true,
                          excludeLowCapital: e.target.checked,
                        },
                      })
                    }
                    className="rounded accent-red-600"
                  />
                  <span>Descartar Empresas com Capital Social &lt; R$ 20.000 (Sem Verba de Mídia)</span>
                </label>
              </div>
            </div>

            {/* PILAR 1: Capacidade Financeira & Porte */}
            <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E9E4DC]">
              <span className="text-xs font-bold text-[#0C1618] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E9E4DC] pb-1.5">
                <Building2 className="size-3.5 text-[#FFBC45]" />
                💰 Pilar 1: Capacidade Financeira & Porte
              </span>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Capital Social Alto / Porte B2B (Indústria/Atacado)</span>
                  <span className="font-mono text-[#FFBC45]">{icpConfig.weights.capitalSocialOrB2B ?? 20} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={icpConfig.weights.capitalSocialOrB2B ?? 20}
                  onChange={(e) =>
                    setIcpConfig({
                      ...icpConfig,
                      weights: { ...icpConfig.weights, capitalSocialOrB2B: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#FFBC45]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Enquadramento em Nicho Prioritário</span>
                  <span className="font-mono text-[#FFBC45]">{icpConfig.weights.priorityNiche ?? 15} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={icpConfig.weights.priorityNiche ?? 15}
                  onChange={(e) =>
                    setIcpConfig({
                      ...icpConfig,
                      weights: { ...icpConfig.weights, priorityNiche: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#FFBC45]"
                />
              </div>
            </div>

            {/* PILAR 2: Gaps de Marketing & Oportunidade de Venda */}
            <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-amber-200/80">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-amber-200 pb-1.5">
                <Lightbulb className="size-3.5 text-amber-600" />
                ⚡ Pilar 2: Gaps de Marketing (Oportunidades de Venda da Agência)
              </span>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Empresa SEM Pixel Meta/Google (Gap Crítico de Escala)</span>
                  <span className="font-mono text-amber-700">{icpConfig.weights.noPixelOpportunity ?? 15} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={icpConfig.weights.noPixelOpportunity ?? 15}
                  onChange={(e) =>
                    setIcpConfig({
                      ...icpConfig,
                      weights: { ...icpConfig.weights, noPixelOpportunity: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-amber-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Necessidade de Site / Landing Page de Alta Conversão</span>
                  <span className="font-mono text-amber-700">{icpConfig.weights.needsWebsiteOrRevamp ?? 10} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={icpConfig.weights.needsWebsiteOrRevamp ?? 10}
                  onChange={(e) =>
                    setIcpConfig({
                      ...icpConfig,
                      weights: { ...icpConfig.weights, needsWebsiteOrRevamp: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-amber-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Empresa SEM Anúncios Ativos (Oportunidade de Tráfego Pago)</span>
                  <span className="font-mono text-amber-700">{icpConfig.weights.trafficOpportunity ?? 10} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={icpConfig.weights.trafficOpportunity ?? 10}
                  onChange={(e) =>
                    setIcpConfig({
                      ...icpConfig,
                      weights: { ...icpConfig.weights, trafficOpportunity: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-amber-600"
                />
              </div>
            </div>

            {/* PILAR 3: Acessibilidade do Decisor */}
            <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E9E4DC]">
              <span className="text-xs font-bold text-[#0C1618] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E9E4DC] pb-1.5">
                <Users className="size-3.5 text-[#FFBC45]" />
                🎯 Pilar 3: Acessibilidade do Decisor & Contato Direto
              </span>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Sócio / Decisor Real no QSA da Receita Federal ou LinkedIn</span>
                  <span className="font-mono text-[#FFBC45]">{icpConfig.weights.hasDecisionMakerQsa ?? 15} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  value={icpConfig.weights.hasDecisionMakerQsa ?? 15}
                  onChange={(e) =>
                    setIcpConfig({
                      ...icpConfig,
                      weights: { ...icpConfig.weights, hasDecisionMakerQsa: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#FFBC45]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>WhatsApp Direto Disponível</span>
                  <span className="font-mono text-[#FFBC45]">{icpConfig.weights.hasDirectWhatsapp ?? 15} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  value={icpConfig.weights.hasDirectWhatsapp ?? 15}
                  onChange={(e) =>
                    setIcpConfig({
                      ...icpConfig,
                      weights: { ...icpConfig.weights, hasDirectWhatsapp: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#FFBC45]"
                />
              </div>
            </div>

            {/* Posicionamento & Ticket da Agência */}
            <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E9E4DC]">
              <span className="text-xs font-bold text-[#0C1618] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E9E4DC] pb-1.5">
                <Sparkles className="size-3.5 text-[#FFBC45]" />
                💼 Serviços Ofertados & Alinhamento de Ticket (Kasa Hub)
              </span>

              <div className="space-y-2">
                {[
                  { id: "trafego", label: "Tráfego Pago & Performance (Meta/Google Ads)" },
                  { id: "sites", label: "Criação de Landing Pages & Sites de Alta Conversão" },
                  { id: "social", label: "Gestão de Redes Sociais & Posicionamento" },
                  { id: "crm", label: "Assessoria Comercial & CRM" },
                ].map((serv) => {
                  const currentServices = icpConfig.targetServices || [];
                  const isChecked = currentServices.includes(serv.label);
                  return (
                    <label
                      key={serv.id}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E9E4DC] hover:border-[#FFBC45] cursor-pointer transition text-xs font-medium text-[#0C1618]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...currentServices, serv.label]
                            : currentServices.filter((s) => s !== serv.label);
                          setIcpConfig({
                            ...icpConfig,
                            targetServices: updated,
                          });
                        }}
                        className="rounded accent-[#FFBC45]"
                      />
                      <span>{serv.label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-[#6A787B] block mb-1">
                    Ticket Mínimo Desejado (R$)
                  </label>
                  <input
                    type="number"
                    value={icpConfig.agencyPositioning?.minTicket || 2000}
                    onChange={(e) =>
                      setIcpConfig({
                        ...icpConfig,
                        agencyPositioning: {
                          minTicket: Number(e.target.value),
                          idealTicket: icpConfig.agencyPositioning?.idealTicket || 4500,
                          servicesOffered: icpConfig.agencyPositioning?.servicesOffered || [],
                        },
                      })
                    }
                    className="w-full p-2 bg-white border border-[#E9E4DC] rounded-xl text-xs text-[#0C1618] focus:outline-none focus:border-[#FFBC45]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#6A787B] block mb-1">
                    Ticket Ideal / Médio (R$)
                  </label>
                  <input
                    type="number"
                    value={icpConfig.agencyPositioning?.idealTicket || 4500}
                    onChange={(e) =>
                      setIcpConfig({
                        ...icpConfig,
                        agencyPositioning: {
                          minTicket: icpConfig.agencyPositioning?.minTicket || 2000,
                          idealTicket: Number(e.target.value),
                          servicesOffered: icpConfig.agencyPositioning?.servicesOffered || [],
                        },
                      })
                    }
                    className="w-full p-2 bg-white border border-[#E9E4DC] rounded-xl text-xs text-[#0C1618] focus:outline-none focus:border-[#FFBC45]"
                  />
                </div>
              </div>
            </div>

            {/* Chaves de API (Camada 2 - Opcional) */}
            <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E9E4DC]">
              <span className="text-xs font-bold text-[#0C1618] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E9E4DC] pb-1.5">
                <Key className="size-3.5 text-[#FFBC45]" />
                Camada 2: Chaves de Busca ao Vivo (Opcional)
              </span>
              <p className="text-[11px] text-[#6A787B] leading-relaxed">
                Por padrão o sistema utiliza a Camada 1 (OpenStreetMap + BrasilAPI) de forma gratuita. Se desejar usar a busca direta oficial do Google Maps, insira sua chave abaixo:
              </p>

              <div>
                <label className="text-[11px] font-bold text-[#0C1618] block mb-1">
                  Google Places API Key (AIza...)
                </label>
                <input
                  type="password"
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-2 bg-white border border-[#E9E4DC] rounded-xl text-xs text-[#0C1618] focus:outline-none focus:border-[#FFBC45]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#0C1618] block mb-1">
                  SerpApi Private Key
                </label>
                <input
                  type="password"
                  value={serpApiKey}
                  onChange={(e) => setSerpApiKey(e.target.value)}
                  placeholder="Ex: 8f4e2b..."
                  className="w-full p-2 bg-white border border-[#E9E4DC] rounded-xl text-xs text-[#0C1618] focus:outline-none focus:border-[#FFBC45]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E9E4DC]">
            <button
              type="button"
              onClick={() => setIsConfigOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#6A787B] hover:bg-gray-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#121214] text-white hover:bg-[#27272A] transition cursor-pointer"
            >
              Salvar Matriz & Pesos
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
