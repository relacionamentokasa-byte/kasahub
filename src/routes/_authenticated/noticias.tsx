import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Newspaper, RefreshCw, ExternalLink, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchNews, NewsCategory } from "@/lib/news-api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/noticias")({
  head: () => ({
    meta: [
      { title: "Central de Notícias — KASA HUB" },
      { name: "description", content: "Fique por dentro do mercado e do marketing digital." },
    ],
  }),
  component: NewsCentralPage,
});

const CATEGORIES: NewsCategory[] = [
  "Marketing Digital",
  "Negócios",
  "Redes Sociais",
  "E-commerce",
  "IA & Tecnologia"
];

function NewsCentralPage() {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | "Todos">("Todos");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["news"],
    queryFn: fetchNews,
    refetchInterval: 30 * 60 * 1000, // 30 minutos
    staleTime: 15 * 60 * 1000,
  });

  const filteredArticles = useMemo(() => {
    if (!data?.articles) return [];
    if (selectedCategory === "Todos") return data.articles;
    return data.articles.filter(a => a.category === selectedCategory);
  }, [data, selectedCategory]);

  const featuredArticle = useMemo(() => {
    return filteredArticles.length > 0 ? filteredArticles[0] : null;
  }, [filteredArticles]);

  const feedArticles = useMemo(() => {
    return filteredArticles.slice(1);
  }, [filteredArticles]);

  const lastUpdateFormatted = data?.lastUpdate 
    ? new Date(data.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "--:--";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto animate-reveal">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Newspaper className="size-5 text-primary" />
            </div>
            <span className="text-primary text-[10px] font-mono-kasa capitalize font-medium">
              KASA HUB · Hub de Conteúdo
            </span>
          </div>
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight">
            Central de Notícias
          </h1>
          <p className="text-foreground/50 text-xs lg:text-sm mt-1">
            Fique por dentro do mercado e do marketing digital
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono-kasa text-foreground/40">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3" />
            <span>Última atualização: {lastUpdateFormatted}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-2 hover:bg-white/5"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            <span>Atualizar</span>
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedCategory("Todos")}
          className={cn(
            "rounded-full px-4 h-8 text-xs font-medium border border-border/50",
            selectedCategory === "Todos" 
              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
              : "hover:bg-white/5 text-foreground/60"
          )}
        >
          Todos
        </Button>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "rounded-full px-4 h-8 text-xs font-medium border border-border/50 whitespace-nowrap",
              selectedCategory === cat 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "hover:bg-white/5 text-foreground/60"
            )}
          >
            {cat}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <NewsSkeleton />
      ) : (
        <div className="space-y-12">
          {/* Featured Article */}
          {featuredArticle && (
            <section>
              <Card className="overflow-hidden border-none bg-surface/50 group">
                <div className="grid lg:grid-cols-2">
                  <div className="relative aspect-video lg:aspect-auto overflow-hidden">
                    {featuredArticle.urlToImage ? (
                      <img 
                        src={featuredArticle.urlToImage} 
                        alt={featuredArticle.title}
                        className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="size-full bg-muted flex items-center justify-center">
                        <Newspaper className="size-12 text-foreground/10" />
                      </div>
                    )}
                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground font-semibold">
                      Destaque
                    </Badge>
                  </div>
                  <CardContent className="p-8 lg:p-12 flex flex-col justify-center">
                    <span className="text-primary text-xs font-mono-kasa uppercase tracking-widest font-bold mb-4 block">
                      {featuredArticle.category}
                    </span>
                    <h2 className="font-display text-3xl lg:text-5xl font-bold leading-[1.1] mb-6 tracking-tight group-hover:text-primary transition-colors">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-foreground/60 text-base lg:text-lg mb-8 line-clamp-3">
                      {featuredArticle.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-3 text-sm text-foreground/40 font-mono-kasa uppercase tracking-wider">
                        <span>{featuredArticle.source}</span>
                        <span className="size-1 rounded-full bg-foreground/20" />
                        <span>{formatDistanceToNow(new Date(featuredArticle.publishedAt), { addSuffix: true, locale: ptBR })}</span>
                      </div>
                      <Button asChild variant="link" className="text-primary hover:text-primary/80 gap-2 p-0 h-auto font-bold">
                        <a href={featuredArticle.url} target="_blank" rel="noopener noreferrer">
                          Ler mais
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </section>
          )}

          {/* Feed Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {feedArticles.map((article) => (
              <Card key={article.id} className="bg-surface/30 border-border/40 hover:border-primary/40 transition-all duration-300 group flex flex-col h-full">
                <div className="relative aspect-video overflow-hidden">
                  {article.urlToImage ? (
                    <img 
                      src={article.urlToImage} 
                      alt={article.title}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="size-full bg-muted flex items-center justify-center">
                      <Newspaper className="size-8 text-foreground/10" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-[10px] font-bold uppercase py-0 px-2 h-5">
                      {article.category}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3 text-[10px] font-mono-kasa text-foreground/40 uppercase tracking-widest">
                    <span className="font-bold text-foreground/60">{article.source}</span>
                    <span className="size-1 rounded-full bg-foreground/10" />
                    <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: ptBR })}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold leading-snug mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-foreground/50 text-xs line-clamp-3 mb-6">
                    {article.description}
                  </p>
                  <Button asChild variant="outline" size="sm" className="w-full mt-auto rounded-lg border-border/60 hover:border-primary/50 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                      Ler agora
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>

          {filteredArticles.length === 0 && (
            <div className="text-center py-20 bg-surface/20 rounded-2xl border border-dashed border-border/50">
              <TrendingUp className="size-12 text-foreground/10 mx-auto mb-4" />
              <p className="text-foreground/40 font-mono-kasa">Nenhuma notícia encontrada nesta categoria.</p>
            </div>
          )}
        </div>
      )}

      {/* Footer info */}
      <footer className="pt-12 border-t border-border flex justify-between items-center text-[10px] font-mono-kasa text-foreground/30 uppercase tracking-widest">
        <span>KASA Marketing Hub Content</span>
        <span>Powered by NewsAPI</span>
      </footer>
    </div>
  );
}

function NewsSkeleton() {
  return (
    <div className="space-y-12">
      <Skeleton className="w-full aspect-[21/9] rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="space-y-4">
            <Skeleton className="w-full aspect-video rounded-xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
