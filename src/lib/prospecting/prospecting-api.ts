import { supabase } from "@/integrations/supabase/client";
import type { Prospect, IcpWeightsConfig, ProspectingSearchParams } from "./types";
import { searchProspects, enrichCnpjData } from "./search-providers";
import { searchProspectsServer } from "./prospecting.functions";
import { DEFAULT_ICP_CONFIG, calculateIcpScore } from "./icp-scoring";
import { recordTimelineEvent } from "@/lib/client-timeline";

const PROSPECTS_STORAGE_KEY = "kasahub_prospects_data";
const ICP_CONFIG_STORAGE_KEY = "kasahub_icp_config";

/**
 * Retorna as configurações ativas de ICP
 */
export function getIcpConfig(): IcpWeightsConfig {
  try {
    const saved = localStorage.getItem(ICP_CONFIG_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    // fallback
  }
  return DEFAULT_ICP_CONFIG;
}

/**
 * Salva as novas configurações de pesos e nichos do ICP
 */
export function saveIcpConfig(config: IcpWeightsConfig): void {
  localStorage.setItem(ICP_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

/**
 * Busca prospects com base nos filtros e calcula o ICP score
 * Executa prioritariamente via Server Function (para evitar bloqueios de CORS e trazer dados reais)
 */
export async function fetchProspects(params: ProspectingSearchParams): Promise<Prospect[]> {
  const config = getIcpConfig();
  let results: Prospect[] = [];

  try {
    // Execução Server-Side (Sem bloqueios de CORS e com conexão com Nominatim / Google Places)
    results = await searchProspectsServer({
      data: {
        query: params.query,
        niche: params.niche,
        businessModel: params.businessModel,
        city: params.city,
        state: params.state,
        limit: params.limit || 20,
        minScore: params.minScore,
        onlyWithWhatsapp: params.onlyWithWhatsapp,
        onlyWithDecisionMakers: params.onlyWithDecisionMakers,
        excludeFranchises: params.excludeFranchises ?? config.excludeFranchises,
        tier: params.tier,
        opportunityFilter: params.opportunityFilter,
        apiKey: config.apiKeys?.googlePlacesApiKey,
      },
    });
  } catch (err) {
    console.warn("Falha no servidor de busca, usando fallback client:", err);
    results = await searchProspects(params);
  }

  // Recalcula o score com as configurações locais do usuário
  return results.map((p) => {
    const calc = calculateIcpScore(p, config);
    return {
      ...p,
      icpScore: calc.score,
      icpTier: calc.tier,
      icpBreakdown: calc.breakdown,
    };
  });
}

/**
 * Converte um prospect diretamente em um Lead qualificado no Kanban do CRM
 * com Decisor principal definido e timeline enriquecida
 */
export async function convertProspectToLead(
  prospect: Prospect,
  targetStageId?: string
): Promise<{ success: boolean; leadId?: string; error?: string }> {
  try {
    // 1. Identifica o primeiro estágio ativo do CRM caso não seja passado
    let stageId = targetStageId;
    if (!stageId) {
      const { data: stages } = await supabase
        .from("lead_stages")
        .select("id")
        .order("order_index", { ascending: true })
        .limit(1);
      stageId = stages?.[0]?.id;
    }

    if (!stageId) {
      return { success: false, error: "Nenhum estágio de CRM configurado." };
    }

    // 2. Localiza o Decisor Principal (Sócio ou Diretor)
    const primaryDecisor =
      prospect.decisionMakers.find((dm) => dm.isPrimary) ||
      prospect.decisionMakers[0];

    const leadContactName = primaryDecisor
      ? `${primaryDecisor.name} (${primaryDecisor.role})`
      : prospect.tradeName || prospect.name;

    const leadPhone = prospect.whatsapp || prospect.phone;
    const cleanPhone = leadPhone.replace(/\D/g, "");
    const formattedPhone = cleanPhone
      ? cleanPhone.startsWith("55")
        ? `+${cleanPhone}`
        : `+55${cleanPhone}`
      : null;

    const { data: userData } = await supabase.auth.getUser();

    // 3. Insere o Lead na tabela canônica do CRM
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        name: leadContactName,
        company: prospect.tradeName || prospect.name,
        phone: formattedPhone,
        email: prospect.email || null,
        stage_id: stageId,
        source: "Prospecção Ativa (Garimpo)",
        owner_id: userData.user?.id ?? null,
      })
      .select()
      .single();

    if (leadError || !lead) {
      throw leadError || new Error("Falha ao criar lead no CRM");
    }

    // 4. Registra atividade na timeline do Lead com o diagnóstico completo do ICP
    const decisoresList = prospect.decisionMakers
      .map((dm) => `• ${dm.name} - ${dm.role} (${dm.source === "qsa_receita" ? "Receita Federal" : "LinkedIn"})`)
      .join("\n");

    const diagnosticText = `🎯 **Lead Garimpado & Qualificado via Motor ICP**
• **Score ICP:** ${prospect.icpScore}/100 (${prospect.icpTier.toUpperCase()})
• **Nicho:** ${prospect.category}
• **Avaliações Google:** ⭐ ${prospect.rating} (${prospect.reviewCount} avaliações)
• **Endereço:** ${prospect.address}, ${prospect.city} - ${prospect.state}
${prospect.website ? `• **Website:** ${prospect.website}` : ""}
${prospect.instagram ? `• **Instagram:** @${prospect.instagram}` : ""}

👥 **Sócios & Decisores Identificados:**
${decisoresList || "Nenhum sócio identificado no QSA inicial"}`;

    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      user_id: userData.user?.id ?? null,
      type: "note",
      content: diagnosticText,
    });

    return { success: true, leadId: lead.id };
  } catch (err: any) {
    console.error("Erro ao converter prospect em lead:", err);
    return { success: false, error: err.message || "Erro desconhecido" };
  }
}
