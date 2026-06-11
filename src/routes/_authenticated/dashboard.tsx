import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard";

import { checkDailyNotifications } from "@/lib/notifications-cron";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Executiva — KASA HUB" },
      { name: "description", content: "Painel de comando da agência." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  useEffect(() => {
    checkDailyNotifications();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-[1600px] mx-auto animate-reveal">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border pb-6 lg:pb-8">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa capitalize font-medium">
            KASA HUB · Inteligência Operacional
          </span>
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight mt-1 lg:mt-2">
            Centro de Comando
          </h1>
          <p className="text-foreground/50 text-xs lg:text-sm mt-1">Bem-vindo de volta. Veja o que precisa de sua atenção.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-3">
          <Link to="/relatorios" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full rounded-full font-semibold h-11 px-6 gap-2">
              <Wallet className="size-4 shrink-0" /> Financeiro
            </Button>
          </Link>

          <Link to="/propostas" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full rounded-full font-semibold h-11 px-6">
              Propostas
            </Button>
          </Link>
          <Link to="/jobs" className="w-full sm:w-auto">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold gap-2 h-11 px-6">
              <Plus className="size-4 shrink-0" /> Job
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
