import { createFileRoute } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";
import { ModuleEmpty } from "@/components/ModuleEmpty";

export const Route = createFileRoute("/_shell/equipe")({
  head: () => ({ meta: [{ title: "Equipe — KASA OS" }] }),
  component: () => (
    <ModuleEmpty
      icon={UsersRound}
      eyebrow="Gestão · Fase 2"
      title="Equipe & permissões"
      description="Cadastro de membros da equipe, papéis (admin, gestor, operador, cliente) e atribuição por módulo."
      phase="Fase 2"
      bullets={[
        "Convite por e-mail",
        "Papéis com permissões granulares",
        "Times e responsáveis por projeto",
        "Auditoria de ações",
      ]}
    />
  ),
});
