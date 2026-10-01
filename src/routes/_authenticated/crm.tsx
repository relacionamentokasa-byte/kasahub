import { createFileRoute } from "@tanstack/react-router";
import { CrmBoard } from "@/components/crm/CrmBoard";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({ meta: [{ title: "CRM — KASA HUB" }] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    status?: "all" | "stalled" | "with_tasks" | "overdue";
    owner?: string;
    source?: string;
  } => ({
    status: (s.status as any) || undefined,
    owner: (s.owner as string) || undefined,
    source: (s.source as string) || undefined,
  }),
  component: CrmBoard,
});

