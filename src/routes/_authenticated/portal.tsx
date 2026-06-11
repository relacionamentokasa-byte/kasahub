import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [{ title: "Portal — KASA HUB" }] }),
  component: () => <div className="p-10 text-foreground/40 italic">Portal simplificado em breve.</div>,
});
