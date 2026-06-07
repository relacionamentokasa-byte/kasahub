import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { AlertCircle, Terminal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ceo")({
  head: () => ({ meta: [{ title: "Diagnóstico CEO — KASA HUB" }] }),
  component: CeoDashboard,
});

function CeoDashboard() {
  const { data: logs = [], refetch, isLoading } = useQuery({
    queryKey: ["error-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const clearLogs = async () => {
    if (!confirm("Deseja limpar todos os logs de erro?")) return;
    const { error } = await supabase.from("error_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) toast.error("Falha ao limpar logs");
    else {
      toast.success("Logs removidos");
      refetch();
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display">Diagnóstico do Sistema</h1>
          <p className="text-muted-foreground text-sm">Monitoramento de falhas e logs em tempo real.</p>
        </div>
        <Button variant="outline" size="sm" onClick={clearLogs} className="gap-2 text-rose-500 hover:text-rose-600">
          <Trash2 className="size-4" /> Limpar Logs
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-surface border-border flex items-center gap-4">
          <div className="size-12 rounded-full bg-rose-500/10 flex items-center justify-center">
            <AlertCircle className="size-6 text-rose-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Erros Recentes</p>
            <p className="text-2xl font-bold">{logs.length}</p>
          </div>
        </Card>
      </div>

      <Card className="bg-surface border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
          <Terminal className="size-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-tight">Console de Erros</h2>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[180px]">Data/Hora</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>URL da Página</TableHead>
              <TableHead className="w-[100px]">Contexto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">Carregando logs...</TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Nenhum erro registrado recentemente.</TableCell>
              </TableRow>
            ) : (
              logs.map((log: any) => (
                <TableRow key={log.id} className="font-mono text-[11px] group">
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="font-bold text-rose-500 mb-1">{log.message}</div>
                    {log.stack && (
                      <div className="text-[10px] text-muted-foreground line-clamp-2 group-hover:line-clamp-none transition-all">
                        {log.stack}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[200px]" title={log.page_url}>
                    {log.page_url?.split('/').slice(3).join('/') || '/'}
                  </TableCell>
                  <TableCell>
                    {log.context ? (
                      <Button variant="ghost" size="sm" onClick={() => console.log(log.context)} className="h-6 text-[10px]">
                        Ver JSON
                      </Button>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
