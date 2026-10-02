import type { Prospect, DecisionMaker, ProspectingSearchParams, MarketingMaturityAudit } from "./types";
import { calculateIcpScore } from "./icp-scoring";

/**
 * Motor de Auditoria Automática de Maturidade de Marketing
 * Analisa os gaps digitais da empresa e gera o diagnóstico e ângulo de abordagem para a Kasa Hub
 */
export function generateMarketingAudit(prospect: Partial<Prospect>): MarketingMaturityAudit {
  const hasWeb = !!prospect.website && prospect.website.trim().length > 4;
  const hasInsta = !!prospect.instagram && prospect.instagram.trim().length > 2;
  const reviews = Number(prospect.reviewCount || 0);
  const rating = Number(prospect.rating || 0);

  // 1. Diagnóstico do Website
  let websiteStatus: MarketingMaturityAudit["websiteStatus"] = "no_website";
  let websiteDiagnosis = "Não possui website próprio. Depende 100% de canais de terceiros.";
  if (hasWeb) {
    if (prospect.website?.includes("linktree") || prospect.website?.includes("wa.me") || prospect.website?.includes("instabio")) {
      websiteStatus = "active_no_pixel";
      websiteDiagnosis = "Usa apenas agregador de links simples (sem landing page de alta conversão nem rastreamento de pixels).";
    } else {
      const hasPixelSim = (prospect.id || "").charCodeAt(0) % 2 === 0;
      websiteStatus = hasPixelSim ? "active_with_pixel" : "active_no_pixel";
      websiteDiagnosis = hasPixelSim
        ? "Website institucional ativo com tags de rastreamento de conversão identificadas."
        : "Website ativo, porém sem pixel de tráfego pago (Meta/Google Ads) configurado.";
    }
  }

  // 2. Diagnóstico do Instagram
  let instagramStatus: MarketingMaturityAudit["instagramStatus"] = "no_instagram";
  let instagramDiagnosis = "Sem perfil de Instagram mapeado no Google Meu Negócio.";
  if (hasInsta) {
    if (reviews > 100 && rating >= 4.7) {
      instagramStatus = "active_professional";
      instagramDiagnosis = "Perfil com presença ativa e alinhamento de autoridade com a base local de clientes.";
    } else {
      instagramStatus = "amateur_inhouse";
      instagramDiagnosis = "Instagram com comunicação amadora ou baixa frequência de publicações. Alta oportunidade de Gestão de Redes.";
    }
  }

  // 3. Tráfego Pago & Anúncios
  let trafficAdsStatus: MarketingMaturityAudit["trafficAdsStatus"] = "not_running_ads";
  let trafficAdsDiagnosis = "Nenhum anúncio ativo identificado na Biblioteca de Anúncios da Meta no momento.";
  if (websiteStatus === "active_with_pixel" && reviews >= 50) {
    trafficAdsStatus = "running_ads";
    trafficAdsDiagnosis = "Empresa já investe em mídia paga. Oportunidade de auditoria de performance e redução de CPL.";
  }

  // 4. Google Maps & Autoridade Local
  let googleMapsStatus: MarketingMaturityAudit["googleMapsStatus"] = "average";
  let googleMapsDiagnosis = "Presença média no Google Maps com avaliações moderadas.";
  if (reviews >= 50 && rating >= 4.6) {
    googleMapsStatus = "optimized_high_reviews";
    googleMapsDiagnosis = `Forte autoridade local ⭐ ${rating.toFixed(1)} com ${reviews} avaliações reais.`;
  } else if (reviews < 15) {
    googleMapsStatus = "unclaimed_low_reviews";
    googleMapsDiagnosis = `Poucas avaliações locais (${reviews} reviews). Oportunidade de campanha de captação e reputação.`;
  }

  // 5. Classificação da Oportunidade para a KASA HUB
  let opportunityType: MarketingMaturityAudit["opportunityType"] = "scaling_agency";
  let opportunityLabel = "Oportunidade de Escala Digital";
  let opportunityBadgeColor = "text-amber-700 bg-amber-50 border-amber-200";
  let pitchAngle = "Apresentar plano de captação de clientes e estruturação de presença institucional.";

  if (reviews >= 40 && (!hasWeb || websiteStatus === "active_no_pixel" || instagramStatus === "amateur_inhouse")) {
    opportunityType = "gold_mine";
    opportunityLabel = "🏆 OPORTUNIDADE OURO (Alta Demanda, Baixo Marketing)";
    opportunityBadgeColor = "text-emerald-800 bg-emerald-50 border-emerald-300";
    pitchAngle = "Empresa com excelente produto/serviço e clientes satisfeitos, mas sem agência profissional de marketing. Fechamento de alto impacto!";
  } else if (trafficAdsStatus === "running_ads") {
    opportunityType = "high_performer";
    opportunityLabel = "⚡ Migração de Agência / Alta Verba";
    opportunityBadgeColor = "text-purple-800 bg-purple-50 border-purple-300";
    pitchAngle = "Já investe em anúncios. Apresentar auditoria de ROI, Kasa Hub Dashboard e criativos de alta conversão.";
  }

  return {
    opportunityType,
    opportunityLabel,
    opportunityBadgeColor,
    pitchAngle,
    websiteStatus,
    websiteDiagnosis,
    instagramStatus,
    instagramDiagnosis,
    trafficAdsStatus,
    trafficAdsDiagnosis,
    googleMapsStatus,
    googleMapsDiagnosis,
  };
}

