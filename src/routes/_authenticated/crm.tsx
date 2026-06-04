import { createFileRoute } from "@tanstack/react-router";
import { CrmBoard } from "@/components/crm/CrmBoard";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({ meta: [{ title: "CRM — KASA OS" }] }),
  component: CrmBoard,
});
