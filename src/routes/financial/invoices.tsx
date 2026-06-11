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
  Title,
  Flex,
} from "@tremor/react";
import { useState } from "react";
import { Plus, Search, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/financial/invoices")({
  component: InvoicesPage,
});

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function InvoicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["financial", "invoices", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("financial_invoices")
        .select("*, clients(company, name), proposals(title)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (search) {
        return data.filter(inv => 
          inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
          (inv.clients as any)?.company?.toLowerCase().includes(search.toLowerCase()) ||
          (inv.clients as any)?.name?.toLowerCase().includes(search.toLowerCase())
        );
      }

      return data;
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_invoices")
        .update({ 
          status: "paid", 
          paid_at: new Date().toISOString() 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial", "invoices"] });
      toast.success("Fatura marcada como paga!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar fatura: " + error.message);
    }
  });

  const cancelInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_invoices")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial", "invoices"] });
      toast.success("Fatura cancelada com sucesso.");
    },
    onError: (error) => {
      toast.error("Erro ao cancelar fatura: " + error.message);
    }
  });

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <Flex className="items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faturas</h1>
          <p className="text-muted-foreground">Gestão de faturamento e recebíveis.</p>
        </div>
        <Button icon={Plus} color="indigo">Nova Fatura</Button>
      </Flex>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <TextInput 
              placeholder="Buscar por número ou cliente..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
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
                <TableHeaderCell>Número</TableHeaderCell>
                <TableHeaderCell>Cliente</TableHeaderCell>
                <TableHeaderCell>Proposta</TableHeaderCell>
                <TableHeaderCell>Valor</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Vencimento</TableHeaderCell>
                <TableHeaderCell>Ações</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{(inv.clients as any)?.company || (inv.clients as any)?.name || "—"}</TableCell>
                  <TableCell>{(inv.proposals as any)?.title || "Manual"}</TableCell>
                  <TableCell>{brl(Number(inv.amount))}</TableCell>
                  <TableCell>
                    <Badge color={
                      inv.status === 'paid' ? 'emerald' :
                      inv.status === 'pending' ? 'amber' :
                      inv.status === 'overdue' ? 'rose' : 'slate'
                    }>
                      {inv.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(inv.due_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Flex className="gap-2 justify-start">
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <Button 
                          size="xs" 
                          variant="light" 
                          color="emerald"
                          icon={CheckCircle}
                          onClick={() => markAsPaid.mutate(inv.id)}
                        >
                          Pago
                        </Button>
                      )}
                      {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                        <Button 
                          size="xs" 
                          variant="light" 
                          color="rose"
                          icon={XCircle}
                          onClick={() => cancelInvoice.mutate(inv.id)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </Flex>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhuma fatura encontrada.
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