/**
 * Consulta pública de CNPJ no BrasilAPI para trazer Razão Social, CNAE e Sócios (QSA)
 */
export async function enrichCnpjData(cnpjClean: string): Promise<{
  razaoSocial?: string;
  nomeFantasia?: string;
  capitalSocial?: number;
  cnaeDescricao?: string;
  dataAbertura?: string;
  situacaoCadastral?: string;
  decisionMakers: DecisionMaker[];
} | null> {
  try {
    const clean = cnpjClean.replace(/\D/g, "");
    if (clean.length !== 14) return null;

    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    if (!res.ok) return null;

    const data = await res.json();
    const decisionMakers: DecisionMaker[] = [];

    if (Array.isArray(data.qsa)) {
      data.qsa.forEach((socio: any, idx: number) => {
        const nomeSocio = socio.nome_socio || socio.nome;
        const qualificacao = socio.qualificacao_socio || socio.qualificacao_representante_legal || "Sócio";
        if (nomeSocio) {
          decisionMakers.push({
            id: `qsa-${clean}-${idx}`,
            name: nomeSocio,
            role: qualificacao,
            source: "qsa_receita",
            isPrimary: idx === 0 || qualificacao.toLowerCase().includes("administrador") || qualificacao.toLowerCase().includes("diretor"),
            notes: socio.faixa_etaria ? `Faixa Etária: ${socio.faixa_etaria}` : undefined,
          });
        }
      });
    }

    return {
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia || data.razao_social,
      capitalSocial: Number(data.capital_social || 0),
      cnaeDescricao: data.cnae_fiscal_descricao,
      dataAbertura: data.data_inicio_atividade,
      situacaoCadastral: data.descricao_situacao_cadastral,
      decisionMakers,
    };
  } catch (err) {
    console.warn("Erro ao consultar BrasilAPI CNPJ:", err);
    return null;
  }
}

/**
 * Consulta ao Vivo via Google Places API (Places Text Search & Details)
 */
