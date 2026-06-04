import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ModuleEmpty } from "@/components/ModuleEmpty";

export const Route = createFileRoute("/_authenticated/propostas")({
  head: () => ({ meta: [{ title: "Propostas — KASA OS" }] }),
  component: () => (
    <ModuleEmpty
      icon={FileText}
      eyebrow="Comercial · Fase 3"
      title="Construtor de propostas"
      description="Templates personalizáveis com destaque para o Investimento Mensal, geração de PDF profissional, assinatura digital e envio por e-mail ou WhatsApp."
      phase="Fase 3"
      bullets={[
        "Templates com identidade Kasa",
        "Destaque para Investimento Mensal",
        "PDF + link compartilhável",
        "Assinatura digital com aceite e timestamp",
      ]}
    />
  ),
});
