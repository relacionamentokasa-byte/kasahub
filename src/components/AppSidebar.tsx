import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/lib/version";
import { fetchMyProfile } from "@/lib/profile-api";
import { fetchLeads, fetchStages } from "@/lib/crm-api";
import { useMemo } from "react";
import {
  LayoutDashboard,
  KanbanSquare,
  FileText,
  Users,
  FolderKanban,
  CheckSquare,
  Settings,
  Handshake,
  CalendarRange,
  Activity,
  Wallet,
  UsersRound,
  MessageSquare,
  Sparkles,
  PiggyBank,
  TrendingUp,
  Rocket,
  CalendarDays,
  Film,


  Loader2,
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
import { StorageImage } from "@/components/ui/storage-image";

type SidebarItem = { title: string; url: string; icon: typeof LayoutDashboard; module: ModuleId };
const groups: { label: string; items: SidebarItem[] }[] = [
  {
    label: "Geral",
    items: [
      { title: "Painel", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { title: "CRM", url: "/crm", icon: KanbanSquare, module: "crm" },
      { title: "Prospecção (Garimpo)", url: "/prospeccao", icon: Sparkles, module: "crm" },
      { title: "Propostas", url: "/propostas", icon: FileText, module: "propostas" },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Clientes", url: "/clientes", icon: Users, module: "clientes" },
      { title: "Projetos", url: "/projetos", icon: FolderKanban, module: "projetos" },
      { title: "Jobs", url: "/jobs", icon: CheckSquare, module: "jobs" },
      
      
      { title: "Demandas Extras", url: "/dmes", icon: Sparkles, module: "jobs" },
      
      { title: "Parceiros", url: "/parceiros", icon: Handshake, module: "parceiros" },
      { title: "Agenda", url: "/calendario", icon: CalendarRange, module: "dashboard" },
      

    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Financeiro", url: "/relatorios", icon: Wallet, module: "financeiro" as any },
      { title: "Relatórios", url: "/gestao/relatorios", icon: TrendingUp, module: "financeiro" as any },
      { title: "Construtor de Relatórios", url: "/construtor-relatorios", icon: FileText, module: "financeiro" as any },
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
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { can, isAdmin, isLoading, isError } = usePermissions();

  const { data: leads = [] } = useQuery({
    queryKey: ["crm", "leads"],
    queryFn: fetchLeads,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["crm", "stages"],
    queryFn: fetchStages,
  });

  const stalledLeadsCount = useMemo(() => {
    const wonStageIds = new Set(stages.filter((s) => s.is_won).map((s) => s.id));
    const lostStageIds = new Set(stages.filter((s) => s.is_lost).map((s) => s.id));

    const activeLeads = leads.filter(
      (l) => !wonStageIds.has(l.stage_id) && !lostStageIds.has(l.stage_id)
    );

    const now = Date.now();
    return activeLeads.filter((l) => {
      const updated = new Date(l.updated_at || l.created_at).getTime();
      const diffDays = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
      return diffDays >= 5;
    }).length;
  }, [leads, stages]);

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  // Fallback de segurança: se houver erro ou não estiver carregando e as permissões forem vazias,
  // permitimos visualizar para evitar menu em branco.
  const visibleGroups = groups
    .map((g) => ({ 
      ...g, 
      items: g.items.filter((it) => {
        if (isLoading) return false;
        // Se houver erro, mostramos o menu básico para não travar
        if (isError) return true;
        // Admin vê tudo
        if (isAdmin) return true;
        return can(it.module, "view");
      }) 
    }))
    .filter((g) => g.items.length > 0);
    
  const finalGroups = visibleGroups.length > 0 ? visibleGroups : groups;

  if (isLoading) {
    return (
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="h-20 flex justify-center items-center px-4 mb-4">
          <KasaLogo collapsed={collapsed} variant="sidebar" />
        </SidebarHeader>
        <SidebarContent className="px-2 gap-2 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="h-16 flex justify-center items-center px-4 mt-2">
        <Link to="/dashboard" className="flex items-center justify-center">
          <KasaLogo collapsed={collapsed} variant="sidebar" iconOnly={collapsed} />
        </Link>
      </div>

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
                  const isCrm = item.url === "/crm";
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
                          className="flex items-center gap-3 relative"
                          onClick={() => {
                            if (isMobile) setOpenMobile(false);
                          }}
                        >
                          <div className="relative shrink-0">
                            <item.icon className="size-4 shrink-0" />
                            {isCrm && collapsed && stalledLeadsCount > 0 && (
                              <span className="absolute -top-1 -right-1.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-amber-500 text-black text-[8px] font-bold font-mono-kasa grid place-items-center ring-2 ring-sidebar-background leading-none">
                                {stalledLeadsCount}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium flex-1">{item.title}</span>
                          {isCrm && !collapsed && stalledLeadsCount > 0 && (
                            <span
                              title={`${stalledLeadsCount} oportunidades sem contato há mais de 5 dias`}
                              className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold font-mono-kasa rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 leading-none"
                            >
                              {stalledLeadsCount}
                            </span>
                          )}
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
    <Link to="/config" className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer">
      <div className="size-9 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center shrink-0 overflow-hidden">
        {profile?.avatar_url ? (
          <StorageImage src={profile.avatar_url} alt={name} className="size-full object-cover" />
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