import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NewsCategory = 
  | "Geral"
  | "Marketing Digital" 
  | "Negócios" 
  | "Redes Sociais" 
  | "E-commerce" 
  | "IA & Tecnologia";

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: string;
  category: NewsCategory;
}

const CATEGORY_MAP: Record<string, NewsCategory> = {
  marketing: "Marketing Digital",
  business: "Negócios",
  social: "Redes Sociais",
  ecommerce: "E-commerce",
  technology: "IA & Tecnologia",
  ai: "IA & Tecnologia"
};

const NEWS_API_URL = "https://newsapi.org/v2/everything";

export async function fetchNews(): Promise<{ articles: NewsArticle[], lastUpdate: string }> {
  try {
    // Primeiro tenta pegar do env (setado via secrets tool)
    let apiKey = import.meta.env.VITE_NEWS_API_KEY || (window as any).process?.env?.VITE_NEWS_API_KEY;
    
    // Se não estiver no env, tenta buscar das configurações da agência como fallback
    if (!apiKey) {
      const { data: secrets } = await supabase
        .from("agency_settings")
        .select("integrations")
        .limit(1)
        .maybeSingle();

      apiKey = (secrets?.integrations as any)?.news_api_key;
    }
    
    // Se ainda não tiver chave, usamos um mock para não quebrar a tela conforme solicitado (fallback)
    if (!apiKey) {
      console.warn("NewsAPI key not found. Returning mock data.");
      return getMockNews();
    }

    const queries = [
      "marketing digital",
      "negócios digitais",
      "redes sociais",
      "e-commerce",
      "inteligência artificial"
    ];

    const response = await fetch(
      `${NEWS_API_URL}?q=${encodeURIComponent(queries.join(" OR "))}&language=pt&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch news from NewsAPI");
    }

    const data = await response.json();
    
    const articles: NewsArticle[] = data.articles.map((item: any, index: number) => {
      const titleLower = item.title.toLowerCase();
      const descLower = item.description?.toLowerCase() || "";
      
      let category: NewsCategory = "Geral";
      if (titleLower.includes("marketing") || descLower.includes("marketing")) category = "Marketing Digital";
      else if (titleLower.includes("negócio") || descLower.includes("empresa")) category = "Negócios";
      else if (titleLower.includes("rede social") || titleLower.includes("instagram") || titleLower.includes("tiktok")) category = "Redes Sociais";
      else if (titleLower.includes("e-commerce") || titleLower.includes("venda online")) category = "E-commerce";
      else if (titleLower.includes("ia") || titleLower.includes("tecnologia") || titleLower.includes("artificial")) category = "IA & Tecnologia";

      return {
        id: `news-${index}`,
        title: item.title,
        description: item.description,
        url: item.url,
        urlToImage: item.urlToImage,
        publishedAt: item.publishedAt,
        source: item.source.name,
        category
      };
    });

    return {
      articles,
      lastUpdate: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error fetching news:", error);
    return getMockNews();
  }
}

function getMockNews(): { articles: NewsArticle[], lastUpdate: string } {
  return {
    articles: [
      {
        id: "mock-1",
        title: "Tendências do Marketing Digital para 2026",
        description: "Descubra as principais estratégias que estão dominando o mercado de marketing digital este ano.",
        url: "#",
        urlToImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop",
        publishedAt: new Date().toISOString(),
        source: "Kasa News",
        category: "Marketing Digital"
      },
      {
        id: "mock-2",
        title: "O Impacto da IA na Criação de Conteúdo",
        description: "Como as novas ferramentas de inteligência artificial estão transformando a produtividade das agências.",
        url: "#",
        urlToImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2232&auto=format&fit=crop",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: "Tech Insights",
        category: "IA & Tecnologia"
      },
      {
        id: "mock-3",
        title: "E-commerce brasileiro cresce 15% no primeiro trimestre",
        description: "Dados mostram que o setor de vendas online continua em forte expansão no Brasil.",
        url: "#",
        urlToImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2340&auto=format&fit=crop",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: "InfoMoney",
        category: "E-commerce"
      }
    ],
    lastUpdate: new Date().toISOString()
  };
}
