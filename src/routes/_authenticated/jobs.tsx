import { createFileRoute } from "@tanstack/react-router";
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
  }),
  component: JobsRoute,
});

function JobsRoute() {
  const { openJobId, new: openNew, clientId, launchProductId } = Route.useSearch();
  return (
    <div className="pb-20 md:pb-0 h-full">
      <JobsBoard
        title="Jobs da agência"
        eyebrow="Operação · Jobs"
        initialOpenId={openJobId}
        initialOpenNew={openNew}
        initialClientId={clientId}
        initialLaunchProductId={launchProductId}
      />
    </div>
  );
}
