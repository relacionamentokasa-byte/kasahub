import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  KanbanSquare,
  FileText,
  Users,
  FolderKanban,
  CheckSquare,
  Wallet,
  BarChart3,
  Globe,
  UsersRound,
  Settings,
  Crown,
} from "lucide-react";
import { fetchCurrentUserRoles, hasAnyRole } from "@/lib/roles-api";
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

const groups = [
  {
    label: "Comercial",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "CRM", url: "/crm", icon: KanbanSquare },
      { title: "Propostas", url: "/propostas", icon: FileText },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "Projetos", url: "/projetos", icon: FolderKanban },
      { title: "Jobs", url: "/jobs", icon: CheckSquare },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Financeiro", url: "/financeiro", icon: Wallet },
      { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
      { title: "Dashboard CEO", url: "/ceo", icon: Crown, ceoOnly: true },
    ],
  },
  {
    label: "Experiência",
    items: [
      { title: "Portal do Cliente", url: "/portal", icon: Globe },
      { title: "Equipe", url: "/equipe", icon: UsersRound },
      { title: "Configurações", url: "/config", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const { data: roles = [] } = useQuery({ queryKey: ["roles", "me"], queryFn: fetchCurrentUserRoles });
  const isCeo = hasAnyRole(roles, ["admin", "ceo"]);

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 flex justify-center px-4">
        <KasaLogo collapsed={collapsed} />
      </SidebarHeader>

      <SidebarContent className="px-2 gap-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-mono-kasa uppercase tracking-[0.2em] text-foreground/40 px-3">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.filter((item) => !(item as { ceoOnly?: boolean }).ceoOnly || isCeo).map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={
                          active
                            ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                            : "text-foreground/70 hover:text-foreground hover:bg-white/5"
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
              <p className="text-sm font-medium truncate">Lucas Andrade</p>
              <p className="text-[10px] text-foreground/40 truncate font-mono-kasa uppercase tracking-wider">
                Diretor Criativo
              </p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
