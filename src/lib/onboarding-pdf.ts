import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fetchOnboardingSteps, type Onboarding, type OnboardingStep } from "@/lib/onboarding-api";
import { fetchClient } from "@/lib/ops-api";
import { fetchAgencySettings } from "@/lib/settings-api";
import { registerBoletimFonts } from "@/lib/pdf-fonts";
import { resolveStorageUrl } from "@/lib/use-storage-url";

const K = {
  bg: [12, 22, 24] as [number, number, number],
  ink: [15, 23, 25] as [number, number, number],
  sub: [107, 128, 127] as [number, number, number],
  border: [228, 232, 230] as [number, number, number],
  soft: [246, 248, 246] as [number, number, number],
  brand: [255, 188, 69] as [number, number, number],
  brandDark: [201, 142, 38] as [number, number, number],
  ok: [16, 185, 129] as [number, number, number],
  warn: [245, 158, 11] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  muted: [156, 163, 175] as [number, number, number],
};

function sanitize(s?: string | null): string {
  if (!s) return "";
  let out = String(s).normalize("NFC").replace(/\r\n?/g, "\n");
  out = out.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{FE0F}]/gu, "");
  out = out.replace(/[^\u0000-\u00FF]/g, "");
  return out.trim();
}

async function imageToDataURL(url: string): Promise<string | null> {
  try {
    const signed = (await resolveStorageUrl(url)) ?? url;
    const res = await fetch(signed);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((r) => {
      const fr = new FileReader();
      fr.onloadend = () => r(fr.result as string);
      fr.onerror = () => r(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function measureImageRatio(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / (img.naturalHeight || 1));
    img.onerror = () => resolve(1.5);
    img.src = dataUrl;
  });
}

const STATUS_LABEL: Record<OnboardingStep["status"], string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluído",
  blocked: "Bloqueado",
  skipped: "Pulado",
};
const STATUS_COLOR: Record<OnboardingStep["status"], [number, number, number]> = {
  pending: K.muted,
  in_progress: K.warn,
  done: K.ok,
  blocked: K.danger,
  skipped: K.sub,
};
const RESP_LABEL: Record<OnboardingStep["responsible_type"], string> = {
  agency: "Agência",
  client: "Cliente",
  both: "Ambos",
};

export async function exportOnboardingPdf(onboarding: Onboarding) {
  const [steps, client, agency] = await Promise.all([
    fetchOnboardingSteps(onboarding.id),
    fetchClient(onboarding.client_id).catch(() => null),
    fetchAgencySettings().catch(() => null),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const fonts = await registerBoletimFonts(doc);
  const FONT_TITLE = fonts.funnel ? "Funnel" : "helvetica";
  const FONT_BODY = fonts.onest ? "Onest" : "helvetica";

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const CW = W - M * 2;
  let y = 0;

  // ---------- CAPA / HEADER ----------
  doc.setFillColor(...K.bg);
  doc.rect(0, 0, W, 120, "F");
  doc.setFillColor(...K.brand);
  doc.rect(0, 0, W, 4, "F");

  const logoUrl = agency?.logo_yellow_url ?? agency?.logo_white_url ?? agency?.logo_url;
  if (logoUrl) {
    const du = await imageToDataURL(logoUrl);
    if (du) {
      try {
        const maxW = 120;
        const maxH = 70;
        const ratio = await measureImageRatio(du);
        let lw = maxW;
        let lh = maxW / ratio;
        if (lh > maxH) {
          lh = maxH;
          lw = maxH * ratio;
        }
        const lx = M;
        const ly = 30 + (maxH - lh) / 2;
        doc.addImage(du, "PNG", lx, ly, lw, lh, undefined, "MEDIUM");
      } catch {}
    }
  }

  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...K.brand);
  doc.text("ONBOARDING DO CLIENTE", W - M, 45, { align: "right", charSpace: 2 });
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(sanitize(onboarding.title) || "Onboarding", W - M, 68, { align: "right" });
  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 200, 200);
  const clientLabel = sanitize(client?.name || client?.company || "");
  if (clientLabel) doc.text(clientLabel, W - M, 84, { align: "right" });

  y = 145;

  // ---------- CARDS DE INFO ----------
  const cardH = 56;
  const cw = (CW - 20) / 3;
  const cards = [
    { label: "Início", value: format(new Date(onboarding.start_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) },
    {
      label: "Previsão de término",
      value: onboarding.expected_end_date
        ? format(new Date(onboarding.expected_end_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
        : "—",
    },
    { label: "Progresso", value: `${onboarding.progress_percentage ?? 0}%` },
  ];
  cards.forEach((c, i) => {
    const x = M + i * (cw + 10);
    doc.setFillColor(...K.soft);
    doc.roundedRect(x, y, cw, cardH, 8, 8, "F");
    doc.setDrawColor(...K.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, cw, cardH, 8, 8, "S");
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...K.sub);
    doc.text(c.label.toUpperCase(), x + 12, y + 18, { charSpace: 1.2 });
    doc.setFont(FONT_TITLE, "bold");
    doc.setFontSize(14);
    doc.setTextColor(...K.ink);
    doc.text(sanitize(c.value), x + 12, y + 40);
  });
  y += cardH + 20;

  if (onboarding.description) {
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(10);
    doc.setTextColor(...K.ink);
    const lines = doc.splitTextToSize(sanitize(onboarding.description), CW);
    doc.text(lines, M, y);
    y += lines.length * 13 + 8;
  }

  // ---------- ETAPAS (tabela) ----------
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...K.ink);
  doc.text("Etapas do Onboarding", M, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["#", "Etapa", "Responsável", "Prazo", "Status"]],
    body: steps.map((s, idx) => [
      String(idx + 1),
      sanitize(s.title) + (s.description ? `\n${sanitize(s.description)}` : "") + (s.notes ? `\n${sanitize(s.notes)}` : ""),
      RESP_LABEL[s.responsible_type],
      s.due_date ? format(new Date(s.due_date + "T00:00:00"), "dd/MM/yy", { locale: ptBR }) : "—",
      STATUS_LABEL[s.status],
    ]),
    styles: {
      font: FONT_BODY,
      fontSize: 9,
      cellPadding: 8,
      textColor: K.ink,
      lineColor: K.border,
      lineWidth: 0.3,
      valign: "top",
    },
    headStyles: {
      font: FONT_TITLE,
      fillColor: K.bg,
      textColor: K.brand,
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: K.soft },
    columnStyles: {
      0: { cellWidth: 30, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 72, halign: "center" },
      3: { cellWidth: 62, halign: "center" },
      4: { cellWidth: 78, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const st = steps[data.row.index]?.status;
        if (st) {
          data.cell.styles.textColor = STATUS_COLOR[st];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // ---------- FOOTER ----------
  const total = doc.getNumberOfPages();
  const today = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...K.border);
    doc.setLineWidth(0.4);
    doc.line(M, H - 32, W - M, H - 32);
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...K.sub);
    doc.text(`${agency?.name ?? "KASA HUB"} • Onboarding`, M, H - 18);
    doc.text(`${today}  ·  Página ${i} de ${total}`, W - M, H - 18, { align: "right" });
  }

  const safe = ((onboarding.title || "onboarding") + "_" + (clientLabel || ""))
    .replace(/[^a-z0-9-_]+/gi, "_")
    .toLowerCase();
  doc.save(`${safe}.pdf`);
}
