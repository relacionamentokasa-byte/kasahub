import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/p/$token")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/proposta/$token", params });
  },
});
