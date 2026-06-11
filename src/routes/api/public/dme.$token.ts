import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/dme/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      },
      POST: async ({ params }) => {
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      },
    },
  },
});
