import jsPDF from "jspdf";
import type { CallSheetData } from "@/types/call-sheet";
import { CALL_SHEET_BLOCK_LABELS, GEAR_CATEGORY_LABELS } from "@/types/call-sheet";

export function exportCallSheetPDF(jobTitle: string, clientName: string, data: CallSheetData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header Background Bar
  doc.setFillColor(26, 26, 26);
  doc.rect(10, y, pageWidth - 20, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("ORDEM DO DIA / CALL SHEET", 15, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(`KASA HUB • PRODUÇÃO AUDIOVISUAL`, 15, y + 14);

  y += 24;

  // Job & Client Info Card
  doc.setFillColor(245, 243, 238);
  doc.roundedRect(10, y, pageWidth - 20, 22, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`JOB: ${jobTitle.toUpperCase()}`, 15, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Cliente: ${clientName || "Não especificado"}`, 15, y + 13);

  let formattedDate = "Não definida";
  if (data.shoot_date) {
    const [year, month, day] = data.shoot_date.split("-");
    formattedDate = `${day}/${month}/${year}`;
  }
  doc.text(`Data da Gravação: ${formattedDate}`, 15, y + 18);

  doc.setFont("helvetica", "bold");
  doc.text(`Chamada Geral: ${data.general_call_time || "--:--"}`, 110, y + 7);
  doc.text(`Início de Set: ${data.on_set_call_time || "--:--"}`, 110, y + 13);
  doc.text(`Wrap Previsto: ${data.estimated_wrap || "--:--"}`, 110, y + 18);

  y += 28;

  // Localização
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text("LOCAÇÃO & ACESSO", 10, y);
  y += 5;

  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(10, y, pageWidth - 20, 20, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(`Local: ${data.location_name || "A definir"}`, 14, y + 6);

  doc.setFont("helvetica", "normal");
  doc.text(`Endereço: ${data.location_address || "Não informado"}`, 14, y + 11);

  const access = [
    data.location_parking_info ? `Estac: ${data.location_parking_info}` : "",
    data.location_access_notes ? `Portaria: ${data.location_access_notes}` : "",
    data.contact_on_site?.name ? `Contato: ${data.contact_on_site.name} (${data.contact_on_site.phone})` : "",
  ].filter(Boolean).join(" | ");

  if (access) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(access, 14, y + 16);
  }

  y += 26;

  // Equipe / Convocados
  if (data.crew && data.crew.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("EQUIPE & CONVOCADOS", 10, y);
    y += 5;

    data.crew.forEach((c) => {
      if (y > 270) {
        doc.addPage();
        y = 15;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(`[${c.call_time || "--:--"}] ${c.name}`, 14, y + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const details = [c.role, c.phone, c.notes].filter(Boolean).join(" • ");
      doc.text(details, 80, y + 4);

      doc.setDrawColor(240, 240, 240);
      doc.line(10, y + 6, pageWidth - 10, y + 6);
      y += 7;
    });

    y += 4;
  }

  // Cronograma / Timeline
  if (data.timeline && data.timeline.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 15;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("CRONOGRAMA DO DIA", 10, y);
    y += 5;

    data.timeline.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 15;
      }

      const timeStr = item.time_end ? `${item.time_start} - ${item.time_end}` : item.time_start;
      const typeConfig = CALL_SHEET_BLOCK_LABELS[item.type];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(timeStr, 14, y + 4);

      doc.text(item.title, 50, y + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(typeConfig?.label || "", 150, y + 4);

      if (item.description) {
        y += 5;
        doc.setTextColor(100, 100, 100);
        doc.text(`↳ ${item.description}`, 50, y + 3);
      }

      doc.setDrawColor(240, 240, 240);
      doc.line(10, y + 6, pageWidth - 10, y + 6);
      y += 8;
    });

    y += 4;
  }

  // Observações Gerais
  if (data.general_notes) {
    if (y > 250) {
      doc.addPage();
      y = 15;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text("ORIENTAÇÕES & OBSERVAÇÕES GERAIS", 10, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const splitNotes = doc.splitTextToSize(data.general_notes, pageWidth - 25);
    doc.text(splitNotes, 14, y + 4);
    y += splitNotes.length * 4 + 6;
  }

  // Rodapé
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${totalPages} • Gerado via Kasa Hub`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  // Salvar PDF
  const safeTitle = jobTitle.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  doc.save(`callsheet_${safeTitle || "job"}.pdf`);
}
