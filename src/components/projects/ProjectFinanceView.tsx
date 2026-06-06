import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileSignature, DollarSign, TrendingUp, CheckCircle2 } from "lucide-react";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProjectFinanceView({ projectId }: { projectId: string }) {
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("contract_id").eq("id", projectId).single();
      return data;
    }
  });

  const { data: contract } = useQuery({
    queryKey: ["contract", project?.contract_id],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("*").eq("id", project!.contract_id!).single();
      return data;
    },
    enabled: !!project?.contract_id
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["project-transactions", projectId],
    queryFn: async () => {
      // Transactions linked to this project or its contract
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .or(`project_id.eq.${projectId},contract_id.eq.${project?.contract_id}`)
        .order("due_date", { ascending: false });
      return data || [];
    },
    enabled: !!project
  });

  const { data: dmeTransactions = [] } = useQuery({
    queryKey: ["project-dme-transactions", project?.contract_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("contract_id", project!.contract_id!)
        .not("dme_id", "is", null);
      return data || [];
    },
    enabled: !!project?.contract_id
  });

  const revenueGenerated = transactions
    .filter(t => t.kind === "income" && t.status === "paid")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const dmeTotal = dmeTransactions
    .reduce((sum, t) => sum + Number(t.amount), 0);

  if (!project?.contract_id) {
    return (
      <div className="p-12 text-center border border-dashed border-border rounded-2xl">
        <p className="text-foreground/40 text-sm">Este projeto não possui um contrato financeiro vinculado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[10px] uppercase text-foreground/40 mb-1 flex items-center gap-1">
            <FileSignature className="size-3" /> Valor do Contrato
          </div>
          <div className="font-display font-bold text-2xl text-primary">
            {contract ? (
              Number(contract.monthly_value) > 0 
                ? `${BRL(Number(contract.monthly_value))} /mês`
                : BRL(Number(contract.total_value || 0))
            ) : "—"}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[10px] uppercase text-foreground/40 mb-1 flex items-center gap-1">
            <TrendingUp className="size-3" /> Receita Gerada (Pago)
          </div>
          <div className="font-display font-bold text-2xl text-emerald-400">
            {BRL(revenueGenerated)}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="text-[10px] uppercase text-foreground/40 mb-1 flex items-center gap-1">
            <DollarSign className="size-3" /> Demandas Extras
          </div>
          <div className="font-display font-bold text-2xl text-amber-400">
            {BRL(dmeTotal)}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-foreground/[0.02]">
          <h4 className="text-sm font-semibold">Últimos Lançamentos</h4>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase text-foreground/40 border-b border-border">
              <th className="px-5 py-3 font-medium">Descrição</th>
              <th className="px-5 py-3 font-medium text-right">Vencimento</th>
              <th className="px-5 py-3 font-medium text-right">Status</th>
              <th className="px-5 py-3 font-medium text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {transactions.slice(0, 10).map((t) => (
              <tr key={t.id} className="hover:bg-foreground/[0.01] transition-colors">
                <td className="px-5 py-3">
                  <div className="font-medium text-xs truncate max-w-[200px]">{t.description}</div>
                  {t.dme_id && <span className="text-[10px] text-amber-400 font-mono-kasa">DME</span>}
                </td>
                <td className="px-5 py-3 text-right text-[10px] text-foreground/50 font-mono-kasa">
                  {new Date(t.due_date).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    t.status === "paid" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                  }`}>
                    {t.status === "paid" ? "Pago" : "Pendente"}
                  </span>
                </td>
                <td className={`px-5 py-3 text-right font-mono-kasa font-bold ${t.kind === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                  {t.kind === "income" ? "+" : "−"} {BRL(Number(t.amount))}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-foreground/40 text-xs italic">Nenhum lançamento financeiro encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
