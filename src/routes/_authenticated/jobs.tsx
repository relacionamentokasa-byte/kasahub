import { createFileRoute } from "@tanstack/react-router";
import { JobsBoard } from "@/components/jobs/JobsBoard";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — KASA HUB" }] }),
  component: () => (
    <div className="pb-20 md:pb-0 h-full">
      <JobsBoard title="Jobs da agência" eyebrow="Operação · Jobs" />
    </div>
  ),
});
