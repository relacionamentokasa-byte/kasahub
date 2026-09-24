import React, { useState } from "react";
import {
  MessageSquare,
  Send,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Sparkles,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";

interface KasaSupportViewProps {
  clientName?: string;
  clientBrandColor?: string;
}

interface TicketItem {
  id: string;
  title: string;
  category: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  last_message: string;
}

export function KasaSupportView({
  clientName = "Cliente",
  clientBrandColor = "#FFBC45",
}: KasaSupportViewProps) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("demanda");
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<TicketItem[]>([
    {
      id: "tk-101",
      title: "Solicitação de nova arte para feira do setor",
      category: "Nova Demanda",
      status: "in_progress",
      created_at: "18/09/2026",
      last_message: "Equipe de design Kasa iniciou a criação dos formatos solicitados.",
    },
    {
      id: "tk-98",
      title: "Dúvida sobre relatório de performance de agosto",
      category: "Estratégia & Resultados",
      status: "resolved",
      created_at: "10/09/2026",
      last_message: "Alinhado durante a reunião quinzenal com o gestor de conta.",
    },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    const newTicket: TicketItem = {
      id: `tk-${Math.floor(100 + Math.random() * 900)}`,
      title: subject,
      category:
        category === "demanda"
          ? "Nova Demanda"
          : category === "ajuste"
          ? "Ajuste Operacional"
          : "Dúvida Geral",
      status: "open",
      created_at: "Hoje",
      last_message: message,
    };

    setTickets([newTicket, ...tickets]);
    setSubject("");
    setMessage("");
    toast.success("Solicitação enviada com sucesso ao seu time dedicado Kasa!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Header do Módulo — Padrão Clean Kasa Hub */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-4">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296]">
            ATENDIMENTO · SUPORTE & CHAMADOS
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-0.5">
            Central de Suporte & Atendimento
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Fale diretamente com o time de contas, estratégia e criação dedicado à {clientName}.
          </p>
        </div>

        <a
          href="https://wa.me/5511999999999"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-xl bg-[#0C1618] hover:bg-[#1C2A2D] text-white font-bold text-xs shadow-xs transition flex items-center gap-2 self-start sm:self-auto"
        >
          <PhoneCall className="size-3.5 text-emerald-400" />
          <span>WhatsApp Direto Kasa</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulário de Abertura de Chamado (Col 1-7) */}
        <div className="lg:col-span-7 bg-white border border-[#E9E4DC] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="border-b border-[#F0EBE1] pb-4">
            <h3 className="text-sm font-bold text-[#0C1618]">
              Abrir Nova Solicitação
            </h3>
            <p className="text-xs text-[#6A787B] mt-0.5">
              Nossa equipe responde em média em até 2 horas úteis.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0C1618]">Assunto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Briefing para novo carrossel institucional"
                className="w-full bg-[#FAF8F5] border border-[#E9E4DC] rounded-xl px-3.5 py-2.5 text-xs text-[#0C1618] focus:outline-none focus:border-[#0C1618]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0C1618]">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E9E4DC] rounded-xl px-3.5 py-2.5 text-xs text-[#0C1618] focus:outline-none focus:border-[#0C1618]"
              >
                <option value="demanda">Nova Demanda / Criação</option>
                <option value="ajuste">Ajuste de Conteúdo</option>
                <option value="duvida">Estratégia & Métricas</option>
                <option value="financeiro">Financeiro / Contrato</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0C1618]">Mensagem / Detalhes</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva com detalhes a sua necessidade, referências ou prazos desejados..."
                rows={4}
                className="w-full bg-[#FAF8F5] border border-[#E9E4DC] rounded-xl p-3.5 text-xs text-[#0C1618] focus:outline-none focus:border-[#0C1618]"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                className="text-xs font-medium text-[#6A787B] hover:text-[#0C1618] flex items-center gap-1.5 transition"
              >
                <Paperclip className="size-3.5" />
                <span>Anexar arquivos</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0C1618] hover:bg-[#1C2A2D] text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98] flex items-center gap-2"
              >
                <Send className="size-3.5 text-amber-400" />
                <span>Enviar Chamado</span>
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Solicitações Anteriores (Col 8-12) */}
        <div className="lg:col-span-5 bg-white border border-[#E9E4DC] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#0C1618] flex items-center gap-2">
            <Clock className="size-4 text-[#0C1618]" />
            <span>Suas Solicitações Recentes</span>
          </h3>

          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-xl border border-[#E9E4DC] bg-white hover:bg-[#FAF8F5] space-y-2 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono-kasa font-bold uppercase text-[#869296]">
                    {t.category} · {t.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      t.status === "resolved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                        : t.status === "in_progress"
                        ? "bg-blue-50 text-blue-700 border-blue-200/60"
                        : "bg-orange-50 text-orange-700 border-orange-200/60"
                    }`}
                  >
                    {t.status === "resolved"
                      ? "Resolvido"
                      : t.status === "in_progress"
                      ? "Em Análise"
                      : "Aberto"}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-[#0C1618]">
                  {t.title}
                </h4>

                <p className="text-[11px] text-[#6A787B] line-clamp-2 leading-relaxed">
                  {t.last_message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
