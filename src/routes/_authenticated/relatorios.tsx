import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — KASA HUB" }] }),
  component: () => <div className="p-10 text-foreground/40 italic">Relatórios simplificados em breve.</div>,
});
