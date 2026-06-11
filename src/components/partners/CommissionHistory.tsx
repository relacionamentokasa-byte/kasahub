import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { brl } from "@/lib/utils-format";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CheckCircle2, Clock, Filter, List, Download, FileText, FileSpreadsheet } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  partnerId: string;
}

export function CommissionHistory({ partnerId }: Props) {
  const qc = useQueryClient();
  const { isAdmin } = usePermissions();
  const now = new Date();
  const [month, setMonth] = useState<string>((now.getMonth() + 1).toString());
  const [year, setYear] = useState<string>(now.getFullYear().toString());

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ["partner-commissions-history", partnerId, month, year],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, clients(name), contracts(start_date, monthly_value)')
        .eq('partner_id', partnerId)
        .eq('kind', 'expense')
        .order('due_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Local filter for month/year (as we don't have a direct month/year field in DB)
      return data.filter(c => {
        const dueDate = new Date(c.due_date);
        return (dueDate.getMonth() + 1).toString() === month && 
               dueDate.getFullYear().toString() === year;
      });
    }
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ status } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["partner-commissions-history"] });
      qc.invalidateQueries({ queryKey: ["partner-stats"] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const totalMonthly = commissions.reduce((acc, c) => acc + Number(c.amount), 0);

  const years = Array.from({ length: 5 }, (_, i) => (now.getFullYear() - i).toString());
  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const currentMonthLabel = months.find(m => m.value === month)?.label || "";

  const exportToCSV = () => {
    if (commissions.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const headers = ["Cliente", "Valor Contrato", "Mês", "Percentual", "Comissão", "Status", "Data de Vencimento"];
    const rows = commissions.map((c: any) => {
      const contractValue = c.contracts?.monthly_value || 0;
      const commissionPercent = contractValue > 0 ? (c.amount / contractValue) * 100 : 0;
      const monthMatch = c.notes?.match(/Mês (\d+)/);
      const monthText = monthMatch ? monthMatch[1] : "-";
      
      return [
        c.clients?.name || "",
        contractValue.toString(),
        monthText,
        `${commissionPercent.toFixed(0)}%`,
        c.amount.toString(),
        c.status === 'paid' ? 'Pago' : 'Pendente',
        c.due_date
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `comissoes_${currentMonthLabel.toLowerCase()}_${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso");
  };

  const exportToPDF = () => {
    if (commissions.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(12, 22, 24); // #0c1618
    doc.text(`Relatório de Comissões - ${currentMonthLabel} / ${year}`, 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Total no Mês: ${brl(totalMonthly)}`, 14, 30);
    
    const tableHeaders = [["Cliente", "Contrato", "Mês", "%", "Comissão", "Status"]];
    const tableData = commissions.map((c: any) => {
      const contractValue = c.contracts?.monthly_value || 0;
      const commissionPercent = contractValue > 0 ? (c.amount / contractValue) * 100 : 0;
      const monthMatch = c.notes?.match(/Mês (\d+)/);
      
      return [
        c.clients?.name || "",
        brl(contractValue),
        monthMatch ? `Mês ${monthMatch[1]}` : "-",
        `${commissionPercent.toFixed(0)}%`,
        brl(c.amount),
        c.status === 'paid' ? 'Pago' : 'Pendente'
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: tableHeaders,
      body: tableData,
      headStyles: { fillColor: [255, 188, 69] }, // #ffbc45
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    doc.save(`comissoes_${currentMonthLabel.toLowerCase()}_${year}.pdf`);
    toast.success("PDF exportado com sucesso");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <List className="size-5 text-primary" />
          <h3 className="font-display text-lg font-bold uppercase tracking-tight">Painel de Comissões</h3>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-foreground/40" />
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px] h-9 bg-background">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px] h-9 bg-background">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Download className="size-4" />
                <span>Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-surface border-border">
              <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
                <FileText className="size-4" />
                <span>PDF (.pdf)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="size-4" />
                <span>CSV (.csv)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="p-4 bg-background border-primary/30 border-2">
            <p className="text-[10px] uppercase font-mono-kasa text-foreground/40 font-bold mb-1">Total no Mês</p>
            <p className="text-2xl font-bold text-[#ffbc45]">{brl(totalMonthly)}</p>
         </Card>
         <Card className="p-4 bg-background border-border">
            <p className="text-[10px] uppercase font-mono-kasa text-foreground/40 font-bold mb-1">Indicados Pagos</p>
            <p className="text-2xl font-bold">{commissions.filter(c => c.status === 'paid').length}</p>
         </Card>
      </div>

      <Card className="bg-background border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-surface/50">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-mono-kasa">Cliente</TableHead>
              <TableHead className="text-[10px] uppercase font-mono-kasa">Valor Contrato</TableHead>
              <TableHead className="text-[10px] uppercase font-mono-kasa">Mês / %</TableHead>
              <TableHead className="text-[10px] uppercase font-mono-kasa">Comissão</TableHead>
              <TableHead className="text-[10px] uppercase font-mono-kasa">Status</TableHead>
              {isAdmin && <TableHead className="text-right text-[10px] uppercase font-mono-kasa">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-foreground/30">Carregando...</TableCell>
              </TableRow>
            ) : commissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-foreground/30">Nenhuma comissão encontrada para este período.</TableCell>
              </TableRow>
            ) : (
              commissions.map((c: any) => {
                const contractValue = c.contracts?.monthly_value || 0;
                const commissionPercent = contractValue > 0 ? (c.amount / contractValue) * 100 : 0;
                const monthMatch = c.notes?.match(/Mês (\d+)/);
                const monthText = monthMatch ? `Mês ${monthMatch[1]}` : "-";

                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.clients?.name}</TableCell>
                    <TableCell>{brl(contractValue)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{monthText}</span>
                        <span className="text-[10px] text-foreground/40">{commissionPercent.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">{brl(c.amount)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={c.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-none' 
                          : 'bg-amber-500/10 text-amber-500 border-none'
                        }
                      >
                        {c.status === 'paid' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {c.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-[10px] uppercase font-bold text-emerald-500 hover:bg-emerald-500/10"
                            onClick={() => updateStatusMut.mutate({ id: c.id, status: 'paid' })}
                          >
                            Marcar como Pago
                          </Button>
                        )}
                        {c.status === 'paid' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-[10px] uppercase font-bold text-amber-500 hover:bg-amber-500/10"
                            onClick={() => updateStatusMut.mutate({ id: c.id, status: 'pending' })}
                          >
                            Estornar
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
