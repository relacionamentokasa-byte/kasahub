import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";
import { ModuleEmpty } from "@/components/ModuleEmpty";

export const Route = createFileRoute("/_authenticated/projetos")({
  head: () => ({ meta: [{ title: "Projetos — KASA OS" }] }),
  component: () => (
    <ModuleEmpty
      icon={FolderKanban}
      eyebrow="Operação · Fase 4"
      title="Projetos da agência"
      description="Briefing, equipe, prazos e progresso calculado automaticamente a partir dos Jobs vinculados."
      phase="Fase 4"
      bullets={[
        "Briefing estruturado",
        "Equipe e responsável",
        "Progresso automático via Jobs",
        "Prazos e marcos visíveis no calendário",
      ]}
    />
  ),
});
