import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  KanbanSquare,
  FileText,
  Users,
  FolderKanban,
  CheckSquare,
  Wallet,
  BarChart3,
  Settings,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import type { ModuleId } from "@/lib/permissions-api";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { KasaLogo } from "./KasaLogo";

type SidebarItem = { title: string; url: string; icon: typeof LayoutDashboard; module: ModuleId };
const groups: { label: string; items: SidebarItem[] }[] = [
  {
    label: "Comercial",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard" },
      { title: "CRM", url: "/crm", icon: KanbanSquare, module: "crm" },
      { title: "Propostas", url: "/propostas", icon: FileText, module: "propostas" },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Clientes", url: "/clientes", icon: Users, module: "clientes" },
      { title: "Projetos", url: "/projetos", icon: FolderKanban, module: "projetos" },
      { title: "Jobs", url: "/jobs", icon: CheckSquare, module: "jobs" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Financeiro", url: "/financeiro", icon: Wallet, module: "financeiro" },
      { title: "Relatórios", url: "/relatorios", icon: BarChart3, module: "relatorios" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Configurações", url: "/config", icon: Settings, module: "config" },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const { can, isAdmin } = usePermissions();

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((it) => isAdmin || can(it.module, "view")) }))
    .filter((g) => g.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 flex justify-center px-4">
        <KasaLogo collapsed={collapsed} />
      </SidebarHeader>

      <SidebarContent className="px-2 gap-2">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-mono-kasa capitalize text-sidebar-foreground/40 px-3">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={
                          active
                            ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/5"
                        }
                      >
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="size-4 shrink-0" />
                          <span className="text-sm font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer">
          <div className="size-9 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">LA</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate text-sidebar-foreground">Lucas Andrade</p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate font-mono-kasa capitalize">
                Diretor Criativo
              </p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
