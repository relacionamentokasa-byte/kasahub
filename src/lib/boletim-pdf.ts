import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LaunchGridProduct, LaunchGridBoletim } from "@/lib/launch-grids-api";
import { resolveStorageUrl } from "@/lib/use-storage-url";
import { registerBoletimFonts } from "@/lib/pdf-fonts";

/**
 * Remove caracteres que a fonte padrão do jsPDF (Helvetica/WinAnsi) não
 * suporta — emojis, símbolos exóticos, etc. — para evitar "mojibake"
 * tipo "Ø=Üã" no PDF. Mantém acentos latinos.
 */
function sanitize(s?: string | null): string {
  if (s == null) return "";
  let out = String(s).normalize("NFC");
  // remove emojis e pictographs
  out = out.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{1F000}-\u{1F02F}\u{1F100}-\u{1F1FF}\u{FE0F}]/gu, "");
  // remove qualquer caractere fora do range WinAnsi/Latin-1 estendido
  out = out.replace(/[^\u0000-\u00FF]/g, "");
  return out.replace(/\s+/g, " ").trim();
}

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

/* =========================================================
 * Paleta Kasa Hub (espelha src/styles.css)
 *  bg     #0C1618   verde-petróleo
 *  surf   #142124   superfície
 *  card   #1B2A2D   card elevado
 *  ink    #F4F7F5   texto principal
 *  sub    #9CB1B0   texto secundário
 *  muted  #6B807F   texto auxiliar
 *  brand  #FFBC45   amarelo Kasa
 *  brandS #3A2E12   amarelo Kasa esmaecido
 * ========================================================= */
const K = {
  bg:        [12, 22, 24]    as [number, number, number],
  surf:      [20, 33, 36]    as [number, number, number],
  card:      [27, 42, 45]    as [number, number, number],
  ink:       [244, 247, 245] as [number, number, number],
  inkDark:   [15, 23, 25]    as [number, number, number],
  sub:       [156, 177, 176] as [number, number, number],
  muted:     [107, 128, 127] as [number, number, number],
  border:    [42, 60, 63]    as [number, number, number],
  borderLt:  [228, 232, 230] as [number, number, number],
  soft:      [246, 248, 246] as [number, number, number],
  brand:     [255, 188, 69]  as [number, number, number],
  brandDark: [201, 142, 38]  as [number, number, number],
  brandSoft: [255, 240, 210] as [number, number, number],
};

async function imageToDataURL(url: string): Promise<string | null> {
  const signed = (await resolveStorageUrl(url)) ?? url;
  url = signed;
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
    try { doc.addImage(dataUrl, "PNG", x, y, w, h, undefined, "FAST"); return true; }
    catch {
      try { doc.addImage(dataUrl, "WEBP" as any, x, y, w, h, undefined, "FAST"); return true; } catch { return false; }
    }
  }
}

// Calcula dimensões "cover" mantendo proporção dentro do box
async function fitCover(dataUrl: string, boxW: number, boxH: number) {
  return new Promise<{ w: number; h: number; ox: number; oy: number }>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const iw = img.width, ih = img.height;
      const scale = Math.max(boxW / iw, boxH / ih);
      const w = iw * scale, h = ih * scale;
      resolve({ w, h, ox: (boxW - w) / 2, oy: (boxH - h) / 2 });
    };
    img.onerror = () => resolve({ w: boxW, h: boxH, ox: 0, oy: 0 });
    img.src = dataUrl;
  });
}

