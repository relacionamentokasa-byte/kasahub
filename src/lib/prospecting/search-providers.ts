import type { Prospect, DecisionMaker, ProspectingSearchParams } from "./types";
import { calculateIcpScore } from "./icp-scoring";

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

    // Mapeia os Sócios e Administradores da Receita Federal
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
 * Base de dados rica de prospecção para simulação e demonstração imediata
 * (Conectada com dados reais de mercado para clínicas, escolas, imobiliárias, estética e indústrias)
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
    website: "https://institutovivence.com.br",
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
    website: "https://primeimoveissp.com.br",
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
 * Busca e Garimpo de Empresas por Nicho e Localização com Cálculo Instantâneo de ICP Score
 */
export async function searchProspects(params: ProspectingSearchParams): Promise<Prospect[]> {
  // Simula latência de consulta a APIs externas
  await new Promise((resolve) => setTimeout(resolve, 600));

  const query = (params.query || "").toLowerCase();
  const niche = (params.niche || "").toLowerCase();
  const city = (params.city || "").toLowerCase();

  let results = SAMPLE_PROSPECTS_DB.map((item) => {
    const calculated = calculateIcpScore(item);
    return {
      ...item,
      icpScore: calculated.score,
      icpTier: calculated.tier,
      icpBreakdown: calculated.breakdown,
      status: (item.status || "discovered") as "discovered" | "saved" | "imported" | "discarded",
      createdAt: new Date().toISOString(),
    } as Prospect;
  });

  // Filtros dinâmicos
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

  // Ordena por Score ICP decrescente (Hot primeiro)
  return results.sort((a, b) => b.icpScore - a.icpScore);
}
