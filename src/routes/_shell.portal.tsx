import { createFileRoute } from "@tanstack/react-router";
import { Globe } from "lucide-react";
import { ModuleEmpty } from "@/components/ModuleEmpty";

export const Route = createFileRoute("/_shell/portal")({
  head: () => ({ meta: [{ title: "Portal do Cliente — KASA OS" }] }),
  component: () => (
    <ModuleEmpty
      icon={Globe}
      eyebrow="Experiência · Fase 7"
      title="Portal Kasa × Cliente"
      description="Cada cliente terá um portal exclusivo personalizado com seu branding, dashboard de entregas, calendário, projetos ativos e feed de aprovações estilo Instagram."
      phase="Fase 7"
      bullets={[
        "Branding personalizado por cliente",
        "Feed de aprovações em grid (estilo Instagram)",
        "Versionamento e histórico de cada peça",
        "Calendário integrado com Google Agenda",
      ]}
    />
  ),
});
