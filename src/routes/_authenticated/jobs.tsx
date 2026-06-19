import { createFileRoute } from "@tanstack/react-router";
import { JobsBoard } from "@/components/jobs/JobsBoard";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — KASA HUB" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    openJobId: (s.openJobId as string) || (s.jobId as string) || undefined,
    jobId: (s.jobId as string) || undefined,
  }),
  component: JobsRoute,
});

function JobsRoute() {
  const { openJobId } = Route.useSearch();
  return (
    <div className="pb-20 md:pb-0 h-full">
      <JobsBoard title="Jobs da agência" eyebrow="Operação · Jobs" initialOpenId={openJobId} />
    </div>
  );
}
