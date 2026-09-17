import { Plus, Users, FileText, CheckSquare, Wallet, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function FloatingActions() {
  const [open, setOpen] = useState(false);

  const actions = [
    { icon: Users, label: "Novo Cliente", to: "/clientes", color: "text-blue-500" },
    { icon: FileText, label: "Nova Proposta", to: "/propostas", color: "text-amber-500" },
    { icon: CheckSquare, label: "Novo Job", to: "/jobs", color: "text-primary" },
    
  ];

  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden">
      {open && (
        <div className="absolute bottom-14 right-0 space-y-2 animate-in fade-in slide-in-from-bottom-2">
          {actions.map((action, i) => (
            <Link
              key={i}
              to={action.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 justify-end group"
            >
              <span className="bg-card/95 backdrop-blur-sm border border-border/60 px-2.5 py-1 rounded text-[11px] font-mono-kasa shadow-xs">
                {action.label}
              </span>
              <div className="size-9 rounded-md bg-card border border-border/60 shadow-md flex items-center justify-center hover:bg-muted transition-colors">
                <action.icon className="size-4 text-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
      <Button
        onClick={() => setOpen(!open)}
        size="icon"
        className={cn(
          "size-10 rounded-md shadow-lg transition-all duration-200 border border-border/60",
          open
            ? "rotate-45 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "bg-foreground text-background hover:bg-foreground/90"
        )}
      >
        {open ? <X className="size-4" /> : <Plus className="size-4" />}
      </Button>
    </div>
  );
}
