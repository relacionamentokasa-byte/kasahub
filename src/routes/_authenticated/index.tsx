import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard Executiva — KASA HUB" },
      { name: "description", content: "Painel de comando da agência." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto animate-reveal">
      <header className="flex items-end justify-between gap-6 flex-wrap border-b border-border pb-8">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa capitalize font-medium">
            KASA HUB · Inteligência Operacional
          </span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-2">
            Centro de Comando
          </h1>
          <p className="text-foreground/50 text-sm mt-1">Bem-vindo de volta. Veja o que precisa de sua atenção hoje.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/propostas">
            <Button variant="outline" className="rounded-full font-semibold h-10 px-6">
              Ver Propostas
            </Button>
          </Link>
          <Link to="/jobs">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold gap-2 h-10 px-6">
              <Plus className="size-4" /> Nova Tarefa
            </Button>
          </Link>
        </div>
      </header>

      <ExecutiveDashboard />
      
      <footer className="pt-12 border-t border-border flex justify-between items-center text-[10px] font-mono-kasa text-foreground/30 uppercase tracking-widest">
        <span>KASA Marketing Consultoria</span>
        <span>KASA HUB v2.0</span>
      </footer>
    </div>
  );
}
