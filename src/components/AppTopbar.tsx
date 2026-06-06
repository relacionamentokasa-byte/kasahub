import { Bell, LogOut, Moon, Search, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

type Profile = {
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
};

export function AppTopbar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggle } = useTheme();

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

  const name = profile?.display_name || profile?.full_name || profile?.email?.split("@")[0] || "Usuário";
  const initials = name
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-8 shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3 flex-1">
        <SidebarTrigger className="text-foreground/60 hover:text-foreground md:hidden" />
        <SidebarTrigger className="text-foreground/60 hover:text-foreground hidden md:flex" />


        <div className="hidden md:flex items-center gap-3 bg-surface/60 border border-border px-4 h-9 rounded-full w-full max-w-md">
          <Search className="size-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Busca global — clientes, tarefas, propostas…"
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-foreground/40"
          />
          <kbd className="text-[10px] font-mono-kasa text-foreground/30 border border-border rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="hidden md:flex h-9 gap-2 text-foreground/70 hover:text-foreground hover:bg-white/5"
        >
          <Sparkles className="size-4 text-primary" />
          <span className="text-xs font-medium">Ações rápidas</span>
        </Button>

        <button
          onClick={toggle}
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
          title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          className="p-2 text-foreground/60 hover:text-foreground transition-colors"
        >
          {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>

        <button className="relative p-2 text-foreground/60 hover:text-foreground transition-colors">
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 bg-primary rounded-full ring-2 ring-background animate-pulse" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 pl-2 lg:pl-4 lg:border-l border-border outline-none">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-semibold leading-tight">{name}</p>
                <p className="text-[10px] text-foreground/40 leading-tight">
                  {profile?.email ?? "Kasa Marketing"}
                </p>
              </div>
              <div className="size-9 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img src={profile.avatar_url} className="size-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-primary">{initials}</span>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-display">{name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="size-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
