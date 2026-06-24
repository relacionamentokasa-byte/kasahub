import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { getDmeBatchPublicUrl } from "@/lib/dme-batches-api";

function sanitize(s?: string | null): string {
  if (s == null) return "";
  let out = String(s).normalize("NFC");
  out = out.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{1F000}-\u{1F02F}\u{1F100}-\u{1F1FF}\u{FE0F}]/gu,
    "",
  );
  out = out.replace(/[^\u0000-\u00FF]/g, "");
  return out.replace(/\s+/g, " ").trim();
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export async function generateDmeBatchPdf(batchId: string): Promise<void> {
  const { data: batch, error: bErr } = await supabase
    .from("dme_batches" as any)
    .select("*, clients(name, company)")
    .eq("id", batchId)
    .maybeSingle();
  if (bErr) throw bErr;
  if (!batch) throw new Error("Lote não encontrado.");
  const b = batch as any;

  const { data: items, error: iErr } = await supabase
    .from("dme_batch_items" as any)
    .select(
      "extra_demand_id, extra_demands(id, number_display, title, description, value, due_date)",
    )
    .eq("batch_id", batchId);
  if (iErr) throw iErr;

  const dmes = (items ?? [])
    .map((i: any) => i.extra_demands)
    .filter(Boolean);

  const { data: agency } = await supabase
    .from("agency_settings")
    .select("name, logo_url")
    .maybeSingle();

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header
  doc.setFillColor(12, 22, 24);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor(255, 188, 69);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SOLICITAÇÃO DE APROVAÇÃO", margin, 35);
  doc.setTextColor(244, 247, 245);
  doc.setFontSize(20);
  doc.text("Demandas Extras — Lote", margin, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(156, 177, 176);
  doc.text(
    sanitize(b.clients?.company || b.clients?.name || "Cliente"),
    margin,
    78,
  );

  if (agency?.name) {
    doc.setFontSize(9);
    doc.text(sanitize(agency.name), pageW - margin, 35, { align: "right" });
  }

  let y = 120;
  doc.setTextColor(15, 23, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${dmes.length} demanda${dmes.length !== 1 ? "s" : ""} para aprovação`, margin, y);
  y += 8;

  // Table
  autoTable(doc, {
    startY: y + 6,
    head: [["#", "Demanda", "Prazo", "Valor"]],
    body: dmes.map((d: any) => [
      sanitize(d.number_display || ""),
      sanitize(
        [d.title, d.description].filter(Boolean).join("\n"),
      ),
      d.due_date
        ? new Date(d.due_date + "T00:00:00").toLocaleDateString("pt-BR")
        : "—",
      brl(Number(d.value || 0)),
    ]),
    foot: [["", "", "TOTAL", brl(Number(b.total_value || 0))]],
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 8,
      textColor: [15, 23, 25],
      lineColor: [228, 232, 230],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [12, 22, 24],
      textColor: [255, 188, 69],
      fontStyle: "bold",
      fontSize: 9,
    },
    footStyles: {
      fillColor: [246, 248, 246],
      textColor: [15, 23, 25],
      fontStyle: "bold",
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      2: { cellWidth: 70, halign: "center" },
      3: { cellWidth: 90, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore lastAutoTable injected by autoTable
  let afterY = (doc as any).lastAutoTable.finalY + 24;

  if (b.due_date) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 128, 127);
    doc.text(
      `Vencimento sugerido: ${new Date(b.due_date + "T00:00:00").toLocaleDateString("pt-BR")}`,
      margin,
      afterY,
    );
    afterY += 18;
  }

  // Approval link box
  const approvalUrl = getDmeBatchPublicUrl(b.public_token);
  doc.setDrawColor(255, 188, 69);
  doc.setFillColor(255, 240, 210);
  doc.roundedRect(margin, afterY, pageW - margin * 2, 70, 8, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 25);
  doc.text("Aprovar online (assinatura digital)", margin + 16, afterY + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 70, 70);
  doc.text(
    "Acesse o link abaixo para revisar, aprovar ou recusar este lote:",
    margin + 16,
    afterY + 38,
  );
  doc.setTextColor(20, 60, 120);
  doc.setFont("helvetica", "bold");
  doc.textWithLink(sanitize(approvalUrl), margin + 16, afterY + 56, { url: approvalUrl });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
    margin,
    doc.internal.pageSize.getHeight() - 20,
  );

  const clientSlug = sanitize(b.clients?.company || b.clients?.name || "cliente")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`lote-dmes-${clientSlug || "cliente"}.pdf`);
}

/**
 * PDF de um "lote consolidado" — DMEs já aprovadas e agrupadas em uma única
 * transação financeira (consolidated_transaction_id), sem registro em
 * dme_batches. Não inclui link de aprovação (já está aprovado).
 */
export async function generateConsolidatedTxPdf(consolidatedTransactionId: string): Promise<void> {
  const { data: tx, error: tErr } = await supabase
    .from("transactions")
    .select("id, amount, description, due_date, client_id, clients(name, company)")
    .eq("id", consolidatedTransactionId)
    .maybeSingle();
  if (tErr) throw tErr;
  if (!tx) throw new Error("Cobrança consolidada não encontrada.");
  const t = tx as any;

  const { data: dmes, error: dErr } = await supabase
    .from("extra_demands")
    .select("id, number_display, title, description, value, due_date")
    .eq("consolidated_transaction_id", consolidatedTransactionId);
  if (dErr) throw dErr;
  const list = (dmes ?? []) as any[];

  const { data: agency } = await supabase
    .from("agency_settings")
    .select("name, logo_url")
    .maybeSingle();

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFillColor(12, 22, 24);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor(255, 188, 69);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DEMANDAS EXTRAS — COBRANÇA CONSOLIDADA", margin, 35);
  doc.setTextColor(244, 247, 245);
  doc.setFontSize(20);
  doc.text("Lote Consolidado", margin, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(156, 177, 176);
  doc.text(sanitize(t.clients?.company || t.clients?.name || "Cliente"), margin, 78);

  if (agency?.name) {
    doc.setFontSize(9);
    doc.text(sanitize(agency.name), pageW - margin, 35, { align: "right" });
  }

  let y = 120;
  doc.setTextColor(15, 23, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${list.length} demanda${list.length !== 1 ? "s" : ""} consolidada${list.length !== 1 ? "s" : ""}`, margin, y);
  y += 8;

  autoTable(doc, {
    startY: y + 6,
    head: [["#", "Demanda", "Prazo", "Valor"]],
    body: list.map((d) => [
      sanitize(d.number_display || ""),
      sanitize([d.title, d.description].filter(Boolean).join("\n")),
      d.due_date ? new Date(d.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—",
      brl(Number(d.value || 0)),
    ]),
    foot: [["", "", "TOTAL", brl(Number(t.amount || 0))]],
    styles: { font: "helvetica", fontSize: 9, cellPadding: 8, textColor: [15, 23, 25], lineColor: [228, 232, 230], lineWidth: 0.5 },
    headStyles: { fillColor: [12, 22, 24], textColor: [255, 188, 69], fontStyle: "bold", fontSize: 9 },
    footStyles: { fillColor: [246, 248, 246], textColor: [15, 23, 25], fontStyle: "bold", fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      2: { cellWidth: 70, halign: "center" },
      3: { cellWidth: 90, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  let afterY = (doc as any).lastAutoTable.finalY + 24;
  if (t.due_date) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 128, 127);
    doc.text(
      `Vencimento: ${new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}`,
      margin,
      afterY,
    );
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, doc.internal.pageSize.getHeight() - 20);

  const slug = sanitize(t.clients?.company || t.clients?.name || "cliente")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`lote-consolidado-${slug || "cliente"}.pdf`);
}
