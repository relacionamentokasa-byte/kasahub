import { Users, Award } from "lucide-react";
import { brl } from "@/lib/finance-api";

interface ClientRanking {
  id: string;
  name: string;
  contracted: number;
  extra: number;
  total: number;
}

interface ClientesSectionProps {
  clients: ClientRanking[];
}

export function ClientesSection({ clients }: ClientesSectionProps) {
  const sortedClients = [...clients].sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
        <Users className="size-4" /> Ranking de Clientes
      </h3>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-6 py-3 text-[10px] font-mono-kasa uppercase text-foreground/40">Cliente</th>
                <th className="px-6 py-3 text-[10px] font-mono-kasa uppercase text-foreground/40 text-right">Contratado</th>
                <th className="px-6 py-3 text-[10px] font-mono-kasa uppercase text-foreground/40 text-right">Extra</th>
                <th className="px-6 py-3 text-[10px] font-mono-kasa uppercase text-foreground/40 text-right">Total Faturado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedClients.map((c, i) => (
                <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    {i === 0 && <Award className="size-4 text-primary" />}
                    <span className="text-sm font-medium">{c.name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right tabular-nums">{brl(c.contracted)}</td>
                  <td className="px-6 py-4 text-sm text-right tabular-nums">{brl(c.extra)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold tabular-nums text-primary">{brl(c.total)}</td>
                </tr>
              ))}
              {sortedClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-foreground/40 italic">
                    Nenhum faturamento registrado no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
