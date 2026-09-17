import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard";
import { InstallPromoCard } from "@/components/pwa/InstallPromoCard";
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 w-full mx-auto animate-reveal">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-4 sm:pb-6">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa uppercase tracking-widest font-semibold">
            KASA Marketing Consultoria
          </span>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mt-0.5">
            Visão Geral
          </h1>
          <p className="text-foreground/60 text-xs mt-0.5">Acompanhe a operação, entregas da equipe e o pulso financeiro.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link to="/relatorios" className="flex-1 sm:flex-initial">
            <Button variant="outline" className="w-full rounded-lg font-medium h-8 px-3 text-xs gap-1.5 border-border/80 hover:bg-muted/60 transition-colors">
              <Wallet className="size-3.5 shrink-0 text-muted-foreground" /> <span className="truncate">Financeiro</span>
            </Button>
          </Link>

          <Link to="/propostas" className="flex-1 sm:flex-initial">
            <Button variant="outline" className="w-full rounded-lg font-medium h-8 px-3 text-xs border-border/80 hover:bg-muted/60 transition-colors">
              <span className="truncate">Propostas</span>
            </Button>
          </Link>
          <Link to="/jobs" className="flex-1 sm:flex-initial">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium gap-1.5 h-8 px-3 text-xs shadow-xs transition-colors">
              <Plus className="size-3.5 shrink-0" /> <span className="truncate">Novo Job</span>
            </Button>
          </Link>
        </div>
      </header>

      <InstallPromoCard />

      {/* Dashboard Executiva Integrada */}
      <ExecutiveDashboard />

      <footer className="pt-12 border-t border-border flex justify-between items-center text-[10px] font-mono-kasa text-foreground/30 uppercase tracking-widest">
        <span>KASA Marketing Consultoria</span>
        <span>KASA HUB v2.0</span>
      </footer>
    </div>
  );
}
