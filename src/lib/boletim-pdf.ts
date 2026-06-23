import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LaunchGridProduct, LaunchGridBoletim } from "@/lib/launch-grids-api";

const ASPECTO_LABEL: Record<string, string> = {
  gel: "Gel", fluido: "Fluido", creme: "Creme", locao: "Loção",
  solido: "Sólido", liquido: "Líquido", mousse: "Mousse", oleo: "Óleo",
  outros: "Outros",
};
const ACOND_LABEL: Record<string, string> = {
  selo: "Selo", caixa: "Caixa", ambos: "Selo + Caixa",
};

async function imageToDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
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

export async function exportBoletimPdf(
  product: Pick<LaunchGridProduct, "name" | "image_url" | "due_date" | "links" | "skus" | "notes" | "description"> & {
    boletim: LaunchGridBoletim;
    statusLabel?: string;
    clientName?: string;
  },
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("BOLETIM DE LANÇAMENTO DE PRODUTOS", M, 28);
  doc.setFontSize(16);
  doc.text(product.name || "Produto", M, 50);
  if (product.clientName) {
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(product.clientName, M, 62);
  }
  y = 90;
  doc.setTextColor(0, 0, 0);

  // Cover image
  if (product.image_url) {
    const dataUrl = await imageToDataURL(product.image_url);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, "JPEG", M, y, 120, 120, undefined, "FAST");
      } catch {
        try { doc.addImage(dataUrl, "PNG", M, y, 120, 120, undefined, "FAST"); } catch {}
      }
    }
  }

  // Identification block (right of image)
  const infoX = M + 140;
  let infoY = y + 4;
  const line = (label: string, value?: string | null) => {
    if (!value) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), infoX, infoY);
    infoY += 11;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const wrapped = doc.splitTextToSize(value, W - infoX - M);
    doc.text(wrapped, infoX, infoY);
    infoY += wrapped.length * 13 + 4;
  };
  line("Etapa atual", product.statusLabel);
  line("Categoria", product.boletim.categoria);
  line("Previsão", product.due_date ? new Date(product.due_date).toLocaleDateString("pt-BR") : undefined);
  line("Volumetria", product.boletim.volumetria);
  line("Aspecto físico", product.boletim.aspecto_fisico ? ASPECTO_LABEL[product.boletim.aspecto_fisico] : undefined);
  line("Acondicionar em", product.boletim.acondicionar ? ACOND_LABEL[product.boletim.acondicionar] : undefined);

  y = Math.max(y + 130, infoY + 8);

  const section = (title: string) => {
    if (y > 760) { doc.addPage(); y = M; }
    doc.setFillColor(241, 245, 249);
    doc.rect(M, y, W - 2 * M, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), M + 8, y + 15);
    y += 30;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  const paragraph = (text?: string | null) => {
    if (!text) return;
    if (y > 760) { doc.addPage(); y = M; }
    const wrapped = doc.splitTextToSize(text, W - 2 * M);
    doc.text(wrapped, M, y);
    y += wrapped.length * 12 + 8;
  };

  // Tampa / Embalagem — cor e fornecedor
  const b = product.boletim;
  const hasTampa = b.tampa_cor || b.tampa_fornecedor;
  const hasEmb = b.embalagem_cor || b.embalagem_fornecedor;
  if (hasTampa || hasEmb) {
    section("Tampa e embalagem");
    if (hasTampa) paragraph(`Tampa — Cor: ${b.tampa_cor || "-"} | Fornecedor: ${b.tampa_fornecedor || "-"}`);
    if (hasEmb) paragraph(`Embalagem — Cor: ${b.embalagem_cor || "-"} | Fornecedor: ${b.embalagem_fornecedor || "-"}`);
  }

  // Descrição da embalagem
  if (product.boletim.descricao_embalagem) {
    section("Descrição da embalagem");
    paragraph(product.boletim.descricao_embalagem);
  }

  // Briefing
  if (product.boletim.briefing_criacao) {
    section("Briefing de criação");
    paragraph(product.boletim.briefing_criacao);
  }

  // Regulatório
  if (product.boletim.regulatorio_verso) {
    section("Regulatório / Verso");
    paragraph(product.boletim.regulatorio_verso);
  }

  // Benchmark
  if (product.boletim.benchmark && product.boletim.benchmark.length) {
    section("Benchmark");
    product.boletim.benchmark.forEach((b) => paragraph(`• ${b}`));
  }

  // Responsáveis
  if (product.boletim.responsaveis && product.boletim.responsaveis.length) {
    section("Responsáveis");
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Nome", "Papel"]],
      body: product.boletim.responsaveis.map((r) => [r.nome || "-", r.papel || "-"]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // SKUs
  if (product.skus && product.skus.length) {
    section("SKUs");
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Nome", "Descrição", "Cor/Acabamento", "Vol/Ros", "Fornecedor", "Custo"]],
      body: product.skus.map((s) => [
        s.name || "-",
        s.descricao || "-",
        s.cor_acabamento || "-",
        s.vol_ros || "-",
        s.fornecedor || "-",
        s.custo_compras || "-",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Links
  if (product.links && product.links.length) {
    section("Links");
    product.links.forEach((l) => {
      if (y > 770) { doc.addPage(); y = M; }
      doc.setTextColor(37, 99, 235);
      doc.textWithLink(`• ${l.label || l.url}`, M, y, { url: l.url });
      doc.setTextColor(0, 0, 0);
      y += 14;
    });
  }

  // Notas
  if (product.notes) {
    section("Notas");
    paragraph(product.notes);
  }

  // Imagens do boletim (referência)
  const allImgs: Array<{ label: string; url: string }> = [];
  const imgs = product.boletim.imagens ?? {};
  (["tampa", "embalagem", "rotulo", "outros"] as const).forEach((k) => {
    (imgs[k] ?? []).forEach((u) => allImgs.push({ label: k, url: u }));
  });
  if (allImgs.length) {
    if (y > 600) { doc.addPage(); y = M; }
    section("Referências visuais");
    const tw = (W - 2 * M - 18) / 3;
    let cx = M;
    for (const it of allImgs) {
      if (y + tw + 18 > 800) { doc.addPage(); y = M; cx = M; }
      const dataUrl = await imageToDataURL(it.url);
      if (dataUrl) {
        try { doc.addImage(dataUrl, "JPEG", cx, y, tw, tw, undefined, "FAST"); }
        catch { try { doc.addImage(dataUrl, "PNG", cx, y, tw, tw, undefined, "FAST"); } catch {} }
      }
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(it.label, cx, y + tw + 10);
      doc.setTextColor(0, 0, 0);
      cx += tw + 9;
      if (cx + tw > W - M) { cx = M; y += tw + 22; }
    }
  }

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pages}`, W - M, 825, { align: "right" });
  }

  const safe = (product.name || "boletim").replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
  doc.save(`boletim_${safe}.pdf`);
}
