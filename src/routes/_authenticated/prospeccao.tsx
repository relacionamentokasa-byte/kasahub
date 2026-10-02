import { createFileRoute } from "@tanstack/react-router";
import { ProspectingView } from "@/components/prospecting/ProspectingView";

export const Route = createFileRoute("/_authenticated/prospeccao")({
  head: () => ({ meta: [{ title: "Garimpo & Prospecção — KASA HUB" }] }),
  component: ProspectingView,
});
