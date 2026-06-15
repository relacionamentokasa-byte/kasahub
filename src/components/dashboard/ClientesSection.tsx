import { Users, Award } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface ClientRanking {
  id: string;
  name: string;
  total: number;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function ClientesSection({ clients }: { clients: ClientRanking[] }) {
  const sortedClients = [...clients]
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const max = sortedClients[0]?.total || 1;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
        <Users className="size-4" /> Ranking de Clientes
      </h3>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[400px] sm:min-w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-4 sm:px-6 py-3 text-[10px] font-mono-kasa uppercase text-foreground/40">
                  Cliente
                </th>
                <th className="px-4 sm:px-6 py-3 text-[10px] font-mono-kasa uppercase text-foreground/40 text-right">
                  Receita
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedClients.map((c, i) => (
                <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-mono-kasa w-5 ${
                          i === 0 ? "text-primary font-bold" : "text-foreground/40"
                        }`}
                      >
                        {i === 0 ? <Award className="size-4 text-primary" /> : `${i + 1}.`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <Link
                          to="/clientes/$clientId"
                          params={{ clientId: c.id }}
                          className="text-sm font-medium hover:text-primary hover:underline transition-colors block truncate"
                        >
                          {c.name}
                        </Link>
                        <div className="mt-1.5 h-1 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full transition-all"
                            style={{ width: `${(c.total / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right text-sm font-mono-kasa text-foreground/80 whitespace-nowrap">
                    {fmt(c.total)}
                  </td>
                </tr>
              ))}
              {sortedClients.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-sm text-foreground/40 italic">
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
