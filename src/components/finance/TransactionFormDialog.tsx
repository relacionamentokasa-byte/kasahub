import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarIcon, Loader2, Building2, Paperclip, Upload, X, FileText, Home } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fetchCategoriasFinanceiras } from "@/lib/categorias-financeiras-api";
import { fetchContasBancarias } from "@/lib/contas-bancarias-api";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/utils-format";
import { createTransaction, updateTransaction } from "@/lib/finance-api";
import { fetchClients } from "@/lib/ops-api";
import { fetchSuppliers } from "@/lib/suppliers-api";
import { fetchPartners } from "@/lib/partners-api";
import { fetchCompanyPartners } from "@/lib/partners-finance-api";
import { supabase } from "@/integrations/supabase/client";
import { SuppliersManagerDialog } from "./SuppliersManagerDialog";

const MOTIVO_OPTIONS = [
  { value: "multa", label: "Multa" },
  { value: "juros", label: "Juros" },
  { value: "multa_juros", label: "Multa + Juros" },
  { value: "desconto", label: "Desconto" },
  { value: "reajuste", label: "Reajuste" },
  { value: "outro", label: "Outro" },
];

const transactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer", "adjustment"]),
  category: z.string().min(1, "A categoria é obrigatória"),
  description: z.string().min(1, "A descrição é obrigatória"),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que zero"),
  due_date: z.date({ required_error: "A data é obrigatória" }),
  status: z.enum(["pending", "paid"]),
  client_id: z.string().optional(),
  supplier_id: z.string().optional(),
  freelancer_id: z.string().optional(),
  conta_id: z.string().min(1, "A conta bancária é obrigatória"),
  nature: z.enum(["operacional", "nao_operacional"]),
  partner_id: z.string().optional(),
  valor_real: z.string().optional(),
  motivo_diferenca: z.string().optional(),
  observacao_diferenca: z.string().optional(),
  boleto_pdf_path: z.string().nullable().optional(),
  boleto_linha_digitavel: z.string().max(200).nullable().optional(),
  boleto_pix_copia_cola: z.string().max(2000).nullable().optional(),
  is_internal: z.boolean().optional(),
});


type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: any | null;
}

