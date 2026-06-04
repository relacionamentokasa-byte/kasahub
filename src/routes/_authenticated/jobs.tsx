import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";
import { ModuleEmpty } from "@/components/ModuleEmpty";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — KASA OS" }] }),
  component: () => (
    <ModuleEmpty
      icon={CheckSquare}
      eyebrow="Operação · Fase 4"
      title="Sistema operacional de Jobs"
      description="Kanban com etiquetas personalizadas (Planejamento, Criação, Copy, Design, Aprovação, Publicação, Tráfego), comentários, anexos, checklist e menções @nome."
      phase="Fase 4"
      bullets={[
        "Kanban com drag-and-drop",
        "Etiquetas personalizáveis e coloridas",
        "Checklist e anexos",
        "Menções @nome com notificações",
      ]}
    />
  ),
});
