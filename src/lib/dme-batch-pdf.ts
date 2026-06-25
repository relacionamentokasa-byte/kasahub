import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { getDmeBatchPublicUrl } from "@/lib/dme-batches-api";
import { resolveStorageUrl } from "@/lib/use-storage-url";
import { registerBoletimFonts } from "@/lib/pdf-fonts";

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

async function imageToDataURL(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const signed = (await resolveStorageUrl(url)) ?? url;
    const res = await fetch(signed);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawClientLogo(doc: jsPDF, dataUrl: string | null, pageW: number, margin: number) {
  if (!dataUrl) return;
  const size = 56;
  const x = pageW - margin - size;
  const y = (90 - size) / 2;
  // fundo branco arredondado para logos com transparência
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x - 4, y - 4, size + 8, size + 8, 6, 6, "F");
  try {
    const fmt = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
    doc.addImage(dataUrl, fmt, x, y, size, size, undefined, "FAST");
  } catch {
    /* ignore broken image */
  }
}

// Logo Kasa (branca) — exibida no rodapé de todos os PDFs.
// Carregamos via <img> + canvas para garantir que o canal alpha seja
// preservado (caso contrário o jsPDF renderiza um retângulo preto).
import kasaLogoAsset from "@/assets/logo-white.png.asset.json";
let _kasaLogoCache: { dataUrl: string; w: number; h: number } | null | undefined;
async function getKasaLogo(): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (_kasaLogoCache !== undefined) return _kasaLogoCache;
  try {
    const result = await new Promise<{ dataUrl: string; w: number; h: number } | null>(
      (resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0);
            resolve({
              dataUrl: canvas.toDataURL("image/png"),
              w: img.naturalWidth,
              h: img.naturalHeight,
            });
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = kasaLogoAsset.url;
      },
    );
    _kasaLogoCache = result;
  } catch {
    _kasaLogoCache = null;
  }
  return _kasaLogoCache;
}

async function drawPdfFooter(
  doc: jsPDF,
  opts: { footerText?: string | null; pageW: number; margin: number; FONT_TITLE: string; FONT_BODY: string },
) {
  const { footerText, pageW, margin, FONT_TITLE, FONT_BODY } = opts;
  const pageH = doc.internal.pageSize.getHeight();
  const bandH = 64;
  const bandY = pageH - bandH;

  doc.setFillColor(12, 22, 24);
  doc.rect(0, bandY, pageW, bandH, "F");

  // Logo Kasa (lado direito) — calcula primeiro para reservar espaço do texto
  const kasa = await getKasaLogo();
  const logoH = 24;
  const logoW = kasa ? (kasa.w / kasa.h) * logoH : 0;
  const logoX = pageW - margin - logoW;
  const logoY = bandY + (bandH - logoH) / 2;

  if (kasa) {
    try {
      doc.addImage(kasa.dataUrl, "PNG", logoX, logoY, logoW, logoH);
    } catch {
      /* ignore */
    }
  } else {
    doc.setFont(FONT_BODY, "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 188, 69);
    doc.text("KASA HUB", pageW - margin, bandY + bandH / 2 + 4, { align: "right" });
  }

  // Texto configurável (lado esquerdo)
  const text = sanitize(footerText || "").trim();
  if (text) {
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(9);
    doc.setTextColor(244, 247, 245);
    const reservedRight = (kasa ? logoW : 80) + 24;
    const maxWidth = pageW - margin * 2 - reservedRight;
    const lines = doc.splitTextToSize(text, maxWidth).slice(0, 3);
    doc.text(lines, margin, bandY + 22);
  }

  // Data de geração (lado esquerdo, abaixo)
  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(7);
  doc.setTextColor(156, 177, 176);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, pageH - 10);
}

