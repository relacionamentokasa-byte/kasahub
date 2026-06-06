import { Calendar, AlertCircle, FileCheck, ReceiptText } from "lucide-react";
import { format } from "date-fns";
import { brl } from "@/lib/finance-api";

interface AgendaItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'job_today' | 'job_overdue' | 'approval' | 'collection';
  value?: number;
}

interface AgendaSectionProps {
  items: AgendaItem[];
}

export function AgendaSection({ items }: AgendaSectionProps) {
  const sections = [
    { key: 'job_today', label: 'Jobs vencendo hoje', icon: Calendar, color: 'text-primary' },
    { key: 'job_overdue', label: 'Jobs atrasados', icon: AlertCircle, color: 'text-rose-500' },
    { key: 'approval', label: 'Aprovações pendentes', icon: FileCheck, color: 'text-amber-500' },
    { key: 'collection', label: 'Cobranças próximas', icon: ReceiptText, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
        <Calendar className="size-4" /> Agenda Operacional
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((s) => {
          const sectionItems = items.filter(it => it.type === s.key);
          return (
            <div key={s.key} className="bg-surface border border-border rounded-2xl flex flex-col h-[300px]">
              <header className="p-4 border-b border-border flex items-center gap-2">
                <s.icon className={`size-4 ${s.color}`} />
                <h4 className="text-xs font-bold uppercase tracking-tight">{s.label}</h4>
              </header>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sectionItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-foreground/30 italic">
                    Nada para agora
                  </div>
                ) : (
                  sectionItems.map(item => (
                    <div key={item.id} className="p-2.5 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border">
                      <p className="text-xs font-medium line-clamp-1">{item.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-foreground/40">{item.subtitle}</span>
                        {item.value !== undefined && (
                          <span className="text-[10px] font-mono-kasa font-bold">{brl(item.value)}</span>
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
