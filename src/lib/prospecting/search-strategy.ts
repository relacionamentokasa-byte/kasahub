/**
 * Mapeamento Estratégico de Pólos Comerciais, Zonas Industriais e Sinônimos por Nicho
 * Utilizado pelo motor de busca para garimpar empresas reais em diferentes bairros e nichos específicos
 */

export interface CommercialHub {
  zoneName: string;
  districts: string[];
}

export interface CityHubConfig {
  city: string;
  uf: string;
  hubs: CommercialHub[];
}

// Principais pólos comerciais e industriais por cidade para varredura multi-zona
export const CITY_COMMERCIAL_HUBS: Record<string, CommercialHub[]> = {
  "são paulo": [
    { zoneName: "Centro Expandido & Financeiro", districts: ["Jardins", "Itaim Bibi", "Pinheiros", "Vila Olímpia", "Paulista", "Bela Vista"] },
    { zoneName: "Zona Sul & Berrini", districts: ["Moema", "Campo Belo", "Brooklin", "Chácara Santo Antônio", "Santo Amaro"] },
    { zoneName: "Zona Leste & Tatuapé", districts: ["Tatuapé", "Anália Franco", "Mooca", "Vila Prudente"] },
    { zoneName: "Zona Oeste & Perdizes", districts: ["Perdizes", "Pompeia", "Lapa", "Vila Leopoldina", "Barra Funda"] },
    { zoneName: "Zona Norte & Santana", districts: ["Santana", "Tucuruvi", "Casa Verde", "Vila Guilherme"] },
    { zoneName: "Grande SP & Industrial", districts: ["Alphaville", "Barueri", "Osasco", "São Bernardo do Campo", "Santo André", "Guarulhos"] },
  ],
  "rio de janeiro": [
    { zoneName: "Zona Sul Nobre", districts: ["Ipanema", "Leblon", "Copacabana", "Botafogo", "Flamengo"] },
    { zoneName: "Barra & Recreio", districts: ["Barra da Tijuca", "Recreio dos Bandeirantes", "Jardim Oceânico"] },
    { zoneName: "Centro & Porto Maravilha", districts: ["Centro", "Lapa", "Glória"] },
    { zoneName: "Zona Norte Comercial", districts: ["Tijuca", "Méier", "Vila Isabel"] },
    { zoneName: "Baixada & Industrial", districts: ["Duque de Caxias", "Nova Iguaçu", "Niterói", "São Gonçalo"] },
  ],
  "goiânia": [
    { zoneName: "Pólo Nobre & Consultórios", districts: ["Setor Bueno", "Setor Marista", "Setor Sul", "Setor Oeste"] },
    { zoneName: "Zona Leste Comercial", districts: ["Jardim Goiás", "Alto da Glória", "Setor Bela Vista"] },
    { zoneName: "Centro & Moda / Atacado", districts: ["Setor Central", "Setor Norte Ferroviário", "Setor Campinas", "Setor Coimbra"] },
    { zoneName: "Pólo Industrial & Distribuição", districts: ["Pólo Empresarial Goiás", "Jardim Guanabara", "Aparecida de Goiânia"] },
  ],
  "curitiba": [
    { zoneName: "Pólo Central & Batel", districts: ["Batel", "Centro", "Bigorrilho / Champagnat", "Mercês"] },
    { zoneName: "Centro Cívico & Juvevê", districts: ["Centro Cívico", "Juvevê", "Cabral", "Alto da Glória", "Ahú"] },
    { zoneName: "Zona Sul & Portão", districts: ["Portão", "Água Verde", "Vila Izabel", "Novo Mundo"] },
    { zoneName: "Cidade Industrial (CIC)", districts: ["CIC - Cidade Industrial", "Pinhais", "São José dos Pinhais", "Araucária"] },
  ],
  "belo horizonte": [
    { zoneName: "Pólo Centro-Sul & Savassi", districts: ["Savassi", "Lourdes", "Funcionários", "Santo Agostinho"] },
    { zoneName: "Zona Sul & Belvedere", districts: ["Belvedere", "Mangabeiras", "Sion", "Anchieta"] },
    { zoneName: "Pampulha & Castelo", districts: ["Pampulha", "Castelo", "Ouro Preto", "Buritis"] },
    { zoneName: "Industrial & Contagem", districts: ["Contagem", "Betim", "Barreiro"] },
  ],
  "porto alegre": [
    { zoneName: "Moinhos & Bela Vista", districts: ["Moinhos de Vento", "Bela Vista", "Mont'Serrat", "Petrópolis"] },
    { zoneName: "Centro & Menino Deus", districts: ["Centro Histórico", "Menino Deus", "Praia de Belas", "Cidade Baixa"] },
    { zoneName: "Zona Norte & Boulevard", districts: ["Passo d'Areia", "Higienópolis", "São João", "Floresta"] },
    { zoneName: "Região Metropolitana / Pólo", districts: ["Canoas", "Novo Hamburgo", "São Leopoldo", "Caxias do Sul"] },
  ],
  "brasília": [
    { zoneName: "Asa Sul & Clínicas", districts: ["Asa Sul", "Setor Hospitalar Sul", "Setor Comercial Sul"] },
    { zoneName: "Asa Norte & Negócios", districts: ["Asa Norte", "Setor Hospitalar Norte", "Setor Comercial Norte"] },
    { zoneName: "Águas Claras & Sudoeste", districts: ["Sudoeste", "Noroeste", "Águas Claras", "Taguatinga"] },
    { zoneName: "Pólo Industrial & Logística", districts: ["SIA - Setor de Indústria e Abastecimento", "SCIA", "Ceilândia"] },
  ],
  "campinas": [
    { zoneName: "Cambuí & Centro", districts: ["Cambuí", "Centro", "Guanabara", "Nova Campinas"] },
    { zoneName: "Taquaral & Mansões", districts: ["Taquaral", "Mansões Santo Antônio", "Barão Geraldo"] },
    { zoneName: "Pólo Industrial & Rodovias", districts: ["Aparecidinha", "Distrito Industrial", "Sumaré", "Hortolândia", "Indaiatuba"] },
  ],
  "florianópolis": [
    { zoneName: "Centro & Beira-Mar", districts: ["Centro", "Agronômica", "Trindade", "Itacorubi"] },
    { zoneName: "Norte da Ilha & Tecnologia", districts: ["Saco Grande", "Jurerê Internacional", "Canasvieiras"] },
    { zoneName: "Continente & Industrial", districts: ["Estreito", "Coqueiros", "Kobrasol", "São José", "Palhoça"] },
  ],
};

