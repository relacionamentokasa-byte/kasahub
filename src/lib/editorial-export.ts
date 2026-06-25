import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  type EditorialPost, SOCIAL_LABEL, CONTENT_TYPE_LABEL, STATUS_LABEL,
} from "@/lib/editorial-api";

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

export function exportEditorialPostsPDF(opts: {
  clientName: string;
  cursor: Date;
  posts: EditorialPost[];
}) {
  const { clientName, cursor, posts } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 36;

  // Header band
  doc.setFillColor(12, 22, 24);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor(255, 188, 69);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Calendario Editorial", margin, 40);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  doc.text(`${sanitize(clientName)} · ${sanitize(monthLabel)}`, margin, 62);
  doc.setFontSize(9);
  doc.text(`Total de posts: ${posts.length}`, margin, 78);

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
    startY: 110,
    head: [["Data", "Titulo", "Rede", "Tipo", "Status", "Descricao"]],
    body: rows,
    styles: { font: "helvetica", fontSize: 8, cellPadding: 6, textColor: [30, 30, 30], lineColor: [220, 220, 220] },
    headStyles: { fillColor: [12, 22, 24], textColor: [255, 188, 69], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 245] },
    columnStyles: {
      0: { cellWidth: 80 },
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
