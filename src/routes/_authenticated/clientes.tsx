import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — KASA HUB" }] }),
  component: () => <Outlet />,
});

