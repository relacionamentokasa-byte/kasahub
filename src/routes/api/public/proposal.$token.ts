import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/proposal/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        return Response.redirect(`/api/public/proposta/${params.token}`, 302);
      },
      POST: async ({ params, request }) => {
        // We can't easily redirect a POST with body, so we should ideally point the client to the new URL.
        // But for compatibility, let's just proxy it or return an error pointing to the new one.
        // Actually, let's just return a 307 which should preserve the method and body.
        return Response.redirect(`/api/public/proposta/${params.token}`, 307);
      },
    },
  },
});
