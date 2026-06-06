import { createFileRoute } from "@tanstack/react-router";
import { JobsBoard } from "@/components/jobs/JobsBoard";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — KASA HUB" }] }),
  component: () => <JobsBoard title="Tarefas da agência" eyebrow="Operação · Tarefas" />,
});
