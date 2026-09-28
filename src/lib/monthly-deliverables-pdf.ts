import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { registerBoletimFonts } from "@/lib/pdf-fonts";
import { resolveStorageUrl } from "@/lib/use-storage-url";
import { brl } from "@/lib/utils-format";

function sanitize(s?: string | null): string {
  if (s == null) return "";
  let out = String(s).normalize("NFC");
  out = out.replace(/\r\n?/g, "\n");
  out = out.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{1F000}-\u{1F02F}\u{1F100}-\u{1F1FF}\u{FE0F}]/gu,
    ""
  );
  out = out.replace(/[^\u0000-ÿ\n]/g, "");
  out = out.replace(/[ \t]+/g, " ");
  return out.trim();
}

async function imageToDataURL(url: string): Promise<string | null> {
  try {
    const signed = (await resolveStorageUrl(url)) ?? url;
    const res = await fetch(signed);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface MonthlyJobItem {
  id: string;
  title: string;
  service_name?: string;
  project_name?: string;
  done_at?: string | null;
  description?: string | null;
}

export interface MonthlyEditorialItem {
  id: string;
  title: string;
  social_network: string;
  content_type: string;
  scheduled_at: string;
}

export interface MonthlyDmeItem {
  id: string;
  number_display?: string;
  title: string;
  value?: number;
  approved_at?: string | null;
}

export interface ExportMonthlyDeliverablesOptions {
  clientName: string;
  clientCompany?: string | null;
  clientLogoUrl?: string | null;
  periodLabel: string; // Ex: "Setembro de 2026"
  contractTitle?: string;
  monthlyValue?: number;
  jobs: MonthlyJobItem[];
  posts?: MonthlyEditorialItem[];
  dmes?: MonthlyDmeItem[];
  executiveNotes?: string;
}

export async function exportMonthlyDeliverablesPDF(opts: ExportMonthlyDeliverablesOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const fonts = await registerBoletimFonts(doc);
  const FONT_MAIN = fonts.funnel ? "Funnel" : "helvetica";

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // Paleta Kasa Hub
  const C = {
    bgDark: [12, 22, 24] as [number, number, number],
    cardDark: [20, 33, 36] as [number, number, number],
    gold: [255, 188, 69] as [number, number, number],
    textDark: [24, 34, 36] as [number, number, number],
    textMuted: [100, 116, 115] as [number, number, number],
    bgLight: [246, 248, 246] as [number, number, number],
    borderLt: [226, 232, 230] as [number, number, number],
  };

  let y = margin;

  // 1. Top Banner / Header Card
  doc.setFillColor(...C.bgDark);
  doc.roundedRect(margin, y, contentWidth, 76, 6, 6, "F");

  // Logo da Kasa ou Título KASA HUB
  doc.setFont(FONT_MAIN, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...C.gold);
  doc.text("KASA HUB", margin + 18, y + 28);

  doc.setFont(FONT_MAIN, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 215, 214);
  doc.text("RELATÓRIO MENSAL DE ENTREGAS & FECHAMENTO", margin + 18, y + 43);

  doc.setFont(FONT_MAIN, "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(sanitize(opts.periodLabel).toUpperCase(), margin + 18, y + 60);

  // Logo do Cliente no Header (se houver)
  if (opts.clientLogoUrl) {
    const logoData = await imageToDataURL(opts.clientLogoUrl);
    if (logoData) {
      try {
        doc.addImage(logoData, "JPEG", pageWidth - margin - 60, y + 13, 50, 50);
      } catch {
        // Fallback se imagem tiver formato específico
      }
    }
  }

  y += 90;

  // 2. Informações do Cliente e Contrato
  doc.setFillColor(...C.bgLight);
  doc.setDrawColor(...C.borderLt);
  doc.roundedRect(margin, y, contentWidth, 48, 4, 4, "FD");

  doc.setFont(FONT_MAIN, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.textDark);
  doc.text("Cliente:", margin + 14, y + 18);
  doc.setFont(FONT_MAIN, "normal");
  doc.text(sanitize(opts.clientCompany || opts.clientName), margin + 55, y + 18);

  if (opts.contractTitle) {
    doc.setFont(FONT_MAIN, "bold");
    doc.text("Contrato:", margin + 14, y + 34);
    doc.setFont(FONT_MAIN, "normal");
    doc.text(sanitize(opts.contractTitle), margin + 58, y + 34);
  }

  if (opts.monthlyValue && opts.monthlyValue > 0) {
    doc.setFont(FONT_MAIN, "bold");
    doc.text("Fee Mensal:", margin + contentWidth - 140, y + 18);
    doc.setFont(FONT_MAIN, "normal");
    doc.setTextColor(16, 140, 80);
    doc.text(brl(opts.monthlyValue), margin + contentWidth - 75, y + 18);
  }

  doc.setFont(FONT_MAIN, "bold");
  doc.setTextColor(...C.textDark);
  doc.text("Competência:", margin + contentWidth - 140, y + 34);
  doc.setFont(FONT_MAIN, "normal");
  doc.text(sanitize(opts.periodLabel), margin + contentWidth - 70, y + 34);

  y += 62;

  // 3. Quadro Resumo de Métricas
  const totalJobs = opts.jobs.length;
  const totalPosts = opts.posts?.length || 0;
  const totalDmes = opts.dmes?.length || 0;

  const cardW = (contentWidth - 16) / 3;
  const metrics = [
    { label: "JOBS CONCLUÍDOS", val: `${totalJobs}` },
    { label: "POSTS PUBLICADOS", val: `${totalPosts}` },
    { label: "DEMANDAS EXTRAS (DME)", val: `${totalDmes}` },
  ];

  metrics.forEach((m, idx) => {
    const cx = margin + idx * (cardW + 8);
    doc.setFillColor(...C.bgLight);
    doc.setDrawColor(...C.borderLt);
    doc.roundedRect(cx, y, cardW, 40, 4, 4, "FD");

    doc.setFont(FONT_MAIN, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.text(m.label, cx + 10, y + 15);

    doc.setFont(FONT_MAIN, "bold");
    doc.setFontSize(13);
    doc.setTextColor(...C.textDark);
    doc.text(m.val, cx + 10, y + 32);
  });

  y += 54;

  // 4. Seção: Considerações do Executivo / Estrategista (se preenchido)
  if (opts.executiveNotes && opts.executiveNotes.trim()) {
    doc.setFont(FONT_MAIN, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...C.textDark);
    doc.text("Resumo Executivo do Período", margin, y);
    y += 8;

    doc.setFillColor(252, 253, 252);
    doc.setDrawColor(...C.borderLt);

    const splitNotes = doc.splitTextToSize(sanitize(opts.executiveNotes), contentWidth - 24);
    const boxH = Math.max(34, splitNotes.length * 11 + 16);

    doc.roundedRect(margin, y, contentWidth, boxH, 4, 4, "FD");
    doc.setFont(FONT_MAIN, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 65, 65);
    doc.text(splitNotes, margin + 12, y + 16);

    y += boxH + 16;
  }

  // 5. Tabela de Jobs Concluídos
  doc.setFont(FONT_MAIN, "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.textDark);
  doc.text(`Jobs & Campanhas Concluídas (${totalJobs})`, margin, y);
  y += 6;

  const jobsTableRows = opts.jobs.map((j, i) => [
    `${i + 1}`,
    sanitize(j.title),
    sanitize(j.service_name || j.project_name || "Serviço Recorrente"),
    j.done_at ? new Date(j.done_at).toLocaleDateString("pt-BR") : "Concluído",
  ]);

  if (jobsTableRows.length === 0) {
    jobsTableRows.push(["-", "Nenhum job registrado no período", "-", "-"]);
  }

  autoTable(doc, {
    startY: y,
    head: [["#", "Job / Entrega", "Serviço / Projeto", "Data Conclusão"]],
    body: jobsTableRows,
    theme: "plain",
    margin: { left: margin, right: margin },
    styles: {
      font: FONT_MAIN,
      fontSize: 8,
      cellPadding: 5,
      textColor: [30, 45, 45],
      lineColor: [230, 235, 233],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [240, 244, 243],
      textColor: [20, 35, 36],
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      1: { cellWidth: "auto", fontStyle: "bold" },
      2: { cellWidth: 140 },
      3: { cellWidth: 80, halign: "center" },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 18;

  // 6. Tabela de Posts Editoriais (se houver)
  if (opts.posts && opts.posts.length > 0) {
    // Se estiver perto do fim da página, cria nova
    if (y > pageHeight - 120) {
      doc.addPage();
      y = margin;
    }

    doc.setFont(FONT_MAIN, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.textDark);
    doc.text(`Conteúdos & Calendário Editorial (${opts.posts.length})`, margin, y);
    y += 6;

    const postsRows = opts.posts.map((p, i) => [
      `${i + 1}`,
      sanitize(p.title),
      sanitize(p.social_network.toUpperCase()),
      sanitize(p.content_type.toUpperCase()),
      p.scheduled_at ? new Date(p.scheduled_at).toLocaleDateString("pt-BR") : "-",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Título da Publicação", "Rede Social", "Formato", "Data Agendada"]],
      body: postsRows,
      theme: "plain",
      margin: { left: margin, right: margin },
      styles: {
        font: FONT_MAIN,
        fontSize: 8,
        cellPadding: 5,
        textColor: [30, 45, 45],
        lineColor: [230, 235, 233],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [240, 244, 243],
        textColor: [20, 35, 36],
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 24, halign: "center" },
        1: { cellWidth: "auto", fontStyle: "bold" },
        2: { cellWidth: 80, halign: "center" },
        3: { cellWidth: 80, halign: "center" },
        4: { cellWidth: 80, halign: "center" },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // 7. Tabela de DMEs (Demandas Extras) se houver
  if (opts.dmes && opts.dmes.length > 0) {
    if (y > pageHeight - 120) {
      doc.addPage();
      y = margin;
    }

    doc.setFont(FONT_MAIN, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.textDark);
    doc.text(`Demandas Extras Atendidas (${opts.dmes.length})`, margin, y);
    y += 6;

    const dmesRows = opts.dmes.map((d) => [
      sanitize(d.number_display || "-"),
      sanitize(d.title),
      d.value ? brl(d.value) : "-",
      d.approved_at ? new Date(d.approved_at).toLocaleDateString("pt-BR") : "Aprovado",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["DME", "Descrição da Demanda", "Valor Acordado", "Data Aprovação"]],
      body: dmesRows,
      theme: "plain",
      margin: { left: margin, right: margin },
      styles: {
        font: FONT_MAIN,
        fontSize: 8,
        cellPadding: 5,
        textColor: [30, 45, 45],
        lineColor: [230, 235, 233],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [240, 244, 243],
        textColor: [20, 35, 36],
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 50, halign: "center", fontStyle: "bold" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 90, halign: "right" },
        3: { cellWidth: 90, halign: "center" },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // 8. Rodapé de Assinatura e Chancela Kasa Hub em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...C.borderLt);
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);

    doc.setFont(FONT_MAIN, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.text("Kasa Hub — Gestão de Operações e Fechamento de Contrato", margin, pageHeight - 16);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin - 50, pageHeight - 16);
  }

  // Download do arquivo
  const filename = `Fechamento_${sanitize(opts.clientName).replace(/\s+/g, "_")}_${sanitize(opts.periodLabel).replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
