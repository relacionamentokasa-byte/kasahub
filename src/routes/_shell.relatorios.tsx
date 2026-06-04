import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ModuleEmpty } from "@/components/ModuleEmpty";

export const Route = createFileRoute("/_shell/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — KASA OS" }] }),
  component: () => (
    <ModuleEmpty
      icon={BarChart3}
      eyebrow="Gestão · Fase 6"
      title="Relatórios & Dashboard CEO"
      description="Relatórios financeiros, comerciais, operacionais e por cliente. Dashboard CEO restrita com MRR, ARR, lucro líquido, rentabilidade e top clientes."
      phase="Fase 6"
      bullets={[
        "Exportação CSV e PDF",
        "Recorte por cliente, período ou equipe",
        "Dashboard CEO com acesso restrito",
        "Gráficos profissionais (Recharts)",
      ]}
    />
  ),
});
