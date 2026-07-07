import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Play, Presentation as PresentationIcon, Loader2 } from "lucide-react";
import { fetchPresentations } from "@/lib/presentations-api";
import { Button } from "@/components/ui/button";

export function ClientPresentationsPanel({ clientId }: { clientId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["presentations"],
    queryFn: fetchPresentations,
  });

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="size-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  const active = data.filter((p) => p.is_active);

  if (active.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl">
        <PresentationIcon className="size-8 mx-auto text-foreground/30 mb-3" />
        <p className="text-sm text-foreground/60 font-medium">
          Nenhuma apresentação criada ainda.
        </p>
        <p className="text-xs text-foreground/40 mt-1">
          Vá em <span className="font-semibold">Configurações → Apresentações</span> para
          montar sua primeira.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl font-bold">Apresentações</h3>
        <p className="text-sm text-foreground/50 mt-1">
          Escolha uma apresentação para exibir em tela cheia para o cliente. As
          cores e o logo dele são aplicados automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {active.map((p) => (
          <div
            key={p.id}
            className="group border border-border rounded-2xl p-5 bg-surface hover:border-primary/50 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center shrink-0">
                <PresentationIcon className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-foreground/50 mt-0.5 line-clamp-2">
                    {p.description}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button asChild size="sm" className="gap-2 rounded-full">
                <Link
                  to="/apresentacoes/$presentationId/apresentar"
                  params={{ presentationId: p.id }}
                  search={{ clientId }}
                >
                  <Play className="size-3.5" /> Apresentar
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
