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
    { icon: Wallet, label: "Nova Transação", to: "/financeiro", color: "text-emerald-500" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      {open && (
        <div className="absolute bottom-16 right-0 space-y-3 animate-in fade-in slide-in-from-bottom-4">
          {actions.map((action, i) => (
            <Link
              key={i}
              to={action.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 justify-end group"
            >
              <span className="bg-background/90 backdrop-blur-sm border border-border px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                {action.label}
              </span>
              <div className="size-12 rounded-full bg-surface border border-border shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                <action.icon className={cn("size-5", action.color)} />
              </div>
            </Link>
          ))}
        </div>
      )}
      <Button
        onClick={() => setOpen(!open)}
        size="icon"
        className={cn(
          "size-14 rounded-full shadow-2xl transition-all duration-300",
          open ? "rotate-45 bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
        )}
      >
        {open ? <X className="size-6" /> : <Plus className="size-7" />}
      </Button>
    </div>
  );
}
