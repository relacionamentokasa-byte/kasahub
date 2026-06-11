import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — KASA HUB" }] }),
  component: () => <div className="p-10 text-foreground/40 italic">Listagem de clientes simplificada em breve.</div>,
});
