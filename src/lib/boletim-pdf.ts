import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LaunchGridProduct, LaunchGridBoletim } from "@/lib/launch-grids-api";

export const CATEGORIA_OPTIONS = [
  "Perfumaria",
  "Higiene",
  "Cuidados da Pele",
  "Cuidados dos Cabelos",
  "Infantil",
  "Maquiagem",
] as const;

const ASPECTO_LABEL: Record<string, string> = {
  gel: "Gel", fluido: "Fluido", creme: "Creme", locao: "Loção",
  solido: "Sólido", liquido: "Líquido", mousse: "Mousse", oleo: "Óleo",
  outros: "Outros",
};
const ACOND_LABEL: Record<string, string> = {
  selo: "Selo", caixa: "Caixa", ambos: "Selo + Caixa",
};

// Paleta refinada
const C = {
  ink: [15, 23, 42] as [number, number, number],
  sub: [100, 116, 139] as [number, number, number],
  muted: [148, 163, 184] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  soft: [248, 250, 252] as [number, number, number],
  accent: [180, 142, 84] as [number, number, number], // dourado discreto
  accentSoft: [245, 235, 220] as [number, number, number],
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

function tryAddImage(doc: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number) {
  try { doc.addImage(dataUrl, "JPEG", x, y, w, h, undefined, "FAST"); return true; }
  catch {
    try { doc.addImage(dataUrl, "PNG", x, y, w, h, undefined, "FAST"); return true; } catch { return false; }
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
  const H = doc.internal.pageSize.getHeight();
  const M = 44;
  const CW = W - 2 * M; // content width
  const b = product.boletim;

  // ============================================================
  // CAPA
  // ============================================================
  // Fundo escuro elegante na capa
  doc.setFillColor(...C.ink);
  doc.rect(0, 0, W, H, "F");

  // Faixa dourada no topo
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, W, 4, "F");

  // Etiqueta superior
  doc.setTextColor(...C.accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BOLETIM DE LANÇAMENTO", M, 60, { charSpace: 2 });

  if (product.clientName) {
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(product.clientName, M, 78);
  }

  // Imagem de capa grande, centralizada
  const coverY = 110;
  const coverH = 360;
  if (product.image_url) {
    const dataUrl = await imageToDataURL(product.image_url);
    if (dataUrl) {
      const coverW = Math.min(360, CW);
      const cx = (W - coverW) / 2;
      // moldura
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx - 6, coverY - 6, coverW + 12, coverH + 12, 4, 4, "F");
      tryAddImage(doc, dataUrl, cx, coverY, coverW, coverH);
    }
  } else {
    // Placeholder discreto
    doc.setDrawColor(...C.muted);
    doc.setLineWidth(0.5);
    const coverW = 360;
    const cx = (W - coverW) / 2;
    doc.roundedRect(cx, coverY, coverW, coverH, 4, 4, "S");
  }

  // Título do produto
  const titleY = coverY + coverH + 60;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  const title = product.name || "Produto";
  const titleLines = doc.splitTextToSize(title, CW);
  doc.text(titleLines, W / 2, titleY, { align: "center" });

  // Subtítulo: categoria
  if (b.categoria) {
    doc.setTextColor(...C.accent);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(b.categoria.toUpperCase(), W / 2, titleY + 22, { align: "center", charSpace: 3 });
  }

  // Rodapé da capa
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.5);
  doc.line(M, H - 70, M + 30, H - 70);
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const today = new Date().toLocaleDateString("pt-BR");
  doc.text(`Emitido em ${today}`, M, H - 55);
  if (product.due_date) {
    doc.text(
      `Lançamento previsto • ${new Date(product.due_date).toLocaleDateString("pt-BR")}`,
      W - M, H - 55, { align: "right" },
    );
  }

  // ============================================================
  // PÁGINAS DE CONTEÚDO
  // ============================================================
  doc.addPage();
  let y = M + 10;

  // Cabeçalho discreto em cada página de conteúdo (desenhado depois no loop)

  const ensureSpace = (need: number) => {
    if (y + need > H - 60) { doc.addPage(); y = M + 10; }
  };

  const sectionTitle = (label: string) => {
    ensureSpace(40);
    // barra dourada vertical
    doc.setFillColor(...C.accent);
    doc.rect(M, y + 2, 3, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.ink);
    doc.text(label.toUpperCase(), M + 12, y + 13, { charSpace: 1.5 });
    y += 22;
    // linha separadora fina
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 14;
  };

  const paragraph = (text?: string | null, opts?: { size?: number; color?: [number, number, number] }) => {
    if (!text) return;
    const size = opts?.size ?? 10;
    const color = opts?.color ?? C.ink;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(text, CW);
    const lineH = size * 1.35;
    for (const ln of wrapped) {
      ensureSpace(lineH + 2);
      doc.text(ln, M, y);
      y += lineH;
    }
    y += 6;
  };

  // ------- Bloco de identificação (grid 3 colunas) -------
  const identItems: Array<[string, string]> = [];
  if (product.statusLabel) identItems.push(["Etapa atual", product.statusLabel]);
  if (b.categoria) identItems.push(["Categoria", b.categoria]);
  if (product.due_date) identItems.push(["Lançamento", new Date(product.due_date).toLocaleDateString("pt-BR")]);
  if (b.volumetria) identItems.push(["Volumetria", b.volumetria]);
  if (b.aspecto_fisico) identItems.push(["Aspecto físico", ASPECTO_LABEL[b.aspecto_fisico] ?? b.aspecto_fisico]);
  if (b.acondicionar) identItems.push(["Acondicionar", ACOND_LABEL[b.acondicionar] ?? b.acondicionar]);

  if (identItems.length) {
    sectionTitle("Identificação");
    const cols = 3;
    const gap = 12;
    const cardW = (CW - gap * (cols - 1)) / cols;
    const cardH = 50;
    for (let i = 0; i < identItems.length; i += cols) {
      ensureSpace(cardH + 8);
      for (let j = 0; j < cols; j++) {
        const item = identItems[i + j];
        if (!item) continue;
        const cx = M + j * (cardW + gap);
        doc.setFillColor(...C.soft);
        doc.roundedRect(cx, y, cardW, cardH, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...C.sub);
        doc.text(item[0].toUpperCase(), cx + 10, y + 16, { charSpace: 1 });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(...C.ink);
        const wrapped = doc.splitTextToSize(item[1], cardW - 20);
        doc.text(wrapped.slice(0, 2), cx + 10, y + 32);
      }
      y += cardH + gap;
    }
    y += 2;
  }

  // ------- Cards de Tampa / Embalagem (imagem + cor + fornecedor) -------
  const componentCard = async (
    label: string,
    images: string[] | undefined,
    cor?: string,
    fornecedor?: string,
  ) => {
    if (!images?.length && !cor && !fornecedor) return;
    const cardH = 130;
    ensureSpace(cardH + 14);
    // moldura
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, CW, cardH, 4, 4, "S");

    // header da card
    doc.setFillColor(...C.accentSoft);
    doc.roundedRect(M, y, CW, 22, 4, 4, "F");
    // tira o canto inferior do header
    doc.setFillColor(...C.accentSoft);
    doc.rect(M, y + 12, CW, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...C.ink);
    doc.text(label.toUpperCase(), M + 12, y + 14, { charSpace: 1.2 });

    // imagem (primeira)
    const imgX = M + 12;
    const imgY = y + 32;
    const imgSize = 86;
    if (images?.[0]) {
      const du = await imageToDataURL(images[0]);
      if (du) tryAddImage(doc, du, imgX, imgY, imgSize, imgSize);
    } else {
      doc.setDrawColor(...C.border);
      doc.roundedRect(imgX, imgY, imgSize, imgSize, 3, 3, "S");
      doc.setTextColor(...C.muted);
      doc.setFontSize(8);
      doc.text("sem imagem", imgX + imgSize / 2, imgY + imgSize / 2 + 3, { align: "center" });
    }

    // infos à direita
    const infoX = imgX + imgSize + 18;
    const infoW = CW - (infoX - M) - 12;
    let iy = imgY + 6;
    const kv = (k: string, v?: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.sub);
      doc.text(k.toUpperCase(), infoX, iy, { charSpace: 1 });
      iy += 11;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...C.ink);
      const ww = doc.splitTextToSize(v && v.length ? v : "—", infoW);
      doc.text(ww.slice(0, 2), infoX, iy);
      iy += ww.slice(0, 2).length * 13 + 8;
    };
    kv("Cor", cor);
    kv("Fornecedor", fornecedor);

    // contagem extra de imagens
    if (images && images.length > 1) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(`+${images.length - 1} imagens em referências visuais`, imgX, imgY + imgSize + 12);
    }

    y += cardH + 12;
  };

  const imgs = b.imagens ?? {};
  if (imgs.tampa?.length || imgs.embalagem?.length || b.tampa_cor || b.embalagem_cor || b.tampa_fornecedor || b.embalagem_fornecedor) {
    sectionTitle("Tampa & Embalagem");
    await componentCard("Tampa", imgs.tampa, b.tampa_cor, b.tampa_fornecedor);
    await componentCard("Embalagem", imgs.embalagem, b.embalagem_cor, b.embalagem_fornecedor);
  }

  // ------- Descrição da embalagem -------
  if (b.descricao_embalagem) {
    sectionTitle("Descrição da embalagem");
    paragraph(b.descricao_embalagem);
  }

  // ------- Briefing -------
  if (b.briefing_criacao) {
    sectionTitle("Briefing de criação");
    paragraph(b.briefing_criacao);
  }

  // ------- Regulatório -------
  if (b.regulatorio_verso) {
    sectionTitle("Regulatório / Verso");
    paragraph(b.regulatorio_verso);
  }

  // ------- Benchmark (texto) -------
  if (b.benchmark && b.benchmark.length) {
    // benchmark aqui é uma lista de URLs/strings — mostramos como texto
    sectionTitle("Benchmark");
    b.benchmark.forEach((bm) => paragraph(`• ${bm}`, { size: 9, color: C.sub }));
  }

  // ------- Responsáveis -------
  if (b.responsaveis && b.responsaveis.length) {
    sectionTitle("Responsáveis");
    ensureSpace(50);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Nome", "Papel"]],
      body: b.responsaveis.map((r) => [r.nome || "—", r.papel || "—"]),
      styles: { fontSize: 9, cellPadding: 6, textColor: C.ink, lineColor: C.border, lineWidth: 0.3 },
      headStyles: { fillColor: C.ink, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: C.soft },
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // ------- SKUs -------
  if (product.skus && product.skus.length) {
    sectionTitle("SKUs");
    ensureSpace(50);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Nome", "Descrição", "Cor/Acabamento", "Vol/Ros", "Fornecedor", "Custo"]],
      body: product.skus.map((s) => [
        s.name || "—",
        s.descricao || "—",
        s.cor_acabamento || "—",
        s.vol_ros || "—",
        s.fornecedor || "—",
        s.custo_compras || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 5, textColor: C.ink, lineColor: C.border, lineWidth: 0.3 },
      headStyles: { fillColor: C.ink, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: C.soft },
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // ------- Links -------
  if (product.links && product.links.length) {
    sectionTitle("Links");
    product.links.forEach((l) => {
      ensureSpace(16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...C.accent);
      doc.textWithLink(`→ ${l.label || l.url}`, M, y, { url: l.url });
      y += 14;
    });
    y += 4;
  }

  // ------- Notas -------
  if (product.notes) {
    sectionTitle("Notas");
    paragraph(product.notes);
  }

  // ------- Galeria de referências visuais -------
  const allImgs: Array<{ label: string; url: string }> = [];
  (["tampa", "embalagem", "rotulo", "outros"] as const).forEach((k) => {
    (imgs[k] ?? []).forEach((u) => allImgs.push({ label: k, url: u }));
  });
  if (allImgs.length) {
    sectionTitle("Referências visuais");
    const cols = 3;
    const gap = 10;
    const tw = (CW - gap * (cols - 1)) / cols;
    let col = 0;
    for (const it of allImgs) {
      if (col === 0) ensureSpace(tw + 24);
      const cx = M + col * (tw + gap);
      const du = await imageToDataURL(it.url);
      // moldura sutil
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.4);
      doc.roundedRect(cx, y, tw, tw, 3, 3, "S");
      if (du) tryAddImage(doc, du, cx + 1, y + 1, tw - 2, tw - 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.sub);
      doc.text(it.label.toUpperCase(), cx, y + tw + 10, { charSpace: 1 });
      col++;
      if (col >= cols) {
        col = 0;
        y += tw + 22;
      }
    }
    if (col !== 0) y += tw + 22;
  }

  // ============================================================
  // CABEÇALHO + RODAPÉ em todas as páginas de conteúdo (pula a capa)
  // ============================================================
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    // header
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.4);
    doc.line(M, 32, W - M, 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.accent);
    doc.text("BOLETIM DE LANÇAMENTO", M, 24, { charSpace: 1.5 });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.sub);
    const right = [product.name, product.clientName].filter(Boolean).join(" • ");
    if (right) doc.text(right, W - M, 24, { align: "right" });
    // footer
    doc.setDrawColor(...C.border);
    doc.line(M, H - 30, W - M, H - 30);
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(`Página ${i} de ${total}`, W - M, H - 16, { align: "right" });
    doc.text(today, M, H - 16);
  }

  const safe = (product.name || "boletim").replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
  doc.save(`boletim_${safe}.pdf`);
}
