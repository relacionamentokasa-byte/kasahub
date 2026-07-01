import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  type EditorialPost, SOCIAL_LABEL, CONTENT_TYPE_LABEL, STATUS_LABEL,
} from "@/lib/editorial-api";
import { registerBoletimFonts } from "@/lib/pdf-fonts";
import instagramIcon from "@/assets/social/instagram.png.asset.json";

const SOCIAL_ICON_URL: Partial<Record<EditorialPost["social_network"], string>> = {
  instagram: instagramIcon.url,
};


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

  const sorted = posts.slice().sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  const colX = [margin + 12, margin + 12 + 108, margin + 12 + 108 + 190, margin + 12 + 108 + 190 + 90];
  const statusX = pageW - margin - 12; // right edge for status pill

  const drawPageHeaderBand = () => {
    // no repeated header band on subsequent pages, keep clean margin
  };

  // Preload social network icons once
  const iconCache: Record<string, { dataUrl: string; format: "PNG" | "JPEG"; w: number; h: number } | null> = {};
  const uniqueNets = Array.from(new Set(sorted.map((p) => p.social_network)));
  await Promise.all(uniqueNets.map(async (net) => {
    const u = SOCIAL_ICON_URL[net];
    if (u) iconCache[net] = await fetchImage(u);
  }));



  for (const p of sorted) {
    const descText = sanitize(p.description ?? "");
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(9.5);
    const descLines = descText ? doc.splitTextToSize(descText, contentW - 24) : [];
    const descBlockH = descLines.length ? descLines.length * 12 + 22 : 0; // label + text
    const cardH = 60 + descBlockH; // top row + description block

    if (cursorY + cardH > pageH - margin) {
      doc.addPage();
      cursorY = margin;
      drawPageHeaderBand();
    }

    // Card background
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(255, 255, 255);
    (doc as any).roundedRect(margin, cursorY, contentW, cardH, 8, 8, "FD");

    // Top row labels
    doc.setFont(FONT_BODY, "bold");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    ["DATA", "TITULO", "REDE", "TIPO"].forEach((lbl, i) => {
      doc.text(lbl, colX[i], cursorY + 16);
    });

    // Top row values
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    const dateStr = fmtDateTime(p.scheduled_at);
    doc.text(dateStr, colX[0], cursorY + 34);
    const title = sanitize(p.title);
    const titleLine = doc.splitTextToSize(title, 180)[0] ?? "";
    doc.text(titleLine, colX[1], cursorY + 34);
    const netLabel = sanitize(SOCIAL_LABEL[p.social_network]);
    const icon = iconCache[p.social_network];
    let netTextX = colX[2];
    if (icon) {
      const size = 14;
      try {
        doc.addImage(icon.dataUrl, icon.format, colX[2], cursorY + 22, size, size, undefined, "FAST");
        netTextX = colX[2] + size + 5;
      } catch { /* ignore */ }
    }
    doc.text(netLabel, netTextX, cursorY + 34);

    doc.text(sanitize(CONTENT_TYPE_LABEL[p.content_type]), colX[3], cursorY + 34);

    // Status pill (amber)
    const statusLabel = sanitize(STATUS_LABEL[p.status]);
    doc.setFont(FONT_BODY, "bold");
    doc.setFontSize(8.5);
    const pillPadX = 10;
    const pillW = doc.getTextWidth(statusLabel) + pillPadX * 2;
    const pillH = 18;
    const pillX = statusX - pillW;
    const pillY = cursorY + 22;
    doc.setFillColor(255, 188, 69);
    (doc as any).roundedRect(pillX, pillY, pillW, pillH, 9, 9, "F");
    doc.setTextColor(12, 22, 24);
    doc.text(statusLabel, pillX + pillW / 2, pillY + 12, { align: "center" });

    // Description block
    if (descLines.length) {
      // divider
      doc.setDrawColor(238, 238, 238);
      doc.setLineWidth(0.6);
      doc.line(margin + 12, cursorY + 54, margin + contentW - 12, cursorY + 54);

      doc.setFont(FONT_BODY, "bold");
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text("LEGENDA / DESCRICAO", margin + 12, cursorY + 68);

      doc.setFont(FONT_BODY, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(45, 45, 45);
      doc.text(descLines, margin + 12, cursorY + 82, { lineHeightFactor: 1.3 });
    }

    cursorY += cardH + 10;
  }


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
