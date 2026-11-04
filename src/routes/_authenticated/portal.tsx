import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [{ title: "Portal do Cliente — Kasa Marketing & Consultoria" }] }),
  component: AuthenticatedPortalPage,
});

function AuthenticatedPortalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md text-center space-y-3 shadow-sm">
        <div className="size-12 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto text-xl font-bold font-display">
          K
        </div>
        <h2 className="font-display font-bold text-lg text-foreground">Portal do Cliente</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Módulo do portal em reformulação.
        </p>
      </div>
    </div>
  );
}
