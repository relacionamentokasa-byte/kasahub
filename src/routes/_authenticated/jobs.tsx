import { createFileRoute } from "@tanstack/react-router";
import { JobsBoard } from "@/components/jobs/JobsBoard";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — KASA HUB" }] }),
  component: () => (
    <div className="pb-20 md:pb-0 h-full">
      <JobsBoard title="Tarefas da agência" eyebrow="Operação · Tarefas" />
    </div>
  ),
});
