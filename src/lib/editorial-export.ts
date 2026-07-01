import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  type EditorialPost, SOCIAL_LABEL, CONTENT_TYPE_LABEL, STATUS_LABEL,
} from "@/lib/editorial-api";
import { registerBoletimFonts } from "@/lib/pdf-fonts";

function sanitize(s?: string | null): string {
  if (s == null) return "";
  let out = String(s).normalize("NFC");
  out = out.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{1F000}-\u{1F02F}\u{1F100}-\u{1F1FF}\u{FE0F}]/gu,
    "",
  );
  out = out.replace(/[^\u0000-\u00FF\n]/g, "");
  return out.replace(/[ \t]+/g, " ").trim();
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

async function fetchImage(url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG"; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    const format: "PNG" | "JPEG" = blob.type.includes("png") ? "PNG" : "JPEG";
    return { dataUrl, format, w: dims.w, h: dims.h };
  } catch { return null; }
}

export async function exportEditorialPostsPDF(opts: {
  clientName: string;
  clientLogoUrl?: string | null;
  strategy?: string;
  cursor: Date;
  posts: EditorialPost[];
}) {
  const { clientName, clientLogoUrl, strategy, cursor, posts } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const fonts = await registerBoletimFonts(doc);
  const FONT_TITLE = fonts.funnel ? "Funnel" : "helvetica";
  const FONT_BODY = fonts.onest ? "Onest" : "helvetica";
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 36;

  // Header band
  const headerH = 90;
  doc.setFillColor(12, 22, 24);
  doc.rect(0, 0, pageW, headerH, "F");

  // Logo do cliente (à direita)
  if (clientLogoUrl) {
    const img = await fetchImage(clientLogoUrl);
    if (img) {
      const maxH = 56;
      const ratio = img.w / img.h;
      const h = maxH;
      const w = h * ratio;
      try {
        doc.addImage(img.dataUrl, img.format, pageW - margin - w, (headerH - h) / 2, w, h);
      } catch { /* ignore */ }
    }
  }

  doc.setTextColor(255, 188, 69);
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(18);
  doc.text("Calendario Editorial", margin, 40);
  doc.setTextColor(255, 255, 255);
  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(11);
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  doc.text(`${sanitize(clientName)} · ${sanitize(monthLabel)}`, margin, 62);
  doc.setFontSize(9);
  doc.text(`Total de posts: ${posts.length}`, margin, 78);

  let cursorY = headerH + 20;

  // Estratégia do mês
  if (strategy && strategy.trim()) {
    doc.setFont(FONT_TITLE, "bold");
    doc.setFontSize(12);
    doc.setTextColor(12, 22, 24);
    doc.text("Estratégia do mês", margin, cursorY);
    cursorY += 6;
    doc.setDrawColor(255, 188, 69);
    doc.setLineWidth(1.2);
    doc.line(margin, cursorY, margin + 60, cursorY);
    cursorY += 12;

    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(sanitize(strategy), pageW - margin * 2);
    doc.text(lines, margin, cursorY, { lineHeightFactor: 1.25 });
    cursorY += lines.length * 12 + 16;
  }

  const rows = posts
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((p) => [
      fmtDateTime(p.scheduled_at),
      sanitize(p.title),
      SOCIAL_LABEL[p.social_network],
      CONTENT_TYPE_LABEL[p.content_type],
      STATUS_LABEL[p.status],
      sanitize(p.description ?? ""),
    ]);

  autoTable(doc, {
    startY: cursorY,
    head: [["Data", "Titulo", "Rede", "Tipo", "Status", "Descricao"]],
    body: rows,
    styles: {
      font: FONT_BODY,
      fontSize: 8.5,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      textColor: [30, 30, 30],
      lineColor: [230, 230, 230],
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: { fillColor: [12, 22, 24], textColor: [255, 188, 69], fontStyle: "bold", font: FONT_TITLE, fontSize: 9, cellPadding: 5 },
    alternateRowStyles: { fillColor: [248, 248, 245] },
    columnStyles: {
      0: { cellWidth: 78 },
      1: { cellWidth: 130 },
      2: { cellWidth: 55 },
      3: { cellWidth: 55 },
      4: { cellWidth: 55 },
      5: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  const safeName = sanitize(clientName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`calendario-editorial-${safeName}-${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}.pdf`);
}


export function exportEditorialPostsCSV(opts: {
  clientName: string;
  cursor: Date;
  posts: EditorialPost[];
}) {
  const { clientName, cursor, posts } = opts;
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["Data", "Titulo", "Rede", "Tipo", "Status", "Descricao"].map(esc).join(",");
  const lines = posts
    .slice()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((p) =>
      [
        fmtDateTime(p.scheduled_at),
        p.title,
        SOCIAL_LABEL[p.social_network],
        CONTENT_TYPE_LABEL[p.content_type],
        STATUS_LABEL[p.status],
        (p.description ?? "").replace(/\n/g, " "),
      ].map((v) => esc(String(v ?? ""))).join(","),
    );
  const csv = "\ufeff" + [header, ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  a.href = url;
  a.download = `calendario-editorial-${safeName}-${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