export async function generateDmeBatchPdf(batchId: string): Promise<void> {
  const { data: batch, error: bErr } = await supabase
    .from("dme_batches" as any)
    .select("*, clients(name, company, logo_url)")
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
    .select("name, logo_url, dme_pdf_footer")
    .maybeSingle();

  const clientLogo = await imageToDataURL(b.clients?.logo_url);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const fonts = await registerBoletimFonts(doc);
  const FONT_TITLE = fonts.funnel ? "Funnel" : "helvetica";
  const FONT_BODY = fonts.onest ? "Onest" : "helvetica";
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header
  doc.setFillColor(12, 22, 24);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor(255, 188, 69);
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(10);
  doc.text("SOLICITAÇÃO DE APROVAÇÃO", margin, 35);
  doc.setTextColor(244, 247, 245);
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(20);
  doc.text("Demandas Extras — Lote", margin, 60);
  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(11);
  doc.setTextColor(156, 177, 176);
  doc.text(
    sanitize(b.clients?.company || b.clients?.name || "Cliente"),
    margin,
    78,
  );

  drawClientLogo(doc, clientLogo, pageW, margin);

  if (agency?.name && !clientLogo) {
    doc.setFontSize(9);
    doc.text(sanitize(agency.name), pageW - margin, 35, { align: "right" });
  }

  let y = 120;
  doc.setTextColor(15, 23, 25);
  doc.setFont(FONT_TITLE, "bold");
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
      font: FONT_BODY,
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
      font: FONT_TITLE,
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
    doc.setFont(FONT_BODY, "normal");
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
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 25);
  doc.text("Aprovar online (assinatura digital)", margin + 16, afterY + 22);
  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 70, 70);
  doc.text(
    "Acesse o link abaixo para revisar, aprovar ou recusar este lote:",
    margin + 16,
    afterY + 38,
  );
  doc.setTextColor(20, 60, 120);
  doc.setFont(FONT_BODY, "bold");
  doc.textWithLink(sanitize(approvalUrl), margin + 16, afterY + 56, { url: approvalUrl });

  await drawPdfFooter(doc, { footerText: agency?.dme_pdf_footer, pageW, margin, FONT_TITLE, FONT_BODY });

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
    .select("id, amount, description, due_date, client_id, clients(name, company, logo_url)")
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
    .select("name, logo_url, dme_pdf_footer")
    .maybeSingle();

  const clientLogo = await imageToDataURL(t.clients?.logo_url);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const fonts = await registerBoletimFonts(doc);
  const FONT_TITLE = fonts.funnel ? "Funnel" : "helvetica";
  const FONT_BODY = fonts.onest ? "Onest" : "helvetica";
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFillColor(12, 22, 24);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor(255, 188, 69);
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(10);
  doc.text("DEMANDAS EXTRAS — COBRANÇA CONSOLIDADA", margin, 35);
  doc.setTextColor(244, 247, 245);
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(20);
  doc.text("Lote Consolidado", margin, 60);
  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(11);
  doc.setTextColor(156, 177, 176);
  doc.text(sanitize(t.clients?.company || t.clients?.name || "Cliente"), margin, 78);

  drawClientLogo(doc, clientLogo, pageW, margin);

  if (agency?.name && !clientLogo) {
    doc.setFontSize(9);
    doc.text(sanitize(agency.name), pageW - margin, 35, { align: "right" });
  }

  let y = 120;
  doc.setTextColor(15, 23, 25);
  doc.setFont(FONT_BODY, "bold");
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
    styles: { font: FONT_BODY, fontSize: 9, cellPadding: 8, textColor: [15, 23, 25], lineColor: [228, 232, 230], lineWidth: 0.5 },
    headStyles: { fillColor: [12, 22, 24], textColor: [255, 188, 69], fontStyle: "bold", fontSize: 9, font: FONT_TITLE },
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
    doc.setFont(FONT_BODY, "normal");
    doc.setTextColor(107, 128, 127);
    doc.text(
      `Vencimento: ${new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}`,
      margin,
      afterY,
    );
  }

  await drawPdfFooter(doc, { footerText: agency?.dme_pdf_footer, pageW, margin, FONT_TITLE, FONT_BODY });

  const slug = sanitize(t.clients?.company || t.clients?.name || "cliente")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`lote-consolidado-${slug || "cliente"}.pdf`);
}