export function TransactionFormDialog({ open, onOpenChange, transaction }: TransactionFormDialogProps) {
  const queryClient = useQueryClient();
  const [suppliersManagerOpen, setSuppliersManagerOpen] = useState(false);
  const isEdit = !!transaction;

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: categorias = [] } = useQuery({ queryKey: ["categorias_financeiras"], queryFn: fetchCategoriasFinanceiras });
  const { data: contas = [] } = useQuery({ queryKey: ["contas_bancarias"], queryFn: fetchContasBancarias });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers });
  const { data: freelancers = [] } = useQuery({ queryKey: ["partners", "freelancer"], queryFn: () => fetchPartners("freelancer") });
  const { data: companyPartners = [] } = useQuery({ queryKey: ["company_partners"], queryFn: fetchCompanyPartners });

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "income",
      status: "pending",
      due_date: new Date(),
      nature: "operacional",
      is_internal: false,
    },
  });

  // Hydrate form when editing
  useEffect(() => {
    if (!open) return;
    if (transaction) {
      form.reset({
        type: (transaction.type as any) || "income",
        category: transaction.category || "",
        description: transaction.description || "",
        amount: Number(transaction.valor_previsto ?? transaction.amount ?? 0),
        due_date: transaction.due_date ? new Date(transaction.due_date + "T00:00:00") : new Date(),
        status: (transaction.status === "paid" ? "paid" : "pending") as any,
        client_id: transaction.client_id || "none",
        supplier_id: transaction.supplier_id || "none",
        freelancer_id: transaction.freelancer_id || "none",
        conta_id: transaction.conta_id || "",
        nature: (transaction.nature as any) || "operacional",
        partner_id: transaction.partner_id || "none",
        valor_real: transaction.valor_real != null ? String(transaction.valor_real) : "",
        motivo_diferenca: transaction.motivo_diferenca || "",
        observacao_diferenca: transaction.observacao_diferenca || "",
        boleto_pdf_path: transaction.boleto_pdf_path || null,
        boleto_linha_digitavel: transaction.boleto_linha_digitavel || "",
        boleto_pix_copia_cola: transaction.boleto_pix_copia_cola || "",
        is_internal: !!transaction.is_internal,
      });

    } else {
      form.reset({
        type: "income",
        status: "pending",
        due_date: new Date(),
        nature: "operacional",
        is_internal: false,
      });
    }
  }, [open, transaction]);

  const watchType = form.watch("type");
  const watchCategory = form.watch("category");
  const isFreelancerCategory = watchCategory === "Freelancers e Terceirizados";
  const isProLaboreCategory =
    (watchCategory || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim() === "pro-labore"
    || (watchCategory || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === "pro labore";

  useEffect(() => {
    if (isProLaboreCategory) {
      form.setValue("client_id", "none");
      form.setValue("supplier_id", "none");
      form.setValue("freelancer_id", "none");
      form.setValue("partner_id", "none");
    }
  }, [isProLaboreCategory]);
  const watchAmount = Number(form.watch("amount") || 0);
  const watchValorReal = form.watch("valor_real");
  const real = watchValorReal === "" || watchValorReal == null ? null : parseFloat(String(watchValorReal).replace(",", ".")) || 0;
  const diff = real != null ? real - watchAmount : 0;
  const hasDiff = real != null && Math.abs(diff) > 0.005;

  const mutation = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      const partnerId = values.partner_id && values.partner_id !== "none" ? values.partner_id : null;
      const clientId = values.client_id === "none" || !values.client_id ? null : values.client_id;
      const supplierId = values.supplier_id === "none" || !values.supplier_id ? null : values.supplier_id;
      const freelancerId = values.freelancer_id === "none" || !values.freelancer_id ? null : values.freelancer_id;
      const useFreelancer = values.category === "Freelancers e Terceirizados";

      if (isEdit) {
        const realNum = values.valor_real === "" || values.valor_real == null
          ? null
          : parseFloat(String(values.valor_real).replace(",", ".")) || 0;
        const patch: any = {
          type: values.type,
          kind: values.type === "income" ? "income" : values.type === "expense" ? "expense" : values.type,
          status: values.status,
          category: values.category,
          description: values.description,
          amount: realNum != null ? realNum : values.amount,
          valor_previsto: values.amount,
          valor_real: realNum,
          motivo_diferenca: hasDiff ? values.motivo_diferenca || null : null,
          observacao_diferenca: hasDiff ? values.observacao_diferenca || null : null,
          due_date: format(values.due_date, "yyyy-MM-dd"),
          payment_date: values.status === "paid"
            ? (transaction?.payment_date || format(new Date(), "yyyy-MM-dd"))
            : null,
          client_id: clientId,
          supplier_id: useFreelancer ? null : supplierId,
          freelancer_id: useFreelancer ? freelancerId : null,
          conta_id: values.conta_id,
          nature: values.nature,
          boleto_pdf_path: values.type === "income" ? (values.boleto_pdf_path || null) : null,
          boleto_linha_digitavel: values.type === "income" ? (values.boleto_linha_digitavel?.trim() || null) : null,
          boleto_pix_copia_cola: values.type === "income" ? (values.boleto_pix_copia_cola?.trim() || null) : null,
        };
        return updateTransaction(transaction.id, patch);
      }


      // CREATE
      const payload: any = {
        type: values.type,
        kind: values.type === "income" ? "income" : values.type === "expense" ? "expense" : values.type,
        status: values.status,
        category: values.category,
        description: values.description,
        amount: values.amount,
        valor_previsto: values.amount,
        due_date: format(values.due_date, "yyyy-MM-dd"),
        payment_date: values.status === "paid" ? format(new Date(), "yyyy-MM-dd") : null,
        client_id: clientId,
        supplier_id: useFreelancer ? null : supplierId,
        freelancer_id: useFreelancer ? freelancerId : null,
        conta_id: values.conta_id,
        nature: values.nature,
        boleto_pdf_path: values.type === "income" ? (values.boleto_pdf_path || null) : null,
        boleto_linha_digitavel: values.type === "income" ? (values.boleto_linha_digitavel?.trim() || null) : null,
        boleto_pix_copia_cola: values.type === "income" ? (values.boleto_pix_copia_cola?.trim() || null) : null,
      };

      if (partnerId && values.type === "expense") {
        payload.category = payload.category || "Vale Sócio";
      }
      const tx = await createTransaction(payload);
      if (partnerId && values.type === "expense") {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("partner_advances" as any).insert({
          partner_id: partnerId,
          amount: values.amount,
          advance_date: format(values.due_date, "yyyy-MM-dd"),
          description: values.description,
          transaction_id: (tx as any)?.id ?? null,
          created_by: user?.id ?? null,
        });
      }
      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["contas_bancarias"] });
      queryClient.invalidateQueries({ queryKey: ["finance-stats"] });
      queryClient.invalidateQueries({ queryKey: ["partner_advances"] });
      toast.success(isEdit ? "Lançamento atualizado." : "Lançamento registrado com sucesso!");
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error saving transaction:", error);
      toast.error(error?.message || "Erro ao salvar lançamento.");
    },
  });

  const onSubmit = (values: TransactionFormValues) => {
    if (isEdit && hasDiff && !values.motivo_diferenca) {
      toast.error("Selecione o motivo da diferença entre valor previsto e valor real.");
      return;
    }
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Editar Lançamento" : "Novo Lançamento Financeiro"}
            {isEdit && (transaction as any)?.number_display && (
              <span className="text-xs font-mono-kasa font-bold text-muted-foreground bg-muted/40 border border-border/60 rounded px-2 py-0.5">
                {(transaction as any).number_display}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">Receita</SelectItem>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="transfer">Transferência</SelectItem>
                        <SelectItem value="adjustment">Ajuste de Saldo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago/Recebido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(watchType === "income" || watchType === "expense") && (
              <FormField
                control={form.control}
                name="nature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchType === "income" ? "Natureza da receita" : "Natureza da despesa"}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {watchType === "income" ? (
                          <>
                            <SelectItem value="operacional">
                              Operacional (entra na distribuição aos sócios)
                            </SelectItem>
                            <SelectItem value="nao_operacional">
                              Não-operacional (consórcio, venda de ativo, reembolso…)
                            </SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="operacional">
                              Operacional (entra no cálculo de lucro)
                            </SelectItem>
                            <SelectItem value="nao_operacional">
                              Não-operacional (investimento, aporte, despesa de sócio…)
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => {
                const tipoFiltro = watchType === "income" ? "Receita" : watchType === "expense" ? "Despesa" : null;
                const filtered = tipoFiltro ? categorias.filter((c) => c.tipo === tipoFiltro) : categorias;
                return (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            watchType === "income"
                              ? "Selecione uma categoria de receita..."
                              : watchType === "expense"
                              ? "Selecione uma categoria de despesa..."
                              : "Selecione uma categoria..."
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filtered.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            Nenhuma categoria. Cadastre em "Categorias".
                          </div>
                        ) : (
                          filtered.map((c) => (
                            <SelectItem key={c.id} value={c.nome}>
                              {c.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição / Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pagamento Mensalidade..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isEdit ? "Valor previsto (R$)" : "Valor (R$)"}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mt-1">Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEdit && (
              <div className="space-y-3 rounded-xl border border-dashed border-border bg-surface/40 p-3">
                <FormField
                  control={form.control}
                  name="valor_real"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">💵 Valor real do boleto/recebimento (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Deixe vazio se o valor real é igual ao previsto"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-[11px] text-muted-foreground">
                        Preencha quando o valor pago/recebido for diferente do previsto.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {hasDiff && (
                  <div className="rounded-lg border-2 border-orange-500/30 bg-orange-500/5 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono-kasa uppercase tracking-wider text-orange-600">
                        📊 Diferença
                      </span>
                      <span className={cn("text-sm font-bold tabular-nums", diff > 0 ? "text-orange-600" : "text-emerald-600")}>
                        {diff > 0 ? "+" : ""}{brl(diff)}
                      </span>
                    </div>
                    <FormField
                      control={form.control}
                      name="motivo_diferenca"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Motivo *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o motivo..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MOTIVO_OPTIONS.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="observacao_diferenca"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Observação</FormLabel>
                          <FormControl>
                            <Textarea rows={2} placeholder="Ex: Multa de 2% por atraso..." {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            {watchType !== "expense" && (
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company || client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchType === "expense" && !isProLaboreCategory && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Nenhum" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.company || client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isFreelancerCategory ? (
                  <FormField
                    control={form.control}
                    name="freelancer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Freelancer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um freelancer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {freelancers.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                Nenhum cadastrado em Parceiros → Freelancers.
                              </div>
                            ) : (
                              freelancers.map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.name}{f.specialty ? ` — ${f.specialty}` : ""}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="supplier_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between gap-2">
                          <span>Fornecedor / Órgão</span>
                          <button
                            type="button"
                            onClick={() => setSuppliersManagerOpen(true)}
                            className="text-[10px] text-primary hover:underline font-normal"
                          >
                            + gerenciar
                          </button>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {suppliers.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                Nenhum cadastrado.
                              </div>
                            ) : (
                              suppliers.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  <span className="inline-flex items-center gap-1.5">
                                    <Building2 className="size-3" />
                                    {s.name}
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {watchType === "expense" && !isEdit && !isProLaboreCategory && (
              <FormField
                control={form.control}
                name="partner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vale de Sócio (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um sócio para descontar da distribuição" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum (despesa comum)</SelectItem>
                        {companyPartners.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="conta_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta Bancária</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conta bancária" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contas.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Nenhuma conta. Cadastre em "Contas".
                        </div>
                      ) : (
                        contas.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchType === "income" && (
              <BoletoAttachmentSection form={form} />
            )}

            <DialogFooter className="pt-4">

              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Salvar alterações" : "Salvar Lançamento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      <SuppliersManagerDialog
        open={suppliersManagerOpen}
        onOpenChange={setSuppliersManagerOpen}
      />
    </Dialog>
  );
}

function BoletoAttachmentSection({ form }: { form: any }) {
  const [uploading, setUploading] = useState(false);
  const pdfPath: string | null = form.watch("boleto_pdf_path") || null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Envie um arquivo PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 10MB).");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `manual/${user?.id || "anon"}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("boletos").upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (error) throw error;
      form.setValue("boleto_pdf_path", path, { shouldDirty: true });
      toast.success("Boleto anexado!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Falha ao enviar boleto.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemove() {
    if (!pdfPath) return;
    try {
      await supabase.storage.from("boletos").remove([pdfPath]);
    } catch {
      /* ignore */
    }
    form.setValue("boleto_pdf_path", null, { shouldDirty: true });
  }

  const fileName = pdfPath?.split("/").pop() || "boleto.pdf";

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/40 p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs font-mono-kasa uppercase tracking-wider text-muted-foreground">
        <Paperclip className="size-3.5" /> Boleto do cliente (aparece no portal)
      </div>

      <FormField
        control={form.control}
        name="boleto_pdf_path"
        render={() => (
          <FormItem>
            <FormLabel className="text-xs">PDF do boleto</FormLabel>
            {pdfPath ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5">
                <FileText className="size-4 text-primary" />
                <span className="text-xs truncate flex-1">{fileName}</span>
                <Button type="button" size="icon" variant="ghost" onClick={handleRemove}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <label className={cn(
                "flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-3 text-xs cursor-pointer hover:bg-muted/40 transition-colors",
                uploading && "opacity-60 pointer-events-none"
              )}>
                {uploading ? (
                  <><Loader2 className="size-4 animate-spin" /> Enviando…</>
                ) : (
                  <><Upload className="size-4" /> Anexar PDF (máx 10MB)</>
                )}
                <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
              </label>
            )}
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="boleto_linha_digitavel"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">Linha digitável (opcional)</FormLabel>
            <FormControl>
              <Input
                placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="boleto_pix_copia_cola"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">PIX copia e cola (opcional)</FormLabel>
            <FormControl>
              <Textarea
                rows={2}
                placeholder="00020126..."
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

