import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  KanbanSquare,
  CheckSquare,
  Wallet,
  Settings,
  Bell,
  Menu
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/notifications-api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { NAV_SECTIONS } from "./TopNavigation";

export function MobileBottomNavigation() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: fetchNotifications,
  });

  const unreadCount = notifications.filter((n) => !n.lido).length;

  const items = [
    { label: "Painel", url: "/dashboard", icon: LayoutDashboard },
    { label: "CRM", url: "/crm", icon: KanbanSquare },
    { label: "Jobs", url: "/jobs", icon: CheckSquare },
    { label: "Financeiro", url: "/relatorios", icon: Wallet },
  ];

  return (
    <>
      {/* Bottom Bar estilo Raycast/Linear - Vidro fosco e altura ergonômica */}
      <nav
        aria-label="Navegação mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/85 backdrop-blur-xl border-t border-white/[0.08] px-1 py-1.5 grid grid-cols-5 items-center shadow-2xl safe-area-pb"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.url === "/dashboard"
              ? currentPath === "/dashboard" || currentPath === "/"
              : currentPath.startsWith(item.url);

          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center py-1 px-1 rounded-lg transition-all duration-200 text-[9px] min-[360px]:text-[10px] font-mono-kasa gap-1 relative",
                isActive
                  ? "text-amber-400 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Icon
                className={cn(
                  "size-[19px] transition-transform duration-200",
                  isActive ? "text-amber-400 stroke-[2.25]" : "text-zinc-400 stroke-[1.75]"
                )}
              />
              <span className="max-w-full truncate tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* Botão de Menu com Sheet deslizante para demais módulos */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex min-w-0 w-full flex-col items-center justify-center py-1 px-1 rounded-lg transition-all duration-200 text-[9px] min-[360px]:text-[10px] font-mono-kasa gap-1 relative text-zinc-400 hover:text-zinc-200"
              )}
              aria-label="Menu de navegação completo"
            >
              <div className="relative">
                <Menu className="size-[19px] stroke-[1.75]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500 ring-2 ring-[#09090b]" />
                )}
              </div>
              <span className="tracking-tight">Menu</span>
            </button>
          </SheetTrigger>

          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto bg-card border-t border-border p-6 font-sans">
            <SheetHeader className="text-left pb-4 border-b border-border/60">
              <SheetTitle className="text-base font-display font-bold flex items-center justify-between">
                <span>Navegação KASA HUB</span>
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-mono-kasa font-semibold border border-amber-500/30">
                    {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 pt-4">
              {NAV_SECTIONS.map((sec) => (
                <div key={sec.id} className="space-y-2">
                  <p className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold px-1">
                    {sec.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.url === "/"
                          ? currentPath === "/"
                          : currentPath === item.url || currentPath.startsWith(item.url + "/");

                      return (
                        <Link
                          key={item.url}
                          to={item.url}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-mono-kasa transition-all",
                            isActive
                              ? "bg-primary/15 border-primary/40 text-primary font-bold shadow-xs"
                              : "bg-muted/20 border-border/60 text-foreground/80 hover:bg-muted/40"
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
