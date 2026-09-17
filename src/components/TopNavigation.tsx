import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  KanbanSquare,
  FileText,
  Users,
  FolderKanban,
  CheckSquare,
  Sparkles,
  Handshake,
  CalendarRange,
  Wallet,
  TrendingUp,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronDown
} from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationCenter } from "./notifications/NotificationCenter";
import { PrivacyToggleButton } from "@/contexts/PrivacyContext";
import { InstallPWAButton } from "./pwa/InstallPWAButton";
import { StorageImage } from "@/components/ui/storage-image";
import { useTheme } from "@/lib/theme";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { usePermissions, type ModuleId } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import logoWhiteAsset from "@/assets/logo-white.png.asset.json";

export type NavItem = {
  title: string;
  url: string;
  icon: any;
  module: ModuleId;
};

export type NavSection = {
  id: string;
  label: string;
  rootUrl: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "painel",
    label: "Painel",
    rootUrl: "/dashboard",
    items: [
      { title: "Visão Geral", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    id: "comercial",
    label: "Comercial",
    rootUrl: "/crm",
    items: [
      { title: "CRM / Pipeline", url: "/crm", icon: KanbanSquare, module: "crm" },
      { title: "Propostas", url: "/propostas", icon: FileText, module: "propostas" },
    ],
  },
  {
    id: "operacao",
    label: "Operação",
    rootUrl: "/jobs",
    items: [
      { title: "Jobs", url: "/jobs", icon: CheckSquare, module: "jobs" },
      { title: "Projetos", url: "/projetos", icon: FolderKanban, module: "projetos" },
      { title: "Clientes", url: "/clientes", icon: Users, module: "clientes" },
      { title: "Demandas Extras", url: "/dmes", icon: Sparkles, module: "jobs" },
      { title: "Parceiros", url: "/parceiros", icon: Handshake, module: "parceiros" },
      { title: "Agenda", url: "/calendario", icon: CalendarRange, module: "dashboard" },
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    rootUrl: "/relatorios",
    items: [
      { title: "Financeiro", url: "/relatorios", icon: Wallet, module: "financeiro" as any },
      { title: "Relatórios", url: "/gestao/relatorios", icon: TrendingUp, module: "financeiro" as any },
      { title: "Construtor", url: "/construtor-relatorios", icon: FileText, module: "financeiro" as any },
    ],
  },
  {
    id: "config",
    label: "Config",
    rootUrl: "/config",
    items: [
      { title: "Configurações", url: "/config", icon: Settings, module: "config" },
    ],
  },
];

export function TopNavigation() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggle } = useTheme();
  const { can, isAdmin, isLoading, isError } = usePermissions();

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      return {
        display_name: data?.display_name ?? null,
        full_name: data?.full_name ?? null,
        avatar_url: data?.avatar_url ?? null,
        email: user.email ?? "",
      };
    },
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/auth", replace: true });
  };

  // Filter sections by permissions: se estiver carregando ou houver erro, renderiza as seções padrão
  const filteredSections = NAV_SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((it) => {
      if (isLoading || isError || isAdmin) return true;
      return can(it.module, "view");
    }),
  })).filter((sec) => sec.items.length > 0);

  // Determine which section is currently active
  const activeSection = filteredSections.find((sec) =>
    sec.items.some((it) =>
      it.url === "/" ? currentPath === "/" : currentPath.startsWith(it.url)
    )
  ) || filteredSections[0];

  const name = profile?.display_name || profile?.full_name || profile?.email?.split("@")[0] || "Usuário";
  const initials = name
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="sticky top-0 z-30 w-full select-none shadow-sm">
      {/* Tier 1: Macro Navigation Bar (Dark Header estilo SaaS moderno / Vercel Pro) */}
      <div className="h-14 px-4 lg:px-6 flex items-center justify-between gap-4 bg-[#121214] text-white border-b border-white/10">
        {/* Left: Brand Logo & Section Tabs */}
        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity">
            <div className="size-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-xs">
              <span className="font-display font-black text-base text-primary">K</span>
            </div>
            <span className="font-display text-base font-black tracking-tight text-white flex items-center gap-1.5">
              <span>KASA</span>
              <span className="text-primary">HUB</span>
            </span>
          </Link>

          {/* Macro Section Links (Apenas Desktop / lg+) */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {filteredSections.map((sec) => {
              const isSecActive = activeSection?.id === sec.id;
              return (
                <Link
                  key={sec.id}
                  to={sec.items[0]?.url || sec.rootUrl}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-mono-kasa font-medium transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 select-none",
                    isSecActive
                      ? "bg-white/15 text-white shadow-xs font-bold border border-white/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {sec.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Center / Right: Global Search, Quick Actions & Profile */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0 ml-auto">
          <div className="w-36 sm:w-48 md:w-56 lg:w-64 [&_input]:text-white [&_input]:placeholder:text-zinc-400 [&_div]:bg-white/5 [&_div]:border-white/15 [&_div]:hover:bg-white/10 [&_div]:focus-within:bg-black/60">
            <GlobalSearch />
          </div>

          <div className="h-4 w-px bg-white/15 mx-1 hidden sm:block" />

          <InstallPWAButton />

          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <PrivacyToggleButton className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-md" />
          <NotificationCenter className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-md" />

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-2 border-l border-white/15 outline-none group cursor-pointer">
                <div className="hidden xl:block text-right">
                  <p className="text-xs font-semibold leading-tight text-white">{name}</p>
                  <p className="text-[10px] text-zinc-400 font-mono-kasa leading-tight">
                    {profile?.email ?? "Kasa Hub"}
                  </p>
                </div>
                <div className="size-7 rounded-full bg-amber-500/20 ring-1 ring-amber-500/40 flex items-center justify-center overflow-hidden transition-transform group-active:scale-95 shrink-0">
                  {profile?.avatar_url ? (
                    <StorageImage src={profile.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-mono-kasa font-bold text-amber-400">{initials}</span>
                  )}
                </div>
                <ChevronDown className="size-3 text-zinc-400 group-hover:text-white transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 font-mono-kasa">
              <DropdownMenuLabel className="font-display font-bold text-xs">{name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/config" })} className="text-xs cursor-pointer">
                <Settings className="size-3.5 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-xs text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="size-3.5 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tier 2: Contextual Sub-Nav Bar (Barra de sub-menus horizontal com contraste limpo - Apenas Desktop / lg+) */}
      {activeSection && activeSection.items.length > 0 && (
        <div className="hidden lg:flex h-10 px-4 lg:px-6 items-center gap-1 overflow-x-auto no-scrollbar bg-card border-b border-border/70">
          <div className="flex items-center gap-1">
            {activeSection.items.map((item) => {
              const Icon = item.icon;
              const isItemActive = item.url === "/"
                ? currentPath === "/"
                : currentPath === item.url || currentPath.startsWith(item.url + "/");

              return (
                <Link
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "relative px-3 py-1.5 text-xs font-mono-kasa font-medium rounded-md flex items-center gap-1.5 transition-all",
                    isItemActive
                      ? "text-foreground bg-muted/60 border border-border/80 font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Icon className={cn("size-3.5 shrink-0", isItemActive ? "text-primary font-bold" : "text-muted-foreground/70")} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
