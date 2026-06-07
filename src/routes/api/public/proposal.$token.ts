import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/proposal/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        return Response.json({ message: "Hello from API simplified", token: params.token });
      },
      POST: async () => {
        return Response.json({ ok: true });
      }
    }
  }
});
