import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ModuleEmpty } from "@/components/ModuleEmpty";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — KASA OS" }] }),
  component: () => (
    <ModuleEmpty
      icon={Users}
      eyebrow="Operação · Fase 4"
      title="Cliente 360°"
      description="A central de consulta do cliente: visão geral, projetos, jobs, propostas, financeiro, calendário, arquivos, timeline e indicadores em um só lugar."
      phase="Fase 4"
      bullets={[
        "Cadastro com branding (logo, cores, banner)",
        "Abas consolidadas de todos os módulos",
        "Indicadores por cliente",
        "Base do Portal do Cliente personalizado",
      ]}
    />
  ),
});
