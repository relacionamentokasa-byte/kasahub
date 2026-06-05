import { createFileRoute } from "@tanstack/react-router";
import { JobsBoard } from "@/components/jobs/JobsBoard";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — KASA OS" }] }),
  component: () => <JobsBoard title="Jobs da agência" eyebrow="Operação · Jobs" />,
});