// Termos específicos de alto ticket para expandir a busca e encontrar empresas de valor
export const NICHE_SYNONYMS_EXPANSION: Record<string, string[]> = {
  "cosméticos": [
    "indústria de cosméticos",
    "fábrica de cosméticos e dermocosméticos",
    "distribuidora de cosméticos profissional",
    "produtos para estética e beleza atacado",
    "marca de cosméticos e perfumaria",
    "laboratório dermocosméticos",
  ],
  "epi": [
    "distribuidora de epis",
    "equipamentos de proteção individual",
    "segurança do trabalho e uniformes industriais",
    "fabricante de epi e calçados de segurança",
    "comércio de extintores e proteção contra incêndio",
  ],
  "indústria": [
    "indústria e comércio",
    "fábrica de produtos",
    "fabricante e usinagem",
    "metalúrgica e estamparia",
    "indústria química e embalagens",
    "transformação plástica e moldes",
  ],
  "distribuidora atacado": [
    "distribuidora de produtos",
    "atacado e representações",
    "comércio atacadista e importadora",
    "distribuidor autorizado",
    "logística e distribuição",
  ],
  "odontológica": [
    "clínica odontológica implantes",
    "ortodontia e estética dental",
    "instituto odontológico e reabilitação oral",
    "harmonização orofacial e lentes de contato",
    "consultório odontológico premium",
  ],
  "estética": [
    "clínica de estética avançada",
    "dermatologia e estética médica",
    "cirurgia plástica e rejuvenescimento",
    "estética corporal e facial de alta tecnologia",
    "biomedicina estética e laser",
  ],
  "escola": [
    "colégio particular ensino bilíngue",
    "escola de ensino fundamental e médio",
    "educação infantil e berçário premium",
    "instituto educacional e cursos técnicos",
  ],
  "imobiliária": [
    "imobiliária alto padrão e lançamentos",
    "construtora e incorporadora",
    "gestão de patrimônio imobiliário",
    "venda de imóveis e loteamentos",
  ],
  "gastronomia": [
    "restaurante contemporâneo e bistrô",
    "churrascaria e parrilla premium",
    "gastronomia internacional e sushi bar",
    "buffet para eventos e corporativo",
  ],
  "varejo": [
    "loja conceito e boutique",
    "móveis planejados e decoração alto padrão",
    "iluminação e arquitetura comercial",
    "vestuário e alfaiataria",
  ],
};

