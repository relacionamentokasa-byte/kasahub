import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  type Script, type ScriptScene,
  SCRIPT_CONTENT_LABEL, SCRIPT_STATUS_LABEL,
} from "@/lib/scripts-api";
import { SOCIAL_LABEL } from "@/lib/editorial-api";
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

const formatLabel: Record<string, string> = {
  vertical: "Vertical (9:16)",
  horizontal: "Horizontal (16:9)",
  square: "Quadrado (1:1)",
};

export async function exportScriptPDF(opts: {
  script: Script & { clients?: { name: string } | null; jobs?: { title: string } | null };
  scenes: ScriptScene[];
}) {
  const { script, scenes } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const fonts = await registerBoletimFonts(doc);
  const FONT_TITLE = fonts.funnel ? "Funnel" : "helvetica";
  const FONT_BODY = fonts.onest ? "Onest" : "helvetica";
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 36;

  // Header
  doc.setFillColor(12, 22, 24);
  doc.rect(0, 0, pageW, 100, "F");
  doc.setTextColor(255, 188, 69);
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(11);
  doc.text("ROTEIRO", margin, 32);
  doc.setTextColor(255, 255, 255);
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(sanitize(script.title || "Sem titulo"), pageW - margin * 2);
  doc.text(titleLines.slice(0, 2), margin, 56);
  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(9);
  const meta = [
    script.clients?.name ? `Cliente: ${sanitize(script.clients.name)}` : null,
    script.jobs?.title ? `Job: ${sanitize(script.jobs.title)}` : null,
  ].filter(Boolean).join("   ·   ");
  if (meta) doc.text(meta, margin, 88);

  // Info block
  let y = 130;
  doc.setTextColor(30, 30, 30);
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(11);
  doc.text("Informacoes", margin, y);
  y += 14;
  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(10);
  const totalDur = scenes.reduce((a, s) => a + (s.duration_sec ?? 0), 0);
  const lines = [
    `Tipo: ${SCRIPT_CONTENT_LABEL[script.content_type]}`,
    `Plataforma: ${SOCIAL_LABEL[script.platform as keyof typeof SOCIAL_LABEL] ?? script.platform}`,
    `Formato: ${script.video_format ? formatLabel[script.video_format] : "—"}`,
    `Duracao estimada: ${script.estimated_duration_sec ?? totalDur}s`,
    `Status: ${SCRIPT_STATUS_LABEL[script.status]}`,
    `Total de cenas: ${scenes.length}`,
  ];
  lines.forEach((l) => { doc.text(sanitize(l), margin, y); y += 14; });

  y += 8;

  // Scenes table
  const body = scenes
    .slice()
    .sort((a, b) => a.scene_number - b.scene_number)
    .map((s) => [
      String(s.scene_number),
      s.duration_sec != null ? `${s.duration_sec}s` : "—",
      sanitize(s.visual ?? ""),
      sanitize(s.speech ?? ""),
      sanitize(s.production_notes ?? ""),
    ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Dur.", "Visual", "Fala / Narracao", "Notas de producao"]],
    body,
    styles: { font: FONT_BODY, fontSize: 9, cellPadding: 6, valign: "top", textColor: [30, 30, 30], lineColor: [220, 220, 220] },
    headStyles: { fillColor: [12, 22, 24], textColor: [255, 188, 69], fontStyle: "bold", font: FONT_TITLE },
    alternateRowStyles: { fillColor: [248, 248, 245] },
    columnStyles: {
      0: { cellWidth: 28, halign: "center" },
      1: { cellWidth: 40, halign: "center" },
      2: { cellWidth: 150 },
      3: { cellWidth: 170 },
      4: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  const slug = (s: string) => sanitize(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const parts = [
    slug(script.jobs?.title ?? ""),
    slug(script.clients?.name ?? ""),
    slug(script.title ?? "roteiro"),
    new Date().toISOString().slice(0, 10),
  ].filter(Boolean);
  doc.save(`${parts.join("-") || "roteiro"}.pdf`);
}
