import { Calendar, AlertCircle, FileCheck, ReceiptText, ArrowRight, ExternalLink } from "lucide-react";
import { brl } from "@/lib/finance-api";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AgendaItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'job_today' | 'job_overdue' | 'approval' | 'collection' | 'google_event';
  value?: number;
  source?: 'system' | 'google';
}

interface AgendaSectionProps {
  items: AgendaItem[];
}

export function AgendaSection({ items }: AgendaSectionProps) {
  const sections = [
    { key: 'job_today', label: 'Jobs hoje', icon: Calendar, color: 'text-primary' },
    { key: 'job_overdue', label: 'Jobs atrasados', icon: AlertCircle, color: 'text-rose-500' },
    { key: 'approval', label: 'Aprovações', icon: FileCheck, color: 'text-amber-500' },
    { key: 'google_event', label: 'Eventos Google', icon: ExternalLink, color: 'text-sky-400' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="size-4" /> Agenda de Hoje
        </h3>
        <Button variant="ghost" size="sm" asChild className="text-xs text-primary gap-1">
          <Link to="/calendario">
            Ver Agenda Completa <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((s) => {
          const sectionItems = items.filter(it => it.type === s.key);
          return (
            <div key={s.key} className="bg-surface border border-border rounded-2xl flex flex-col h-[300px] overflow-hidden">
              <header className="p-4 border-b border-border flex items-center gap-2 bg-background/20">
                <s.icon className={cn("size-3.5", s.color)} />
                <h4 className="text-[10px] font-bold uppercase tracking-widest">{s.label}</h4>
              </header>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {sectionItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-foreground/30 italic">
                    Nada para agora
                  </div>
                ) : (
                  sectionItems.map(item => (
                    <div key={item.id} className="p-2.5 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border group">
                      <p className="text-[11px] font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">{item.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[9px] font-mono-kasa text-foreground/40 uppercase">{item.subtitle}</span>
                        {item.value !== undefined && (
                          <span className="text-[9px] font-mono-kasa font-bold text-emerald-400">{brl(item.value)}</span>
                        )}
                        {item.source === 'google' && (
                          <span className="text-[8px] font-mono-kasa text-sky-400/60 flex items-center gap-1">
                            <div className="size-1 rounded-full bg-sky-400" /> Google
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