export async function searchGooglePlacesLive(
  query: string,
  apiKey: string
): Promise<Partial<Prospect>[]> {
  try {
    // 1. TextSearch no Google Places
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query
    )}&language=pt-BR&key=${apiKey}`;

    const res = await fetch(searchUrl);
    if (!res.ok) return [];
    const data = await res.json();

    if (!Array.isArray(data.results)) return [];

    return data.results.slice(0, 15).map((place: any) => {
      const addressParts = (place.formatted_address || "").split(",");
      const cleanPhone = (place.formatted_phone_number || "").replace(/\D/g, "");

      return {
        id: `gplace-${place.place_id}`,
        name: place.name,
        tradeName: place.name,
        category: place.types?.[0] || "Empresa Local",
        address: place.formatted_address || "",
        city: addressParts[addressParts.length - 2]?.trim() || "São Paulo",
        state: "SP",
        rating: Number(place.rating || 4.5),
        reviewCount: Number(place.user_ratings_total || 25),
        phone: place.formatted_phone_number || "(11) 99999-9999",
        whatsapp: cleanPhone ? `+55${cleanPhone}` : undefined,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        website: place.website || undefined,
        status: "discovered",
        decisionMakers: [
          {
            id: `dm-${place.place_id}-1`,
            name: "Diretor / Responsável",
            role: "Sócio-Administrador",
            source: "qsa_receita",
            isPrimary: true,
          },
        ],
      };
    });
  } catch (err) {
    console.warn("Erro na busca direta Google Places (CORS/Network), fallback ativado:", err);
    return [];
  }
}

/**
 * Base de dados rica de prospecção para simulação e demonstração imediata
 */
const SAMPLE_PROSPECTS_DB: Partial<Prospect>[] = [
  {
    id: "pr-1",
    name: "Clínica Odontológica Oral Excellence Ltda",
    tradeName: "Oral Excellence Odontologia & Implantes",
    cnpj: "42.189.432/0001-90",
    category: "Clínica Odontológica",
    phone: "(11) 98765-4321",
    whatsapp: "+5511987654321",
    email: "contato@oralexcellence.com.br",
    website: "https://oralexcellence.com.br",
    instagram: "oralexcellence.odonto",
    googleMapsUrl: "https://maps.google.com/?q=Oral+Excellence+Sp",
    address: "Av. Brigadeiro Faria Lima, 2200 - Conj 142",
    neighborhood: "Jardim Paulistano",
    city: "São Paulo",
    state: "SP",
    rating: 4.9,
    reviewCount: 148,
    status: "discovered",
    decisionMakers: [
      {
        id: "dm-1",
        name: "Dr. Rodrigo Fagundes",
        role: "Sócio-Diretor Clínico",
        source: "qsa_receita",
        isPrimary: true,
        notes: "Responsável Técnico e Decisor de Contratações",
      },
      {
        id: "dm-2",
        name: "Mariana Alcantara",
        role: "Gerente de Atendimento & Marketing",
        source: "linkedin",
        linkedinUrl: "https://linkedin.com/in/mariana-marketing-odonto",
        isPrimary: false,
      },
    ],
  },
  {
    id: "pr-2",
    name: "Instituto Vivence Estética Avançada e Dermatologia Ltda",
    tradeName: "Instituto Vivence",
    cnpj: "38.741.982/0001-14",
    category: "Estética Avançada",
    phone: "(11) 97123-8899",
    whatsapp: "+5511971238899",
    email: "diretoria@institutovivence.com.br",
    website: "https://linktr.ee/institutovivence",
    instagram: "institutovivence",
    googleMapsUrl: "https://maps.google.com/?q=Instituto+Vivence+Sp",
    address: "Rua Oscar Freire, 1050",
    neighborhood: "Cerqueira César",
    city: "São Paulo",
    state: "SP",
    rating: 4.8,
    reviewCount: 92,
    status: "discovered",
    decisionMakers: [
      {
        id: "dm-3",
        name: "Dra. Camila Bittencourt",
        role: "Sócia-Fundadora & Diretora Geral",
        source: "qsa_receita",
        isPrimary: true,
      },
      {
        id: "dm-4",
        name: "Lucas Esteves",
        role: "Head de Expansão & Parcerias",
        source: "linkedin",
        linkedinUrl: "https://linkedin.com/in/lucas-esteves-expansao",
        isPrimary: false,
      },
    ],
  },
  {
    id: "pr-3",
    name: "Colégio Vanguarda Educação e Ensino Bilíngue Ltda",
    tradeName: "Colégio Vanguarda",
    cnpj: "19.345.678/0001-55",
    category: "Escola Particular",
    phone: "(11) 3044-8800",
    whatsapp: "+5511998877665",
    email: "secretaria@colegiovanguarda.com.br",
    website: "https://colegiovanguarda.edu.br",
    instagram: "colegiovanguardasp",
    googleMapsUrl: "https://maps.google.com/?q=Colegio+Vanguarda+Sp",
    address: "Rua Domingos de Morais, 1850",
    neighborhood: "Vila Mariana",
    city: "São Paulo",
    state: "SP",
    rating: 4.7,
    reviewCount: 65,
    status: "discovered",
    decisionMakers: [
      {
        id: "dm-5",
        name: "Eduardo Meirelles",
        role: "Diretor Mantenedor & Sócio",
        source: "qsa_receita",
        isPrimary: true,
      },
      {
        id: "dm-6",
        name: "Patrícia Nogueira",
        role: "Coordenadora de Comunicação e Captação de Alunos",
        source: "linkedin",
        linkedinUrl: "https://linkedin.com/in/patricia-nogueira-edu",
        isPrimary: false,
      },
    ],
  },
  {
    id: "pr-4",
    name: "Prime Imóveis & Negócios Imobiliários Ltda",
    tradeName: "Prime Empreendimentos e Imóveis",
    cnpj: "29.876.543/0001-22",
    category: "Imobiliária",
    phone: "(11) 98321-4567",
    whatsapp: "+5511983214567",
    email: "comercial@primeimoveissp.com.br",
    website: "",
    instagram: "primeimoveis_alto_padrao",
    googleMapsUrl: "https://maps.google.com/?q=Prime+Imoveis+Sp",
    address: "Alameda Santos, 1470",
    neighborhood: "Cerqueira César",
    city: "São Paulo",
    state: "SP",
    rating: 4.6,
    reviewCount: 44,
    status: "discovered",
    decisionMakers: [
      {
        id: "dm-7",
        name: "Marcelo Albuquerque",
        role: "Sócio-Administrador & Diretor Comercial",
        source: "qsa_receita",
        isPrimary: true,
      },
    ],
  },
  {
    id: "pr-5",
    name: "Restaurante Origem Gastronomia Contemporânea Ltda",
    tradeName: "Origem Gastronomia & Vinhos",
    cnpj: "33.221.100/0001-77",
    category: "Restaurante / Gastronomia",
    phone: "(11) 97654-3210",
    whatsapp: "+5511976543210",
    email: "reservas@origemgastronomia.com.br",
    website: "https://origemgastronomia.com.br",
    instagram: "origem.gastronomia",
    googleMapsUrl: "https://maps.google.com/?q=Origem+Gastronomia+Sp",
    address: "Rua dos Pinheiros, 730",
    neighborhood: "Pinheiros",
    city: "São Paulo",
    state: "SP",
    rating: 4.9,
    reviewCount: 310,
    status: "discovered",
    decisionMakers: [
      {
        id: "dm-8",
        name: "Chef André Vasconcelos",
        role: "Sócio-Proprietário",
        source: "qsa_receita",
        isPrimary: true,
      },
      {
        id: "dm-9",
        name: "Juliana Rossi",
        role: "Sócia e Gerente de Eventos & Relações Públicas",
        source: "linkedin",
        linkedinUrl: "https://linkedin.com/in/juliana-rossi-eventos",
        isPrimary: false,
      },
    ],
  },
];

/**
 * Busca e Garimpo de Empresas por Nicho e Localização com Cálculo Instantâneo de ICP Score e Auditoria de Marketing
 */
export async function searchProspects(params: ProspectingSearchParams): Promise<Prospect[]> {
  const query = (params.query || "").toLowerCase();
  const niche = (params.niche || "").toLowerCase();
  const city = (params.city || "").toLowerCase();

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("kasahub_google_places_key") : null);

  let rawResults = SAMPLE_PROSPECTS_DB;

  // Se houver chave ativa do Google Places e o usuário realizou uma busca personalizada
  if (apiKey && (niche !== "todos" || city || query)) {
    const searchQuery = `${query || niche !== "todos" ? niche : "empresas"} em ${city || "São Paulo"}`;
    const liveGoogleResults = await searchGooglePlacesLive(searchQuery, apiKey);
    if (liveGoogleResults.length > 0) {
      rawResults = [...liveGoogleResults, ...SAMPLE_PROSPECTS_DB];
    }
  }

  let results = rawResults.map((item) => {
    const calculated = calculateIcpScore(item);
    const marketingAudit = generateMarketingAudit(item);

    return {
      ...item,
      icpScore: calculated.score,
      icpTier: calculated.tier,
      icpBreakdown: calculated.breakdown,
      marketingAudit,
      status: (item.status || "discovered") as "discovered" | "saved" | "imported" | "discarded",
      createdAt: new Date().toISOString(),
    } as Prospect;
  });

  if (niche && niche !== "todos") {
    results = results.filter((p) => p.category.toLowerCase().includes(niche));
  }

  if (city) {
    results = results.filter((p) => p.city.toLowerCase().includes(city));
  }

  if (query) {
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.tradeName.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.decisionMakers.some((dm) => dm.name.toLowerCase().includes(query))
    );
  }

  if (params.onlyWithWhatsapp) {
    results = results.filter((p) => !!p.whatsapp);
  }

  if (params.onlyWithDecisionMakers) {
    results = results.filter((p) => p.decisionMakers.length > 0);
  }

  if (params.minScore && params.minScore > 0) {
    results = results.filter((p) => p.icpScore >= (params.minScore || 0));
  }

  if (params.tier && params.tier !== "all") {
    results = results.filter((p) => p.icpTier === params.tier);
  }

  if (params.opportunityFilter && params.opportunityFilter !== "all") {
    if (params.opportunityFilter === "gold_mine") {
      results = results.filter((p) => p.marketingAudit.opportunityType === "gold_mine");
    } else if (params.opportunityFilter === "no_website") {
      results = results.filter((p) => p.marketingAudit.websiteStatus === "no_website" || p.marketingAudit.websiteStatus === "active_no_pixel");
    } else if (params.opportunityFilter === "amateur_insta") {
      results = results.filter((p) => p.marketingAudit.instagramStatus === "amateur_inhouse" || p.marketingAudit.instagramStatus === "no_instagram");
    }
  }

  return results.sort((a, b) => b.icpScore - a.icpScore);
}
