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
  Grid,
  Metric,
  Text,
} from "@tremor/react";
import { useState } from "react";
import { Plus, Search, Loader2, CheckCircle, FileText, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/financial/extra-demands")({
  component: ExtraDemandsPage,
});

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const STATUS_COLORS: Record<string, any> = {
  proposed: "blue",
  approved: "amber",
  invoiced: "emerald",
  cancelled: "slate",
};

const STATUS_LABELS: Record<string, string> = {
  proposed: "Proposta",
  approved: "Aprovada",
  invoiced: "Faturada",
  cancelled: "Cancelada",
};

function ExtraDemandsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ["financial", "extra-demands", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("financial_extra_demands")
        .select("*, clients(company, name), financial_invoices(invoice_number)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;

      if (search) {
        return data.filter(d => 
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          (d.clients as any)?.company?.toLowerCase().includes(search.toLowerCase())
        );
      }

      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from("financial_extra_demands")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial", "extra-demands"] });
      toast.success("Status atualizado!");
    },
  });

  const generateInvoice = useMutation({
    mutationFn: async (demand: any) => {
      // 1. Criar a fatura
      const invoiceNumber = `FIN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
      
      const { data: invoice, error: invError } = await supabase
        .from("financial_invoices")
        .insert({
          client_id: demand.client_id,
          invoice_number: invoiceNumber,
          title: demand.title,
          amount: demand.amount,
          status: "pending",
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 7 dias
        })
        .select()
        .single();

      if (invError) throw invError;

      // 2. Vincular itens da fatura
      await supabase.from("financial_invoice_items").insert({
        invoice_id: invoice.id,
        description: demand.title,
        quantity: 1,
        unit_price: demand.amount,
        total: demand.amount,
      });

      // 3. Atualizar demanda para faturada
      await supabase
        .from("financial_extra_demands")
        .update({ status: "invoiced", invoice_id: invoice.id })
        .eq("id", demand.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial", "extra-demands"] });
      queryClient.invalidateQueries({ queryKey: ["financial", "invoices"] });
      toast.success("Fatura gerada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao gerar fatura: " + error.message);
    }
  });

  const stats = {
    proposed: demands.filter(d => d.status === 'proposed').reduce((acc, curr) => acc + Number(curr.amount), 0),
    approved: demands.filter(d => d.status === 'approved').reduce((acc, curr) => acc + Number(curr.amount), 0),
    invoiced: demands.filter(d => d.status === 'invoiced').reduce((acc, curr) => acc + Number(curr.amount), 0),
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <Flex className="items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demandas Extras</h1>
          <p className="text-muted-foreground">Gestão de trabalhos extras e faturáveis.</p>
        </div>
        <Button icon={Plus} color="indigo">Nova Demanda</Button>
      </Flex>

      <Grid numItemsSm={2} numItemsLg={3} className="gap-6">
        <Card decoration="top" decorationColor="blue">
          <Text>Propostas</Text>
          <Metric>{brl(stats.proposed)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <Text>Aprovadas (Pipeline)</Text>
          <Metric>{brl(stats.approved)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="emerald">
          <Text>Faturadas</Text>
          <Metric>{brl(stats.invoiced)}</Metric>
        </Card>
      </Grid>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <TextInput 
              placeholder="Buscar por título ou cliente..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="proposed">Proposta</SelectItem>
              <SelectItem value="approved">Aprovada</SelectItem>
              <SelectItem value="invoiced">Faturada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
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
                <TableHeaderCell>Título</TableHeaderCell>
                <TableHeaderCell>Cliente</TableHeaderCell>
                <TableHeaderCell>Valor</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Fatura</TableHeaderCell>
                <TableHeaderCell>Ações</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {demands.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell>{(d.clients as any)?.company || (d.clients as any)?.name || "—"}</TableCell>
                  <TableCell>{brl(Number(d.amount))}</TableCell>
                  <TableCell>
                    <Badge color={STATUS_COLORS[d.status]}>
                      {STATUS_LABELS[d.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{(d.financial_invoices as any)?.invoice_number || "—"}</TableCell>
                  <TableCell>
                    <Flex className="gap-2 justify-start">
                      {d.status === 'proposed' && (
                        <Button 
                          size="xs" 
                          variant="light" 
                          color="amber"
                          icon={CheckCircle}
                          onClick={() => updateStatus.mutate({ id: d.id, status: 'approved' })}
                        >
                          Aprovar
                        </Button>
                      )}
                      {d.status === 'approved' && (
                        <Button 
                          size="xs" 
                          variant="light" 
                          color="emerald"
                          icon={FileText}
                          onClick={() => generateInvoice.mutate(d)}
                        >
                          Faturar
                        </Button>
                      )}
                      {d.status !== 'cancelled' && d.status !== 'invoiced' && (
                        <Button 
                          size="xs" 
                          variant="light" 
                          color="rose"
                          icon={XCircle}
                          onClick={() => updateStatus.mutate({ id: d.id, status: 'cancelled' })}
                        />
                      )}
                    </Flex>
                  </TableCell>
                </TableRow>
              ))}
              {demands.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma demanda encontrada.
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
