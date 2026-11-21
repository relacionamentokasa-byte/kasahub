import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StrategicMapWorkspace } from "@/components/clients/strategic/StrategicMapWorkspace";

export const Route = createFileRoute("/_authenticated/gestao/mapa-estrategico")({
  head: () => ({ meta: [{ title: "Mapa Estratégico — KASA HUB" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    clientId: typeof search.clientId === "string" ? search.clientId : undefined,
  }),
  component: StrategicMapRoute,
});

function StrategicMapRoute() {
  const navigate = useNavigate();
  const { clientId } = Route.useSearch();

  function selectClient(nextClientId?: string) {
    navigate({
      to: "/gestao/mapa-estrategico",
      search: { clientId: nextClientId },
      replace: !nextClientId,
    });
  }

  return (
    <div className="pb-20 md:pb-0">
      <StrategicMapWorkspace clientId={clientId} onClientChange={selectClient} />
    </div>
  );
}