/**
 * Gera uma lista estratégica de queries de busca distribuídas por zonas e sinônimos
 */
export function buildStrategicSearchQueries(opts: {
  city: string;
  niche: string;
  businessModel?: string;
  customQuery?: string;
  deepScan?: boolean;
}): string[] {
  const { city, niche, businessModel, customQuery, deepScan } = opts;
  const cleanCity = city.split(",")[0].trim();
  const cityKey = cleanCity.toLowerCase();
  const queries: string[] = [];

  const baseNiche = niche && niche !== "todos" ? niche.toLowerCase() : "";

  // 1. Termos de sinônimos baseados no nicho
  let synonymTerms: string[] = [];
  if (baseNiche) {
    const foundKey = Object.keys(NICHE_SYNONYMS_EXPANSION).find((k) => baseNiche.includes(k));
    if (foundKey) {
      synonymTerms = NICHE_SYNONYMS_EXPANSION[foundKey];
    }
  }

  // 2. Modificadores baseados no modelo de negócio
  let modelPrefix = "";
  if (businessModel === "industria_fabricante") {
    modelPrefix = "indústria fabricante de";
  } else if (businessModel === "distribuidora_atacado") {
    modelPrefix = "distribuidora atacado de";
  } else if (businessModel === "servicos_clinicas") {
    modelPrefix = "clínica especializada";
  }

  // 3. Obter bairros/pólos comerciais da cidade
  const cityHubs = CITY_COMMERCIAL_HUBS[cityKey] || [];

  // Query Primária Direta
  const primaryTerm = [customQuery, modelPrefix, baseNiche || "empresas e comércio", cleanCity].filter(Boolean).join(" ");
  queries.push(primaryTerm);

  // Se for busca ampla (deepScan) ou se houver pólos mapeados
  if (cityHubs.length > 0) {
    // Escolhe os 3 principais pólos da cidade para aprofundar a busca
    for (const hub of cityHubs.slice(0, deepScan ? 5 : 3)) {
      const topDistrict = hub.districts[0];
      const secondDistrict = hub.districts[1] || "";

      const term1 = [customQuery, modelPrefix, baseNiche || "empresas", topDistrict, cleanCity].filter(Boolean).join(" ");
      queries.push(term1);

      if (secondDistrict && deepScan) {
        const term2 = [customQuery, baseNiche || "comércio e serviços", secondDistrict, cleanCity].filter(Boolean).join(" ");
        queries.push(term2);
      }
    }
  } else {
    // Para cidades menores sem mapeamento de bairros fixos
    queries.push([customQuery, modelPrefix, baseNiche || "serviços", `centro ${cleanCity}`].filter(Boolean).join(" "));
    queries.push([customQuery, modelPrefix, baseNiche || "comércio", `polo comercial ${cleanCity}`].filter(Boolean).join(" "));
  }

  // Adiciona 2 sinônimos de alto valor se disponíveis
  if (synonymTerms.length > 0) {
    queries.push(`${synonymTerms[0]} em ${cleanCity}`);
    if (synonymTerms[1] && deepScan) {
      queries.push(`${synonymTerms[1]} em ${cleanCity}`);
    }
  }

  // Remove duplicados e queries vazias
  return Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean)));
}