export async function exportBoletimPdf(
  product: Pick<LaunchGridProduct, "name" | "image_url" | "due_date" | "links" | "skus" | "notes" | "description"> & {
    boletim: LaunchGridBoletim;
    statusLabel?: string;
    clientName?: string;
  },
) {
  // Sanitiza todo o texto vindo do usuário ANTES de desenhar — Helvetica
  // só fala WinAnsi e qualquer emoji vira "Ø=Üã".
  product = {
    ...product,
    name: sanitize(product.name),
    description: sanitize(product.description),
    notes: sanitize(product.notes),
    statusLabel: sanitize(product.statusLabel),
    clientName: sanitize(product.clientName),
    links: (product.links ?? []).map((l) => ({ ...l, label: sanitize(l.label), url: l.url })),
    skus: (product.skus ?? []).map((s) => ({
      ...s,
      name: sanitize(s.name),
      descricao: sanitize(s.descricao),
      cor_acabamento: sanitize(s.cor_acabamento),
      vol_ros: sanitize(s.vol_ros),
      fornecedor: sanitize(s.fornecedor),
      custo_compras: sanitize(s.custo_compras),
    })),
    boletim: {
      ...product.boletim,
      categoria: sanitize(product.boletim.categoria),
      briefing_criacao: sanitize(product.boletim.briefing_criacao),
      regulatorio_verso: sanitize(product.boletim.regulatorio_verso),
      volumetria: sanitize(product.boletim.volumetria),
      descricao_embalagem: sanitize(product.boletim.descricao_embalagem),
      embalagem_cor: sanitize(product.boletim.embalagem_cor),
      embalagem_fornecedor: sanitize(product.boletim.embalagem_fornecedor),
      tampa_cor: sanitize(product.boletim.tampa_cor),
      tampa_fornecedor: sanitize(product.boletim.tampa_fornecedor),
      responsaveis: (product.boletim.responsaveis ?? []).map((r) => ({
        nome: sanitize(r.nome),
        papel: sanitize(r.papel),
      })),
    },
  };

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Carrega Funnel Display (títulos) e Onest (subtítulos/corpo).
  // Em caso de falha de rede, cai para Helvetica.
  const fonts = await registerBoletimFonts(doc);
  const FONT_TITLE = fonts.funnel ? "Funnel" : "helvetica";
  const FONT_BODY = fonts.onest ? "Onest" : "helvetica";

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 44;
  const CW = W - 2 * M;
  const b = product.boletim;
  const today = new Date().toLocaleDateString("pt-BR");



  // ============================================================
  // CAPA — fundo escuro Kasa + acento âmbar
  // ============================================================
  doc.setFillColor(...K.bg);
  doc.rect(0, 0, W, H, "F");

  // Padrão decorativo sutil — quadrado âmbar no canto
  doc.setFillColor(...K.brand);
  doc.rect(0, 0, W, 5, "F");
  doc.setFillColor(...K.brand);
  doc.rect(W - 90, H - 90, 90, 5, "F");
  doc.rect(W - 5, H - 90, 5, 90, "F");

  // Etiqueta
  doc.setTextColor(...K.brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("KASA HUB  •  BOLETIM DE LANÇAMENTO", M, 60, { charSpace: 2.5 });

  if (product.clientName) {
    doc.setTextColor(...K.sub);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Cliente: ${product.clientName}`, M, 78);
  }

  // Imagem de capa com moldura âmbar
  const coverY = 118;
  const coverBoxW = Math.min(380, CW);
  const coverBoxH = 360;
  const cx = (W - coverBoxW) / 2;

  // moldura âmbar
  doc.setDrawColor(...K.brand);
  doc.setLineWidth(1.5);
  doc.roundedRect(cx - 8, coverY - 8, coverBoxW + 16, coverBoxH + 16, 6, 6, "S");

  if (product.image_url) {
    const dataUrl = await imageToDataURL(product.image_url);
    if (dataUrl) {
      // clip via fundo escuro + imagem dentro
      doc.setFillColor(...K.surf);
      doc.roundedRect(cx, coverY, coverBoxW, coverBoxH, 4, 4, "F");
      const fit = await fitCover(dataUrl, coverBoxW, coverBoxH);
      // Ajusta para caber sem distorcer (contain) — preferimos contain na capa
      const img = new Image();
      await new Promise((r) => { img.onload = () => r(null); img.onerror = () => r(null); img.src = dataUrl; });
      const ratio = img.width && img.height ? img.width / img.height : 1;
      let drawW = coverBoxW, drawH = coverBoxW / ratio;
      if (drawH > coverBoxH) { drawH = coverBoxH; drawW = coverBoxH * ratio; }
      const dx = cx + (coverBoxW - drawW) / 2;
      const dy = coverY + (coverBoxH - drawH) / 2;
      tryAddImage(doc, dataUrl, dx, dy, drawW, drawH);
      void fit;
    }
  } else {
    doc.setFillColor(...K.surf);
    doc.roundedRect(cx, coverY, coverBoxW, coverBoxH, 4, 4, "F");
    doc.setTextColor(...K.muted);
    doc.setFontSize(10);
    doc.text("sem imagem de produto", W / 2, coverY + coverBoxH / 2, { align: "center" });
  }

  // Título
  const titleY = coverY + coverBoxH + 64;
  doc.setTextColor(...K.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  const titleLines = doc.splitTextToSize(product.name || "Produto", CW);
  doc.text(titleLines, W / 2, titleY, { align: "center" });

  // Categoria
  if (b.categoria) {
    doc.setTextColor(...K.brand);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(b.categoria.toUpperCase(), W / 2, titleY + 22, { align: "center", charSpace: 3 });
  }

  // Rodapé capa
  doc.setDrawColor(...K.brand);
  doc.setLineWidth(0.6);
  doc.line(M, H - 70, M + 36, H - 70);
  doc.setTextColor(...K.sub);
  doc.setFontSize(8);
  doc.text(`Emitido em ${today}`, M, H - 55);
  if (product.due_date) {
    doc.text(
      `Lançamento previsto • ${new Date(product.due_date).toLocaleDateString("pt-BR")}`,
      W - M, H - 55, { align: "right" },
    );
  }

  // ============================================================
  // CONTEÚDO — fundo claro para leitura confortável
  // ============================================================
  doc.addPage();
  let y = 64;

  const ensureSpace = (need: number) => {
    if (y + need > H - 60) { doc.addPage(); y = 64; }
  };

  const sectionTitle = (label: string) => {
    ensureSpace(44);
    doc.setFillColor(...K.brand);
    doc.rect(M, y + 2, 3.5, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...K.inkDark);
    doc.text(label.toUpperCase(), M + 14, y + 14, { charSpace: 1.8 });
    y += 24;
    doc.setDrawColor(...K.borderLt);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 14;
  };

  const paragraph = (text?: string | null, opts?: { size?: number; color?: [number, number, number] }) => {
    if (!text) return;
    const size = opts?.size ?? 10;
    const color = opts?.color ?? K.inkDark;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(text, CW);
    const lineH = size * 1.45;
    for (const ln of wrapped) {
      ensureSpace(lineH + 2);
      doc.text(ln, M, y);
      y += lineH;
    }
    y += 6;
  };

  // ---------- Identificação (cards) ----------
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
    const cardH = 54;
    for (let i = 0; i < identItems.length; i += cols) {
      ensureSpace(cardH + 8);
      for (let j = 0; j < cols; j++) {
        const item = identItems[i + j];
        if (!item) continue;
        const xc = M + j * (cardW + gap);
        doc.setFillColor(...K.soft);
        doc.roundedRect(xc, y, cardW, cardH, 4, 4, "F");
        // barra esquerda âmbar fina
        doc.setFillColor(...K.brand);
        doc.rect(xc, y, 2.5, cardH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...K.muted);
        doc.text(item[0].toUpperCase(), xc + 12, y + 17, { charSpace: 1 });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11.5);
        doc.setTextColor(...K.inkDark);
        const wrapped = doc.splitTextToSize(item[1], cardW - 22);
        doc.text(wrapped.slice(0, 2), xc + 12, y + 34);
      }
      y += cardH + gap;
    }
    y += 4;
  }

  // ---------- Cards Tampa / Embalagem ----------
  const componentCard = async (label: string, images: string[] | undefined, cor?: string, fornecedor?: string) => {
    if (!images?.length && !cor && !fornecedor) return;
    const cardH = 140;
    ensureSpace(cardH + 14);

    // moldura
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(M, y, CW, cardH, 5, 5, "F");
    doc.setDrawColor(...K.borderLt);
    doc.setLineWidth(0.6);
    doc.roundedRect(M, y, CW, cardH, 5, 5, "S");

    // header âmbar
    doc.setFillColor(...K.brand);
    doc.roundedRect(M, y, CW, 24, 5, 5, "F");
    doc.setFillColor(...K.brand);
    doc.rect(M, y + 14, CW, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...K.inkDark);
    doc.text(label.toUpperCase(), M + 14, y + 15, { charSpace: 1.5 });

    // imagem
    const imgX = M + 14;
    const imgY = y + 36;
    const imgSize = 92;
    if (images?.[0]) {
      const du = await imageToDataURL(images[0]);
      if (du) {
        doc.setFillColor(...K.soft);
        doc.roundedRect(imgX, imgY, imgSize, imgSize, 4, 4, "F");
        const img = new Image();
        await new Promise((r) => { img.onload = () => r(null); img.onerror = () => r(null); img.src = du; });
        const ratio = img.width && img.height ? img.width / img.height : 1;
        let dw = imgSize, dh = imgSize / ratio;
        if (dh > imgSize) { dh = imgSize; dw = imgSize * ratio; }
        tryAddImage(doc, du, imgX + (imgSize - dw) / 2, imgY + (imgSize - dh) / 2, dw, dh);
      }
    } else {
      doc.setFillColor(...K.soft);
      doc.roundedRect(imgX, imgY, imgSize, imgSize, 4, 4, "F");
      doc.setTextColor(...K.muted);
      doc.setFontSize(8);
      doc.text("sem imagem", imgX + imgSize / 2, imgY + imgSize / 2 + 3, { align: "center" });
    }

    // info
    const infoX = imgX + imgSize + 22;
    const infoW = CW - (infoX - M) - 14;
    let iy = imgY + 8;
    const kv = (k: string, v?: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...K.muted);
      doc.text(k.toUpperCase(), infoX, iy, { charSpace: 1 });
      iy += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...K.inkDark);
      const ww = doc.splitTextToSize(v && v.length ? v : "—", infoW);
      doc.text(ww.slice(0, 2), infoX, iy);
      iy += ww.slice(0, 2).length * 13 + 10;
    };
    kv("Cor", cor);
    kv("Fornecedor", fornecedor);

    if (images && images.length > 1) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...K.muted);
      doc.text(`+${images.length - 1} imagem(ns) em referências visuais`, imgX, imgY + imgSize + 14);
    }

    y += cardH + 14;
  };

  const imgs = b.imagens ?? {};
  if (imgs.tampa?.length || imgs.embalagem?.length || b.tampa_cor || b.embalagem_cor || b.tampa_fornecedor || b.embalagem_fornecedor) {
    sectionTitle("Tampa & Embalagem");
    await componentCard("Tampa", imgs.tampa, b.tampa_cor, b.tampa_fornecedor);
    await componentCard("Embalagem", imgs.embalagem, b.embalagem_cor, b.embalagem_fornecedor);
  }

  // ---------- Descrição da embalagem ----------
  if (b.descricao_embalagem) {
    sectionTitle("Descrição da embalagem");
    paragraph(b.descricao_embalagem);
  }

  // ---------- Briefing ----------
  if (b.briefing_criacao) {
    sectionTitle("Briefing de criação");
    paragraph(b.briefing_criacao);
  }

  // ---------- Regulatório ----------
  if (b.regulatorio_verso) {
    sectionTitle("Regulatório / Verso");
    paragraph(b.regulatorio_verso);
  }

  // ---------- Galeria de imagens (helper) ----------
  const imageGallery = async (items: string[], cols = 3, captionFn?: (i: number) => string) => {
    const gap = 10;
    const tw = (CW - gap * (cols - 1)) / cols;
    let col = 0;
    for (let i = 0; i < items.length; i++) {
      if (col === 0) ensureSpace(tw + 26);
      const xc = M + col * (tw + gap);
      // moldura suave
      doc.setFillColor(...K.soft);
      doc.roundedRect(xc, y, tw, tw, 4, 4, "F");
      doc.setDrawColor(...K.borderLt);
      doc.setLineWidth(0.4);
      doc.roundedRect(xc, y, tw, tw, 4, 4, "S");

      const du = await imageToDataURL(items[i]);
      if (du) {
        const img = new Image();
        await new Promise((r) => { img.onload = () => r(null); img.onerror = () => r(null); img.src = du; });
        const ratio = img.width && img.height ? img.width / img.height : 1;
        let dw = tw - 6, dh = (tw - 6) / ratio;
        if (dh > tw - 6) { dh = tw - 6; dw = (tw - 6) * ratio; }
        tryAddImage(doc, du, xc + (tw - dw) / 2, y + (tw - dh) / 2, dw, dh);
      } else {
        doc.setTextColor(...K.muted);
        doc.setFontSize(7.5);
        doc.text("imagem indisponível", xc + tw / 2, y + tw / 2, { align: "center" });
      }

      if (captionFn) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...K.muted);
        doc.text(captionFn(i), xc, y + tw + 11, { charSpace: 0.8 });
      }

      col++;
      if (col >= cols) { col = 0; y += tw + (captionFn ? 22 : 14); }
    }
    if (col !== 0) y += tw + (captionFn ? 22 : 14);
  };

  // ---------- Benchmark (imagens) ----------
  if (b.benchmark && b.benchmark.length) {
    sectionTitle("Benchmark");
    await imageGallery(b.benchmark, 3);
  }

  // ---------- Responsáveis ----------
  if (b.responsaveis && b.responsaveis.length) {
    sectionTitle("Responsáveis");
    ensureSpace(50);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Nome", "Papel"]],
      body: b.responsaveis.map((r) => [r.nome || "—", r.papel || "—"]),
      styles: { fontSize: 9.5, cellPadding: 7, textColor: K.inkDark, lineColor: K.borderLt, lineWidth: 0.3, font: "helvetica" },
      headStyles: { fillColor: K.bg, textColor: K.brand, fontStyle: "bold", fontSize: 8.5, cellPadding: 7 },
      alternateRowStyles: { fillColor: K.soft },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  // ---------- SKUs ----------
  if (product.skus && product.skus.length) {
    sectionTitle("SKUs");
    ensureSpace(50);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Nome", "Descrição", "Cor/Acab.", "Vol/Ros", "Fornecedor", "Custo"]],
      body: product.skus.map((s) => [
        s.name || "—",
        s.descricao || "—",
        s.cor_acabamento || "—",
        s.vol_ros || "—",
        s.fornecedor || "—",
        s.custo_compras || "—",
      ]),
      styles: { fontSize: 8.5, cellPadding: 6, textColor: K.inkDark, lineColor: K.borderLt, lineWidth: 0.3 },
      headStyles: { fillColor: K.bg, textColor: K.brand, fontStyle: "bold", fontSize: 7.8 },
      alternateRowStyles: { fillColor: K.soft },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  // ---------- Links ----------
  if (product.links && product.links.length) {
    sectionTitle("Links");
    product.links.forEach((l) => {
      ensureSpace(16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...K.brandDark);
      doc.textWithLink(`→ ${l.label || l.url}`, M, y, { url: l.url });
      y += 14;
    });
    y += 4;
  }

  // ---------- Notas ----------
  if (product.notes) {
    sectionTitle("Notas");
    paragraph(product.notes);
  }

  // ---------- Referências visuais (todas imagens agrupadas) ----------
  const allImgs: Array<{ label: string; url: string }> = [];
  (["tampa", "embalagem", "rotulo", "outros"] as const).forEach((k) => {
    (imgs[k] ?? []).forEach((u) => allImgs.push({ label: k, url: u }));
  });
  if (allImgs.length) {
    sectionTitle("Referências visuais");
    await imageGallery(allImgs.map((i) => i.url), 3, (i) => allImgs[i].label.toUpperCase());
  }

  // ============================================================
  // CABEÇALHO + RODAPÉ — todas as páginas exceto a capa
  // ============================================================
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);

    // Faixa âmbar fina no topo
    doc.setFillColor(...K.brand);
    doc.rect(0, 0, W, 3, "F");

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...K.brandDark);
    doc.text("KASA HUB  •  BOLETIM DE LANÇAMENTO", M, 30, { charSpace: 1.5 });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...K.muted);
    const right = [product.name, product.clientName].filter(Boolean).join(" • ");
    if (right) doc.text(right, W - M, 30, { align: "right" });
    doc.setDrawColor(...K.borderLt);
    doc.setLineWidth(0.4);
    doc.line(M, 40, W - M, 40);

    // Footer
    doc.line(M, H - 32, W - M, H - 32);
    doc.setFontSize(8);
    doc.setTextColor(...K.muted);
    doc.text(today, M, H - 18);
    doc.text(`Página ${i} de ${total}`, W - M, H - 18, { align: "right" });
  }

  const safe = (product.name || "boletim").replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
  doc.save(`boletim_${safe}.pdf`);
}
