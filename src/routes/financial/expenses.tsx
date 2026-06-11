import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  Table, 
  TableHead, 
  TableRow, 
  TableHeaderCell, 
  TableBody, 
  TableCell, 
  Badge, 
  Button, 
  TextInput, 
  Select, 
  SelectItem,
  Flex,
  Title,
  Grid,
  Metric,
  Text,
} from "@tremor/react";
import { useState } from "react";
import { Plus, Search, Loader2, Trash2, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/financial/expenses")({
  component: ExpensesPage,
});

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const CATEGORY_COLORS: Record<string, any> = {
  operational: "blue",
  software: "violet",
  marketing: "pink",
  freelance: "orange",
  other: "slate",
};

const CATEGORY_LABELS: Record<string, string> = {
  operational: "Operacional",
  software: "Software/SaaS",
  marketing: "Marketing",
  freelance: "Freelance",
  other: "Outros",
};

function ExpensesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["financial", "expenses", search, statusFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("financial_expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);

      const { data, error } = await query;
      if (error) throw error;

      if (search) {
        return data.filter(exp => 
          exp.description.toLowerCase().includes(search.toLowerCase())
        );
      }

      return data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const newStatus = status === "paid" ? "pending" : "paid";
      const { error } = await supabase
        .from("financial_expenses")
        .update({ 
          status: newStatus,
          paid_at: newStatus === "paid" ? new Date().toISOString() : null
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial", "expenses"] });
      toast.success("Status da despesa atualizado!");
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial", "expenses"] });
      toast.success("Despesa excluída.");
    },
  });

  const stats = {
    pending: expenses.filter(e => e.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0),
    paid: expenses.filter(e => e.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0),
    total: expenses.reduce((acc, curr) => acc + Number(curr.amount), 0),
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <Flex className="items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <p className="text-muted-foreground">Controle de saídas e custos operacionais.</p>
        </div>
        <Button icon={Plus} color="indigo">Nova Despesa</Button>
      </Flex>

      <Grid numItemsSm={2} numItemsLg={3} className="gap-6">
        <Card decoration="top" decorationColor="amber">
          <Text>Total Pendente</Text>
          <Metric>{brl(stats.pending)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="emerald">
          <Text>Total Pago</Text>
          <Metric>{brl(stats.paid)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="indigo">
          <Text>Total Geral</Text>
          <Metric>{brl(stats.total)}</Metric>
        </Card>
      </Grid>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <TextInput 
              placeholder="Buscar por descrição..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectItem value="all">Todas Categorias</SelectItem>
              <SelectItem value="operational">Operacional</SelectItem>
              <SelectItem value="software">Software</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="freelance">Freelance</SelectItem>
              <SelectItem value="other">Outros</SelectItem>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex py-20 justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Descrição</TableHeaderCell>
                <TableHeaderCell>Categoria</TableHeaderCell>
                <TableHeaderCell>Valor</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Data</TableHeaderCell>
                <TableHeaderCell>Ações</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">{exp.description}</TableCell>
                  <TableCell>
                    <Badge color={CATEGORY_COLORS[exp.category]}>
                      {CATEGORY_LABELS[exp.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>{brl(Number(exp.amount))}</TableCell>
                  <TableCell>
                    <Badge color={exp.status === 'paid' ? 'emerald' : 'amber'}>
                      {exp.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(exp.expense_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Flex className="gap-2 justify-start">
                      <Button 
                        size="xs" 
                        variant="light" 
                        color={exp.status === 'paid' ? 'amber' : 'emerald'}
                        icon={exp.status === 'paid' ? Clock : CheckCircle}
                        onClick={() => toggleStatus.mutate({ id: exp.id, status: exp.status })}
                      >
                        {exp.status === 'paid' ? 'Pendente' : 'Pago'}
                      </Button>
                      <Button 
                        size="xs" 
                        variant="light" 
                        color="rose"
                        icon={Trash2}
                        onClick={() => {
                          if (confirm("Deseja realmente excluir esta despesa?")) {
                            deleteExpense.mutate(exp.id);
                          }
                        }}
                      />
                    </Flex>
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
