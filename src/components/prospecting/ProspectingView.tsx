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
import type { Prospect, ProspectingSearchParams, IcpWeightsConfig } from "@/lib/prospecting/types";
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
  const [selectedCity, setSelectedCity] = useState("São Paulo");
  const [onlyWhatsapp, setOnlyWhatsapp] = useState(false);
  const [onlyDecisors, setOnlyDecisors] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [opportunityFilter, setOpportunityFilter] = useState<"all" | "gold_mine" | "no_website" | "amateur_insta">("all");
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Carrega configurações de ICP e Chaves de API
  const [icpConfig, setIcpConfig] = useState<IcpWeightsConfig>(getIcpConfig());
  const [googleApiKey, setGoogleApiKey] = useState(icpConfig.apiKeys?.googlePlacesApiKey || "");
  const [serpApiKey, setSerpApiKey] = useState(icpConfig.apiKeys?.serpApiKey || "");

  // Busca Prospects
  const searchParams: ProspectingSearchParams = {
    query: searchTerm,
    niche: selectedNiche,
    city: selectedCity,
    onlyWithWhatsapp: onlyWhatsapp,
    onlyWithDecisionMakers: onlyDecisors,
    tier: selectedTier,
    opportunityFilter,
  };

  const { data: prospects = [], isLoading, refetch } = useQuery({
    queryKey: ["prospects", searchParams],
    queryFn: () => fetchProspects(searchParams),
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Seletor de Nicho Prioritário */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#869296]" />
            <select
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E9E4DC] rounded-xl text-xs text-[#0C1618] focus:outline-none focus:border-[#FFBC45] transition cursor-pointer"
            >
              <option value="todos">Todos os Nichos</option>
              <option value="odontológica">Clínicas Odontológicas</option>
              <option value="estética">Estética & Dermatologia</option>
              <option value="escola">Escolas & Colégios</option>
              <option value="imobiliária">Imobiliárias & Construtoras</option>
              <option value="gastronomia">Restaurantes & Gastronomia</option>
            </select>
          </div>

          {/* Localização / Cidade */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#869296]" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E9E4DC] rounded-xl text-xs text-[#0C1618] focus:outline-none focus:border-[#FFBC45] transition cursor-pointer"
            >
              <option value="São Paulo">São Paulo, SP</option>
              <option value="Curitiba">Curitiba, PR</option>
              <option value="Rio de Janeiro">Rio de Janeiro, RJ</option>
              <option value="Belo Horizonte">Belo Horizonte, MG</option>
              <option value="Campinas">Campinas, SP</option>
            </select>
          </div>

          {/* Botão de Atualizar Busca */}
          <button
            type="button"
            onClick={() => refetch()}
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
            />
          ))}
        </div>
      )}

      {/* 4. Modal de Configuração de Pesos do ICP & Chaves de API (Google Places / SerpApi) */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-lg bg-white text-[#0C1618] rounded-3xl p-6 font-sans max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
              <Settings2 className="size-5 text-[#FFBC45]" />
              Configuração de Pesos ICP & Integrações
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6A787B]">
              Ajuste a pontuação de cada critério e configure suas chaves de busca ao vivo (Camada 2).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 my-4">
            {/* Seção 1: Pesos do Algoritmo */}
            <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E9E4DC]">
              <span className="text-xs font-bold text-[#0C1618] uppercase tracking-wider block border-b border-[#E9E4DC] pb-1.5">
                📊 Pesos do Algoritmo (0 a 100)
              </span>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>WhatsApp Direto</span>
                  <span className="font-mono text-[#FFBC45]">{icpConfig.weights.hasWhatsapp} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={icpConfig.weights.hasWhatsapp}
                  onChange={(e) =>
                    setIcpConfig({
                      ...icpConfig,
                      weights: { ...icpConfig.weights, hasWhatsapp: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#FFBC45]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Sócios / Decisores Identificados (QSA/LinkedIn)</span>
                  <span className="font-mono text-[#FFBC45]">{icpConfig.weights.hasDecisionMaker} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={icpConfig.weights.hasDecisionMaker}
                  onChange={(e) =>
                    setIcpConfig({
                      ...icpConfig,
                      weights: { ...icpConfig.weights, hasDecisionMaker: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#FFBC45]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Nicho Prioritário</span>
                  <span className="font-mono text-[#FFBC45]">{icpConfig.weights.priorityNiche} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={icpConfig.weights.priorityNiche}
                  onChange={(e) =>
                    setIcpConfig({
                      ...icpConfig,
                      weights: { ...icpConfig.weights, priorityNiche: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#FFBC45]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Alto Volume de Avaliações Google</span>
                  <span className="font-mono text-[#FFBC45]">{icpConfig.weights.highReviewCount} pts</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={icpConfig.weights.highReviewCount}
                  onChange={(e) =>
                    setIcpConfig({
                      ...icpConfig,
                      weights: { ...icpConfig.weights, highReviewCount: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#FFBC45]"
                />
              </div>
            </div>

            {/* Seção 2: Chaves de API (Camada 2 - Opcional) */}
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
              Salvar Configurações
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
