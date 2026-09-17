import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
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
      <header className="border-b border-border/80 pb-4 sm:pb-6">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa uppercase tracking-widest font-semibold">
            KASA Marketing Consultoria
          </span>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mt-0.5">
            Visão Geral
          </h1>
          <p className="text-foreground/60 text-xs mt-0.5">Acompanhe a operação, entregas da equipe e o pulso financeiro.</p>
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
