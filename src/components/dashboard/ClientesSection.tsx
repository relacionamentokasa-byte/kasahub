import { Users, Award } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { brl } from "@/lib/utils-format";

interface ClientRanking {
  id: string;
  name: string;
  total: number;
}

const fmt = (v: number) => brl(v);

export function ClientesSection({ clients }: { clients: ClientRanking[] }) {
  const sortedClients = [...clients]
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const max = sortedClients[0]?.total || 1;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Users className="size-3.5" /> Ranking de Clientes
      </h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[320px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Cliente
                </th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-right">
                  Receita
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sortedClients.map((c, i) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-mono-kasa w-5 shrink-0 ${
                          i === 0 ? "text-primary font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {i === 0 ? <Award className="size-3.5 text-primary" /> : `${i + 1}.`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <Link
                          to="/clientes/$clientId"
                          params={{ clientId: c.id }}
                          className="text-xs font-medium text-foreground hover:text-primary transition-colors block truncate"
                        >
                          {c.name}
                        </Link>
                        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full transition-all duration-300"
                            style={{ width: `${(c.total / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-display font-medium tabular-nums text-foreground/90 whitespace-nowrap">
                    {fmt(c.total)}
                  </td>
                </tr>
              ))}
              {sortedClients.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-xs text-muted-foreground italic">
                    Nenhuma receita registrada no período.
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

