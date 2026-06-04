import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { ModuleEmpty } from "@/components/ModuleEmpty";

export const Route = createFileRoute("/_shell/config")({
  head: () => ({ meta: [{ title: "Configurações — KASA OS" }] }),
  component: () => (
    <ModuleEmpty
      icon={Settings}
      eyebrow="Sistema · Fase 8"
      title="Configurações da agência"
      description="Dados da agência, integrações (Google Agenda, Resend, WhatsApp), notificações, PWA e personalização visual."
      phase="Fase 8"
      bullets={[
        "Dados e identidade da agência",
        "Integrações OAuth",
        "Preferências de notificações",
        "PWA instalável com ícone Kasa",
      ]}
    />
  ),
});
