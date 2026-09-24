import React, { useState } from "react";
import {
  Wallet,
  Receipt,
  FileCheck2,
  Download,
  Copy,
  CheckCircle2,
  Calendar,
  Clock,
  AlertCircle,
  ExternalLink,
  CreditCard,
  QrCode,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date?: string | null;
  status: "paid" | "pending" | "overdue" | string;
  payment_method?: string | null;
  boleto_pdf_url?: string | null;
  boleto_linha_digitavel?: string | null;
  boleto_pix_copia_cola?: string | null;
}

export interface ContractInfo {
  id: string;
  title: string;
  monthly_value?: number | null;
  total_value?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  public_token?: string | null;
}

interface KasaFinancialViewProps {
  invoices?: InvoiceItem[];
  contract?: ContractInfo | null;
  clientBrandColor?: string;
  clientName?: string;
}

export function KasaFinancialView({
  invoices = [],
  contract,
  clientBrandColor = "#FFBC45",
  clientName = "Cliente",
}: KasaFinancialViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const sampleInvoices: InvoiceItem[] =
    invoices.length > 0
      ? invoices
      : [
          {
            id: "inv-1",
            description: "Assessoria de Marketing & Conteúdo - Outubro/2026",
            amount: 4500,
            due_date: "2026-10-10",
            status: "pending",
            boleto_pix_copia_cola: "00020126580014br.gov.bcb.pix0136kasa-pagamentos-exemplo-chave-pix",
          },
          {
            id: "inv-2",
            description: "Assessoria de Marketing & Conteúdo - Setembro/2026",
            amount: 4500,
            due_date: "2026-09-10",
            payment_date: "2026-09-09",
            status: "paid",
          },
          {
            id: "inv-3",
            description: "Assessoria de Marketing & Conteúdo - Agosto/2026",
            amount: 4500,
            due_date: "2026-08-10",
            payment_date: "2026-08-10",
            status: "paid",
          },
        ];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.success("Código PIX copiado para a área de transferência!");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Header do Módulo — Padrão Clean Kasa Hub */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-4">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296]">
            GESTÃO · FINANCEIRO & CONTRATOS
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-0.5">
            Financeiro & Contratos
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Gerencie contratos, faturas, recibos e formas de pagamento da {clientName}.
          </p>
        </div>
      </div>

      {/* Card de Contrato Vigente — Padrão Clean */}
      <div className="bg-white border border-[#E9E4DC] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-kasa uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Contrato Vigente
            </span>
          </div>
          <h2 className="text-base font-bold text-[#0C1618]">
            {contract?.title || "Assessoria Estratégica Mensal & Produção"}
          </h2>
          <p className="text-xs text-[#6A787B]">
            Vigência anual com renovação automática · Atendimento dedicado Kasa Marketing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t md:border-t-0 md:border-l border-[#F0EBE1] pt-4 md:pt-0 md:pl-6">
          <div>
            <p className="text-[10px] uppercase font-bold text-[#869296] font-mono-kasa">
              Investimento Mensal
            </p>
            <p className="text-xl font-bold font-mono-kasa text-[#0C1618] mt-0.5">
              R$ {((contract?.monthly_value || 4500) as number).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>

          {contract?.public_token && (
            <a
              href={`/proposta/${contract.public_token}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F0EBE1] text-[#0C1618] text-xs font-bold transition flex items-center gap-1.5 border border-[#E9E4DC]"
            >
              <FileCheck2 className="size-3.5" />
              <span>Ver Contrato</span>
            </a>
          )}
        </div>
      </div>

      {/* Lista de Faturas & Pagamentos */}
      <div className="bg-white border border-[#E9E4DC] rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#0C1618] flex items-center gap-2">
          <Receipt className="size-4 text-[#0C1618]" />
          <span>Histórico de Faturas & Mensalidades</span>
        </h3>

        <div className="divide-y divide-[#F0EBE1]">
          {sampleInvoices.map((inv) => {
            const isPaid = inv.status === "paid";
            const dueDate = new Date(inv.due_date);

            return (
              <div
                key={inv.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-2 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isPaid
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {isPaid ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                            : "bg-orange-50 text-orange-700 border-orange-200/60"
                        }`}
                      >
                        {isPaid ? "Pago" : "Aguardando Pagamento"}
                      </span>
                      <span className="text-xs text-[#869296] font-mono-kasa">
                        Vencimento: {format(dueDate, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#0C1618] mt-1">
                      {inv.description}
                    </h4>

                    {isPaid && inv.payment_date && (
                      <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                        Liquidado em {format(new Date(inv.payment_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto">
                  <div className="text-right">
                    <p className="text-[10px] text-[#869296] font-mono-kasa uppercase">Valor</p>
                    <p className="text-sm font-bold font-mono-kasa text-[#0C1618]">
                      R$ {inv.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {!isPaid && inv.boleto_pix_copia_cola && (
                    <button
                      type="button"
                      onClick={() => handleCopy(inv.boleto_pix_copia_cola!, inv.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#0C1618] hover:bg-[#1C2A2D] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                    >
                      <QrCode className="size-3.5 text-amber-400" />
                      <span>{copiedKey === inv.id ? "Copiado!" : "Copiar PIX"}</span>
                    </button>
                  )}

                  {inv.boleto_pdf_url && (
                    <a
                      href={inv.boleto_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="size-8 rounded-lg bg-[#FAF8F5] hover:bg-[#0C1618] text-[#0C1618] hover:text-white border border-[#E9E4DC] flex items-center justify-center transition"
                      title="Baixar Boleto / Recibo"
                    >
                      <Download className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
