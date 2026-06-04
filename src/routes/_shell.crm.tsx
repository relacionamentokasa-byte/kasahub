import { createFileRoute } from "@tanstack/react-router";
import { KanbanSquare } from "lucide-react";
import { ModuleEmpty } from "@/components/ModuleEmpty";

export const Route = createFileRoute("/_shell/crm")({
  head: () => ({ meta: [{ title: "CRM — KASA OS" }] }),
  component: () => (
    <ModuleEmpty
      icon={KanbanSquare}
      eyebrow="Comercial · Fase 3"
      title="Funil comercial Kasa"
      description="Kanban drag-and-drop com responsáveis, histórico, atividades e gatilho automático para gerar proposta, cliente e projeto ao fechar."
      phase="Fase 3"
      bullets={[
        "Colunas configuráveis com drag-and-drop",
        "Histórico e comentários por lead",
        "Atividades agendadas e lembretes",
        "Gatilho FECHADO → Proposta · Cliente · Projeto · Financeiro",
      ]}
    />
  ),
});
