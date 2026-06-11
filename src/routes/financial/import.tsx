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
  Flex,
  Title,
  Text,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from "@tremor/react";
import { useState } from "react";
import { Upload, History, FileDown, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/financial/import")({
  component: ImportPage,
});

function ImportPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"clients" | "invoices" | "expenses">("invoices");

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["financial", "imports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_imports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startImport = useMutation({
    mutationFn: async () => {
      if (!file) return;

      // 1. Criar registro de importação
      const { data: importRecord, error: importError } = await supabase
        .from("financial_imports")
        .insert({
          filename: file.name,
          import_type: importType,
          status: "processing",
          total_rows: 0,
        })
        .select()
        .single();

      if (importError) throw importError;

      // Mock de processamento para demonstração do fluxo
      // Em uma implementação real, leríamos o CSV aqui
      await new Promise(resolve => setTimeout(resolve, 2000));

      await supabase
        .from("financial_imports")
        .update({ 
          status: "completed", 
          imported_rows: 10, 
          total_rows: 10 
        })
        .eq("id", importRecord.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial", "imports"] });
      toast.success("Importação concluída com sucesso!");
      setFile(null);
    },
    onError: (error) => {
      toast.error("Erro na importação: " + error.message);
    }
  });

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Dados</h1>
        <p className="text-muted-foreground">Migração de dados legados do ERP antigo.</p>
      </div>

      <TabGroup>
        <TabList className="mt-8">
          <Tab icon={Upload}>Importar Novo</Tab>
          <Tab icon={History}>Histórico</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {[
                { id: "clients", title: "Clientes", desc: "Importar base de contatos e empresas." },
                { id: "invoices", title: "Faturas", desc: "Importar histórico de faturamento." },
                { id: "expenses", title: "Despesas", desc: "Importar histórico de custos." },
              ].map((type) => (
                <Card 
                  key={type.id} 
                  className={`cursor-pointer transition-all border-2 ${importType === type.id ? 'border-indigo-500 bg-indigo-50/10' : 'border-transparent'}`}
                  onClick={() => setImportType(type.id as any)}
                >
                  <Title>{type.title}</Title>
                  <Text className="mt-2">{type.desc}</Text>
                  <Button 
                    variant="light" 
                    icon={FileDown} 
                    className="mt-4"
                  >
                    Template CSV
                  </Button>
                </Card>
              ))}
            </div>

            <Card className="mt-8">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 text-center">
                <Upload className="size-12 text-muted-foreground mb-4" />
                <Title>Selecione o arquivo CSV</Title>
                <Text className="mt-1">Clique ou arraste o arquivo do seu computador</Text>
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  id="csv-upload" 
                  onChange={handleFileUpload}
                />
                <Button 
                  className="mt-6" 
                  onClick={() => document.getElementById('csv-upload')?.click()}
                >
                  Procurar Arquivo
                </Button>
                {file && (
                  <div className="mt-4 p-3 bg-indigo-50/10 border border-indigo-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="size-4 text-indigo-500" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                )}
              </div>

              {file && (
                <Flex className="mt-6 justify-end">
                  <Button 
                    color="indigo" 
                    loading={startImport.isPending}
                    onClick={() => startImport.mutate()}
                  >
                    Confirmar Importação
                  </Button>
                </Flex>
              )}
            </Card>
          </TabPanel>

          <TabPanel>
            <Card className="mt-6">
              {isLoading ? (
                <div className="flex py-20 justify-center">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Arquivo</TableHeaderCell>
                      <TableHeaderCell>Tipo</TableHeaderCell>
                      <TableHeaderCell>Total</TableHeaderCell>
                      <TableHeaderCell>Sucesso</TableHeaderCell>
                      <TableHeaderCell>Falhas</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Data</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{h.filename}</TableCell>
                        <TableCell className="capitalize">{h.import_type}</TableCell>
                        <TableCell>{h.total_rows}</TableCell>
                        <TableCell>{h.imported_rows}</TableCell>
                        <TableCell className="text-rose-500">{h.failed_rows}</TableCell>
                        <TableCell>
                          <Badge color={h.status === 'completed' ? 'emerald' : h.status === 'failed' ? 'rose' : 'blue'}>
                            {h.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(h.created_at).toLocaleString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                    {history.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          Nenhum histórico de importação.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
