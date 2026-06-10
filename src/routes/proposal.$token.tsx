import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/proposal/$token")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/proposta/$token", params });
  },
});
