import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  Metric, 
  Text, 
  Flex, 
  BadgeDelta, 
  Grid, 
  BarChart, 
  DonutChart, 
  Title,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
} from "@tremor/react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/financial/dashboard")({
  component: FinancialDashboard,
});

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function FinancialDashboard() {
  const navigate = useNavigate();

  // 1. Receita Total (status = 'paid')
  const { data: totalRevenue = 0, isLoading: loadingRevenue } = useQuery({
    queryKey: ["financial", "total-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_invoices")
        .select("amount")
        .eq("status", "paid");
      if (error) throw error;
      return data.reduce((acc, curr) => acc + Number(curr.amount), 0);
    },
  });

  // 2. Receita Pendente (status in ['pending', 'overdue'])
  const { data: pendingRevenue = { amount: 0, count: 0 }, isLoading: loadingPending } = useQuery({
    queryKey: ["financial", "pending-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_invoices")
        .select("amount")
        .in("status", ["pending", "overdue"]);
      if (error) throw error;
      return {
        amount: data.reduce((acc, curr) => acc + Number(curr.amount), 0),
        count: data.length
      };
    },
  });

  // 3. Despesas Totais (status = 'paid')
  const { data: totalExpenses = 0, isLoading: loadingExpenses } = useQuery({
    queryKey: ["financial", "total-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_expenses")
        .select("amount")
        .eq("status", "paid");
      if (error) throw error;
      return data.reduce((acc, curr) => acc + Number(curr.amount), 0);
    },
  });

  // 4. Últimas Faturas
  const { data: recentInvoices = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["financial", "recent-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_invoices")
        .select("*, clients(company, name)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // 5. Dados para DonutChart (Faturas por Status)
  const { data: invoicesByStatus = [], isLoading: loadingStatus } = useQuery({
    queryKey: ["financial", "invoices-by-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_invoices")
        .select("status, amount");
      if (error) throw error;
      
      const counts: Record<string, number> = {
        pending: 0,
        paid: 0,
        overdue: 0,
        cancelled: 0
      };
      
      data.forEach(inv => {
        counts[inv.status] = (counts[inv.status] || 0) + 1;
      });

      return [
        { name: "Pendente", value: counts.pending, color: "amber" },
        { name: "Pago", value: counts.paid, color: "emerald" },
        { name: "Atrasado", value: counts.overdue, color: "rose" },
        { name: "Cancelado", value: counts.cancelled, color: "slate" },
      ];
    },
  });

  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  if (loadingRevenue || loadingPending || loadingExpenses || loadingRecent || loadingStatus) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Financeiro</h1>
        <p className="text-muted-foreground">Visão geral da saúde financeira da agência.</p>
      </div>

      <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
        <Card decoration="top" decorationColor="emerald">
          <Text>Receita Total</Text>
          <Metric>{brl(totalRevenue)}</Metric>
          <Flex className="mt-4">
            <BadgeDelta deltaType="moderateIncrease" isIncreasePositive={true}>
              +12.5%
            </BadgeDelta>
            <Text className="truncate">vs mês anterior</Text>
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="amber">
          <Text>Receita Pendente</Text>
          <Metric>{brl(pendingRevenue.amount)}</Metric>
          <Flex className="mt-4">
            <Badge color="amber">{pendingRevenue.count} faturas</Badge>
            <Text className="truncate">aguardando pagamento</Text>
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="rose">
          <Text>Despesas Totais</Text>
          <Metric>{brl(totalExpenses)}</Metric>
          <Flex className="mt-4">
            <BadgeDelta deltaType="moderateDecrease" isIncreasePositive={false}>
              -5.2%
            </BadgeDelta>
            <Text className="truncate">vs mês anterior</Text>
          </Flex>
        </Card>

        <Card decoration="top" decorationColor={netProfit >= 0 ? "emerald" : "rose"}>
          <Text>Lucro Líquido</Text>
          <Metric>{brl(netProfit)}</Metric>
          <Flex className="mt-4">
            <BadgeDelta deltaType={netProfit >= 0 ? "moderateIncrease" : "moderateDecrease"} isIncreasePositive={true}>
              {margin.toFixed(1)}%
            </BadgeDelta>
            <Text className="truncate">margem de lucro</Text>
          </Flex>
        </Card>
      </Grid>

      <Grid numItemsLg={2} className="gap-6">
        <Card>
          <Title>Receita vs Despesas (Últimos 6 meses)</Title>
          <BarChart
            className="mt-6 h-80"
            data={[
              { month: "Jan", Receita: 4500, Despesa: 3200 },
              { month: "Fev", Receita: 5200, Despesa: 3800 },
              { month: "Mar", Receita: 4800, Despesa: 4100 },
              { month: "Abr", Receita: 6100, Despesa: 3900 },
              { month: "Mai", Receita: 5900, Despesa: 4200 },
              { month: "Jun", Receita: 7200, Despesa: 4500 },
            ]}
            index="month"
            categories={["Receita", "Despesa"]}
            colors={["indigo", "rose"]}
            valueFormatter={brl}
            yAxisWidth={80}
          />
        </Card>

        <Card>
          <Title>Faturas por Status</Title>
          <DonutChart
            className="mt-6 h-80"
            data={invoicesByStatus}
            category="value"
            index="name"
            colors={["amber", "emerald", "rose", "slate"]}
            valueFormatter={(number) => `${number} faturas`}
          />
        </Card>
      </Grid>

      <Card>
        <Flex className="items-center justify-between">
          <Title>Últimas Faturas</Title>
          <button 
            onClick={() => navigate({ to: "/financial/invoices" })}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Ver todas
          </button>
        </Flex>
        <Table className="mt-5">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Número</TableHeaderCell>
              <TableHeaderCell>Cliente</TableHeaderCell>
              <TableHeaderCell>Valor</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Vencimento</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                <TableCell>{(invoice.clients as any)?.company || (invoice.clients as any)?.name || "—"}</TableCell>
                <TableCell>{brl(Number(invoice.amount))}</TableCell>
                <TableCell>
                  <Badge color={
                    invoice.status === 'paid' ? 'emerald' :
                    invoice.status === 'pending' ? 'amber' :
                    invoice.status === 'overdue' ? 'rose' : 'slate'
                  }>
                    {invoice.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(invoice.due_date).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}
            {recentInvoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma fatura encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
