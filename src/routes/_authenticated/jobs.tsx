import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { JobsBoard } from "@/components/jobs/JobsBoard";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — KASA HUB" }] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    openJobId?: string;
    jobId?: string;
    new?: true;
    clientId?: string;
    launchProductId?: string;
    title?: string;
    description?: string;
    dueDate?: string;
    editorialPostId?: string;
    coverUrl?: string;
  } => ({
    openJobId: (s.openJobId as string) || (s.jobId as string) || undefined,
    jobId: (s.jobId as string) || undefined,
    new: s.new === "1" || s.new === true || s.new === "true" || undefined,
    clientId: (s.clientId as string) || undefined,
    launchProductId: (s.launchProductId as string) || undefined,
    title: (s.title as string) || undefined,
    description: (s.description as string) || undefined,
    dueDate: (s.dueDate as string) || undefined,
    editorialPostId: (s.editorialPostId as string) || undefined,
    coverUrl: (s.coverUrl as string) || undefined,
  }),
  component: JobsRoute,
});

function JobsRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const handleCloseNew = () => {
    navigate({
      to: "/jobs",
      search: (prev: any) => {
        const next = { ...prev };
        delete next.new;
        delete next.title;
        delete next.description;
        delete next.dueDate;
        delete next.editorialPostId;
        delete next.coverUrl;
        return next;
      },
      replace: true,
    });
  };

  return (
    <div className="pb-20 md:pb-0 h-full">
      <JobsBoard
        title="Esta é uma solicitação de implementação de código. Aplique a instrução abaixo gerando os arquivos, componentes, lógica e estilos necessários: por gentileza não mude nenhum titulo a mesmo que seja solicitado, não mude nada que não seja solicitado."
        eyebrow="Operação · Jobs"
        initialOpenId={search.openJobId}
        initialOpenNew={search.new}
        initialClientId={search.clientId}
        initialLaunchProductId={search.launchProductId}
        initialTitle={search.title}
        initialDescription={search.description}
        initialDueDate={search.dueDate}
        initialEditorialPostId={search.editorialPostId}
        initialCoverUrl={search.coverUrl}
        onCloseNew={handleCloseNew}
      />
    </div>
  );
}
