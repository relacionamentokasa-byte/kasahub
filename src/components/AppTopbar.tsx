import { Bell, Search, Sparkles } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppTopbar() {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-8 shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3 flex-1">
        <SidebarTrigger className="text-foreground/60 hover:text-foreground" />

        <div className="hidden md:flex items-center gap-3 bg-surface/60 border border-border px-4 h-9 rounded-full w-full max-w-md">
          <Search className="size-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Busca global — clientes, jobs, propostas…"
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

        <button className="relative p-2 text-foreground/60 hover:text-foreground transition-colors">
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 bg-primary rounded-full ring-2 ring-background animate-pulse" />
        </button>

        <div className="flex items-center gap-3 pl-2 lg:pl-4 lg:border-l border-border">
          <div className="hidden lg:block text-right">
            <p className="text-xs font-semibold leading-tight">Lucas Andrade</p>
            <p className="text-[10px] text-foreground/40 leading-tight">Kasa Marketing</p>
          </div>
          <div className="size-9 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">LA</span>
          </div>
        </div>
      </div>
    </header>
  );
}
