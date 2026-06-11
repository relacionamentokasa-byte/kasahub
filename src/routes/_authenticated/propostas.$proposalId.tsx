import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/propostas.$proposalId")({
  head: () => ({ meta: [{ title: "Proposta — KASA HUB" }] }),
  component: () => <div className="p-10 text-foreground/40 italic">Detalhes da proposta simplificados em breve.</div>,
});
