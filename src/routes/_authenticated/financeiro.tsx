import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ModuleEmpty } from "@/components/ModuleEmpty";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — KASA OS" }] }),
  component: () => (
    <ModuleEmpty
      icon={Wallet}
      eyebrow="Gestão · Fase 5"
      title="Gestão financeira completa"
      description="Contratos mensais, jobs avulsos, parcelamentos, recorrências, contas a pagar/receber, fluxo de caixa e contas bancárias com saldo consolidado."
      phase="Fase 5"
      bullets={[
        "Contas bancárias com saldo consolidado",
        "Contratos recorrentes e jobs avulsos",
        "Fluxo de caixa e DRE",
        "Ticket Médio, MRR, ARR e Receita Extra automáticos",
      ]}
    />
  ),
});
