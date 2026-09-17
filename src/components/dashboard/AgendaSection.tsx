import { Calendar, AlertCircle, FileCheck, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AgendaItem {
  id: string;
  title: string;
  subtitle?: string;
  client_id?: string;
  type: 'job_today' | 'job_overdue' | 'approval' | 'collection' | 'google_event';
  value?: number;
  source?: 'system' | 'google';
}

interface AgendaSectionProps {
  items: AgendaItem[];
}

export function AgendaSection({ items }: AgendaSectionProps) {
  const sections = [
    { key: 'job_today', label: 'Jobs Hoje', icon: Calendar },
    { key: 'job_overdue', label: 'Em Atraso', icon: AlertCircle },
    { key: 'approval', label: 'Aprovações', icon: FileCheck },
    { key: 'google_event', label: 'Eventos Google', icon: ExternalLink },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          Agenda do Dia
        </h3>
        <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8">
          <Link to="/calendario">
            Ver agenda completa <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {sections.map((s) => {
          const sectionItems = items.filter(it => it.type === s.key);
          const Icon = s.icon;
          return (
            <div key={s.key} className="rounded-xl border border-border bg-card flex flex-col h-[280px] overflow-hidden">
              <header className="px-3.5 py-3 border-b border-border/80 flex items-center justify-between gap-2 bg-muted/20">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="size-3.5 text-foreground/80 shrink-0" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/90">{s.label}</h4>
                </div>
                <span className="text-[11px] font-mono-kasa font-medium text-muted-foreground tabular-nums">
                  {sectionItems.length}
                </span>
              </header>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {sectionItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground/60 italic">
                    Sem pendências
                  </div>
                ) : (
                  sectionItems.map(item => (
                    <div key={item.id} className="p-2.5 rounded-lg hover:bg-muted/40 transition-colors border border-transparent hover:border-border/80 group">
                      <p className="text-xs font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">{item.title}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        {item.client_id ? (
                          <Link
                            to="/clientes/$clientId"
                            params={{ clientId: item.client_id }}
                            className="text-[10px] font-medium text-muted-foreground uppercase hover:text-primary transition-colors truncate max-w-[140px]"
                          >
                            {item.subtitle}
                          </Link>
                        ) : (
                          <span className="text-[10px] text-muted-foreground uppercase truncate max-w-[140px]">{item.subtitle}</span>
                        )}
                        {item.source === 'google' && (
                          <span className="text-[9px] font-mono-kasa text-sky-600 dark:text-sky-400 flex items-center gap-1">
                            Google
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

