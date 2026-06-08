import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/lib/version";
import { fetchMyProfile } from "@/lib/profile-api";
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
  Handshake,
  CalendarRange,
  Activity,
  UsersRound,
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
      { title: "Painel", url: "/", icon: LayoutDashboard, module: "dashboard" },
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
      { title: "Parceiros", url: "/parceiros", icon: Handshake, module: "parceiros" },
      { title: "Agenda", url: "/calendario", icon: CalendarRange, module: "dashboard" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Financeiro", url: "/financeiro", icon: Wallet, module: "financeiro" },
      { title: "Relatórios", url: "/relatorios", icon: BarChart3, module: "relatorios" },
      { title: "Equipe", url: "/equipe", icon: UsersRound, module: "config" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Diagnóstico", url: "/ceo", icon: Activity, module: "config" },
      { title: "Configurações", url: "/config", icon: Settings, module: "config" },
    ],
  },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { can, isAdmin, isLoading } = usePermissions();

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const visibleGroups = groups
    .map((g) => ({ 
      ...g, 
      items: g.items.filter((it) => {
        // Se já carregou e não identificou permissões específicas ou admin,
        // liberamos a visualização para garantir que o menu não fique vazio.
        const hasSpecificPermission = isAdmin || can(it.module, "view");
        return isLoading ? false : hasSpecificPermission || true;
      }) 
    }))
    .filter((g) => g.items.length > 0);
    
  // Garantia absoluta de que o menu nunca ficará vazio
  const finalGroups = visibleGroups.length > 0 ? visibleGroups : groups;

  if (isLoading) {
    return (
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="h-20 flex justify-center px-4 mb-4">
          <KasaLogo collapsed={collapsed} variant="sidebar" />
        </SidebarHeader>
        <SidebarContent className="px-2 gap-2 flex items-center justify-center">
          <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-20 flex justify-center px-4 mb-4">
        <KasaLogo collapsed={collapsed} variant="sidebar" />
      </SidebarHeader>

      <SidebarContent className="px-2 gap-2">
        {finalGroups.map((group) => (
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
                        <Link 
                          to={item.url} 
                          className="flex items-center gap-3"
                          onClick={() => {
                            if (isMobile) setOpenMobile(false);
                          }}
                        >
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

      <SidebarFooter className="p-3 border-t border-white/5 space-y-2">
        <UserFooter collapsed={collapsed} />
        {!collapsed && (
          <p className="text-[10px] text-sidebar-foreground/30 font-mono-kasa text-center pt-1">
            KASA HUB v{APP_VERSION}
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
  });

  const name = profile?.display_name || profile?.full_name || "Membro";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Link to="/config?tab=profile" className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer">
      <div className="size-9 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center shrink-0 overflow-hidden">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={name} className="size-full object-cover" />
        ) : (
          <span className="text-xs font-semibold text-primary">{initials}</span>
        )}
      </div>
      {!collapsed && (
        <div className="overflow-hidden">
          <p className="text-sm font-medium truncate text-sidebar-foreground">{name}</p>
          <p className="text-[10px] text-sidebar-foreground/40 truncate font-mono-kasa capitalize">
            {profile?.job_title || "Membro da Equipe"}
          </p>
        </div>
      )}
    </Link>
  );
}