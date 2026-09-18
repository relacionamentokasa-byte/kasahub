import jsPDF from "jspdf";
import {
  type Script, type ScriptScene,
  SCRIPT_CONTENT_LABEL, SCRIPT_STATUS_LABEL,
} from "@/lib/scripts-api";
import { SOCIAL_LABEL } from "@/lib/editorial-api";
import { registerBoletimFonts } from "@/lib/pdf-fonts";
import { resolveStorageUrl } from "@/lib/use-storage-url";

/* =========================================================
 * Paleta KASA HUB
 * ========================================================= */
const COLOR = {
  bgDark: [12, 22, 24] as [number, number, number],       // #0C1618 Petróleo escuro
  brand: [255, 188, 69] as [number, number, number],      // #FFBC45 Amarelo Kasa
  brandDark: [201, 142, 38] as [number, number, number],  // #C98E26
  brandLight: [255, 248, 235] as [number, number, number],// #FFF8EB
  cardBg: [252, 252, 250] as [number, number, number],    // #FCFCFA Fundo suave
  sceneHeaderBg: [241, 245, 244] as [number, number, number], // #F1F5F4
  bubbleBg: [246, 248, 247] as [number, number, number], // #F6F8F7
  bubbleSpeechBg: [255, 252, 242] as [number, number, number], // #FFFCF2 Fundo fala/locução
  bubbleSpeechBorder: [255, 226, 153] as [number, number, number], // #FFE299 Borda fala
  textDark: [18, 28, 30] as [number, number, number],     // #121C1E
  textMedium: [65, 80, 82] as [number, number, number],   // #415052
  textMuted: [120, 138, 137] as [number, number, number], // #788A89
  border: [222, 230, 228] as [number, number, number],    // #DEE6E4
  borderSoft: [238, 242, 241] as [number, number, number],// #EEF2F1
  white: [255, 255, 255] as [number, number, number],
};

async function imageToDataURL(url: string): Promise<string | null> {
  const signed = (await resolveStorageUrl(url)) ?? url;
  try {
    const res = await fetch(signed);
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

/** Ajusta a imagem inteira dentro do box (sem cortar) mantendo proporção. */
async function fitContain(dataUrl: string, boxW: number, boxH: number) {
  return new Promise<{ w: number; h: number; ox: number; oy: number }>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(boxW / img.width, boxH / img.height);
      const w = Math.max(1, img.width * scale);
      const h = Math.max(1, img.height * scale);
      resolve({ w, h, ox: (boxW - w) / 2, oy: (boxH - h) / 2 });
    };
    img.onerror = () => resolve({ w: boxW, h: boxH, ox: 0, oy: 0 });
    img.src = dataUrl;
  });
}

function sanitize(s?: string | null): string {
  if (s == null) return "";
  let out = String(s).normalize("NFC");
  out = out.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{1F000}-\u{1F02F}\u{1F100}-\u{1F1FF}\u{FE0F}]/gu,
    "",
  );
  out = out.replace(/[^ -ÿ\n]/g, "");
  return out.replace(/[ \t]+/g, " ").trim();
}

const formatLabel: Record<string, string> = {
  vertical: "Vertical 9:16 (Stories / Reels / TikTok)",
  horizontal: "Horizontal 16:9 (YouTube / TV)",
  square: "Quadrado 1:1 (Feed)",
};

interface PreloadedScene {
  scene: ScriptScene;
  imageDataUrl: string | null;
}

export async function exportScriptPdf(opts: {
  script: Script & { clients?: { name: string } | null; jobs?: { title: string } | null };
  scenes: ScriptScene[];
}) {
  const { script, scenes } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const fonts = await registerBoletimFonts(doc);
  const FONT_TITLE = fonts.funnel ? "Funnel" : "helvetica";
  const FONT_BODY = fonts.onest ? "Onest" : "helvetica";

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 36;
  const contentW = pageW - marginX * 2;
  const bottomMargin = 40;

  // Ordena cenas cronologicamente
  const sortedScenes = scenes.slice().sort((a, b) => a.scene_number - b.scene_number);

  // Pré-carrega todas as imagens de referência em paralelo
  const preloadedScenes: PreloadedScene[] = await Promise.all(
    sortedScenes.map(async (scene) => {
      let imageDataUrl: string | null = null;
      if (scene.reference_image_url) {
        imageDataUrl = await imageToDataURL(scene.reference_image_url);
      }
      return { scene, imageDataUrl };
    })
  );

  let currentY = 0;

  // Renderiza cabeçalho principal
  const drawMainHeader = () => {
    // Header Dark Banner
    doc.setFillColor(...COLOR.bgDark);
    doc.rect(0, 0, pageW, 110, "F");

    // Faixa dourada decorativa no topo
    doc.setFillColor(...COLOR.brand);
    doc.rect(0, 0, pageW, 3.5, "F");

    // Tag KASA HUB / Roteiro
    doc.setTextColor(...COLOR.brand);
    doc.setFont(FONT_TITLE, "bold");
    doc.setFontSize(9);
    doc.text("KASA HUB  ·  ROTEIRO OPERACIONAL DE GRAVAÇÃO", marginX, 28);

    // Título do Roteiro
    doc.setTextColor(...COLOR.white);
    doc.setFont(FONT_TITLE, "bold");
    doc.setFontSize(18);
    const titleText = sanitize(script.title || "Roteiro sem título");
    const titleLines = doc.splitTextToSize(titleText, contentW);
    doc.text(titleLines.slice(0, 2), marginX, 50);

    // Linha de Meta (Cliente e Job)
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(200, 215, 214);
    const metaParts = [
      script.clients?.name ? `Cliente: ${sanitize(script.clients.name)}` : null,
      script.jobs?.title ? `Job: ${sanitize(script.jobs.title)}` : null,
    ].filter(Boolean);
    if (metaParts.length > 0) {
      doc.text(metaParts.join("   |   "), marginX, 84);
    }

    // Grid de Informações e Metadados Técnicos (Card Superior)
    const cardY = 120;
    const cardH = 64;
    doc.setFillColor(...COLOR.cardBg);
    doc.setDrawColor(...COLOR.border);
    doc.setLineWidth(0.75);
    doc.roundedRect(marginX, cardY, contentW, cardH, 6, 6, "FD");

    const totalDur = scenes.reduce((a, s) => a + (s.duration_sec ?? 0), 0);
    const estimatedDur = script.estimated_duration_sec ?? totalDur;

    const colW = contentW / 3;

    // Coluna 1: Tipo & Formato
    doc.setFont(FONT_TITLE, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.textMuted);
    doc.text("FORMATO & CANAL", marginX + 12, cardY + 18);

    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.textDark);
    const platformLabel = SOCIAL_LABEL[script.platform as keyof typeof SOCIAL_LABEL] ?? script.platform;
    const contentTypeLabel = SCRIPT_CONTENT_LABEL[script.content_type] ?? script.content_type;
    doc.text(`${contentTypeLabel} · ${platformLabel}`, marginX + 12, cardY + 32);

    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.textMedium);
    const vFormat = script.video_format ? (formatLabel[script.video_format] || script.video_format) : "Formato livre";
    doc.text(vFormat, marginX + 12, cardY + 48);

    // Coluna 2: Duração & Cenas
    doc.setFont(FONT_TITLE, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.textMuted);
    doc.text("TEMPO & ESTRUTURA", marginX + colW + 12, cardY + 18);

    doc.setFont(FONT_BODY, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLOR.brandDark);
    doc.text(`${estimatedDur} segundos`, marginX + colW + 12, cardY + 33);

    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.textMedium);
    doc.text(`${scenes.length} cena(s) catalogada(s)`, marginX + colW + 12, cardY + 48);

    // Coluna 3: Status & Conceito
    doc.setFont(FONT_TITLE, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.textMuted);
    doc.text("STATUS", marginX + colW * 2 + 12, cardY + 18);

    doc.setFont(FONT_BODY, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.textDark);
    doc.text(SCRIPT_STATUS_LABEL[script.status] || script.status, marginX + colW * 2 + 12, cardY + 32);

    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.textMuted);
    doc.text(`Exportado em ${new Date().toLocaleDateString("pt-BR")}`, marginX + colW * 2 + 12, cardY + 48);

    currentY = cardY + cardH + 18;
  };

  // Cabeçalho simplificado para páginas seguintes
  const drawSubsequentHeader = () => {
    doc.setFillColor(...COLOR.bgDark);
    doc.rect(0, 0, pageW, 36, "F");

    doc.setFillColor(...COLOR.brand);
    doc.rect(0, 0, pageW, 2.5, "F");

    doc.setTextColor(...COLOR.brand);
    doc.setFont(FONT_TITLE, "bold");
    doc.setFontSize(8);
    doc.text("KASA HUB  ·  ROTEIRO DE GRAVAÇÃO", marginX, 22);

    doc.setTextColor(...COLOR.white);
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(8.5);
    const shortTitle = sanitize(script.title || "Roteiro");
    doc.text(shortTitle, pageW - marginX - doc.getTextWidth(shortTitle), 22);

    currentY = 52;
  };

  drawMainHeader();

  // Se houver conceito geral / briefing do vídeo, imprime um pequeno card antes das cenas
  if (script.video_concept) {
    const conceptText = sanitize(script.video_concept);
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(9);
    const conceptLines = doc.splitTextToSize(conceptText, contentW - 24);
    const conceptH = 28 + conceptLines.length * 12;

    if (currentY + conceptH > pageH - bottomMargin) {
      doc.addPage();
      drawSubsequentHeader();
    }

    doc.setFillColor(...COLOR.bubbleBg);
    doc.setDrawColor(...COLOR.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(marginX, currentY, contentW, conceptH, 5, 5, "FD");

    doc.setFont(FONT_TITLE, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.brandDark);
    doc.text("CONCEITO / BRIEFING GERAL DO VÍDEO", marginX + 12, currentY + 16);

    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.textDark);
    doc.text(conceptLines, marginX + 12, currentY + 28);

    currentY += conceptH + 14;
  }

  // Título da seção de cenas
  doc.setFont(FONT_TITLE, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR.textDark);
  doc.text("CENAS & SEQUÊNCIA DE PRODUÇÃO", marginX, currentY);
  currentY += 12;

  // Renderização sequencial dos cards de cena
  for (let idx = 0; idx < preloadedScenes.length; idx++) {
    const { scene, imageDataUrl } = preloadedScenes[idx];
    const hasImage = Boolean(imageDataUrl);

    // Layout de colunas dentro do Card
    // Se tiver imagem: coluna de texto + foto lateral de referência
    const imageColW = hasImage ? 140 : 0;
    const gap = hasImage ? 12 : 0;
    const textColW = contentW - 24 - (hasImage ? (imageColW + gap) : 0);

    // Pré-calcula linhas de texto para medir a altura do card
    const visualText = sanitize(scene.visual || "Sem descrição visual.");
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(9);
    const visualLines = doc.splitTextToSize(visualText, textColW);

    const speechText = sanitize(scene.speech || "");
    const speechLines = speechText ? doc.splitTextToSize(speechText, textColW - 16) : [];

    const notesText = sanitize(scene.production_notes || "");
    const notesLines = notesText ? doc.splitTextToSize(notesText, textColW) : [];

    const refUrlText = sanitize(scene.reference_url || "");
    const refUrlLines = refUrlText ? doc.splitTextToSize(refUrlText, textColW) : [];

    // Cálculo da altura de cada seção interna
    let textHeight = 0;

    // Seção Visual
    textHeight += 12 + visualLines.length * 11.5 + 8;

    // Seção Fala / Locução (dentro de box destacado)
    let speechBoxH = 0;
    if (speechLines.length > 0) {
      speechBoxH = 18 + speechLines.length * 11.5 + 8;
      textHeight += speechBoxH + 6;
    }

    // Seção Notas de Produção
    if (notesLines.length > 0) {
      textHeight += 12 + notesLines.length * 11 + 6;
    }

    // Link externo de referência
    if (refUrlLines.length > 0) {
      textHeight += 12 + refUrlLines.length * 10 + 4;
    }

    // Altura mínima da imagem
    const imageHeightReq = hasImage ? 160 : 0;
    const contentH = Math.max(textHeight, imageHeightReq);

    // Cabeçalho da cena (badge e tempo) = 28pt
    const cardHeaderH = 26;
    const totalCardH = cardHeaderH + contentH + 16;

    // Quebra de página se não couber o card inteiro
    if (currentY + totalCardH > pageH - bottomMargin) {
      doc.addPage();
      drawSubsequentHeader();
    }

    const cardY = currentY;

    // Fundo do Card da Cena
    doc.setFillColor(...COLOR.cardBg);
    doc.setDrawColor(...COLOR.border);
    doc.setLineWidth(0.75);
    doc.roundedRect(marginX, cardY, contentW, totalCardH, 6, 6, "FD");

    // Cabeçalho da cena
    doc.setFillColor(...COLOR.sceneHeaderBg);
    doc.roundedRect(marginX, cardY, contentW, cardHeaderH, 6, 6, "F");
    doc.rect(marginX, cardY + cardHeaderH - 4, contentW, 4, "F"); // alinha canto inferior do header

    // Linha divisória
    doc.setDrawColor(...COLOR.borderSoft);
    doc.line(marginX, cardY + cardHeaderH, marginX + contentW, cardY + cardHeaderH);

    // Número da Cena
    doc.setFont(FONT_TITLE, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.textDark);
    doc.text(`CENA ${scene.scene_number}`, marginX + 12, cardY + 17);

    // Duração da Cena (Badge)
    const durStr = scene.duration_sec != null ? `${scene.duration_sec}s` : "tempo livre";
    doc.setFont(FONT_BODY, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.brandDark);
    const durBadgeW = doc.getTextWidth(`  ${durStr}  `) + 12;
    doc.setFillColor(...COLOR.brandLight);
    doc.setDrawColor(...COLOR.brandDark);
    doc.setLineWidth(0.5);
    doc.roundedRect(marginX + contentW - durBadgeW - 12, cardY + 6, durBadgeW, 15, 3, 3, "FD");
    doc.text(durStr, marginX + contentW - durBadgeW - 6, cardY + 17);

    // Renderização do conteúdo textual (coluna esquerda)
    let innerY = cardY + cardHeaderH + 12;
    const textX = marginX + 12;

    // 1. AÇÃO / VISUAL
    doc.setFont(FONT_TITLE, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR.textMuted);
    doc.text("ENQUADRAMENTO & AÇÃO VISUAL", textX, innerY);
    innerY += 10;

    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.textDark);
    doc.text(visualLines, textX, innerY);
    innerY += visualLines.length * 11.5 + 8;

    // 2. FALA / LOCUÇÃO (Área destacada estilo roteiro audiovisual)
    if (speechLines.length > 0) {
      doc.setFillColor(...COLOR.bubbleSpeechBg);
      doc.setDrawColor(...COLOR.bubbleSpeechBorder);
      doc.setLineWidth(0.5);
      doc.roundedRect(textX, innerY - 2, textColW, speechBoxH, 4, 4, "FD");

      doc.setFont(FONT_TITLE, "bold");
      doc.setFontSize(7);
      doc.setTextColor(...COLOR.brandDark);
      doc.text("FALA / DIÁLOGO / LOCUÇÃO", textX + 8, innerY + 9);

      doc.setFont(FONT_BODY, "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR.textDark);
      doc.text(speechLines, textX + 8, innerY + 22);

      innerY += speechBoxH + 8;
    }

    // 3. NOTAS DE PRODUÇÃO
    if (notesLines.length > 0) {
      doc.setFont(FONT_TITLE, "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR.brandDark);
      doc.text("NOTAS DE PRODUÇÃO (ÁUDIO / EFEITO / LETTERING)", textX, innerY);
      innerY += 10;

      doc.setFont(FONT_BODY, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLOR.textMedium);
      doc.text(notesLines, textX, innerY);
      innerY += notesLines.length * 11 + 6;
    }

    // 4. LINK DE REFERÊNCIA EXTERNA
    if (refUrlLines.length > 0) {
      doc.setFont(FONT_TITLE, "bold");
      doc.setFontSize(7);
      doc.setTextColor(...COLOR.textMuted);
      doc.text("LINK DE REFERÊNCIA:", textX, innerY);
      innerY += 9;

      doc.setFont(FONT_BODY, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(34, 102, 187);
      doc.text(refUrlLines, textX, innerY);
      innerY += refUrlLines.length * 10 + 4;
    }

    // Renderização da Foto de Referência na coluna direita
    if (hasImage && imageDataUrl) {
      const imgBoxX = marginX + contentW - imageColW - 12;
      const imgBoxY = cardY + cardHeaderH + 12;
      const imgBoxW = imageColW;
      const imgBoxH = totalCardH - cardHeaderH - 24;

      // Moldura da foto
      doc.setFillColor(...COLOR.white);
      doc.setDrawColor(...COLOR.border);
      doc.setLineWidth(0.5);
      doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 4, 4, "FD");

      // Label "Referência"
      doc.setFont(FONT_TITLE, "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...COLOR.textMuted);
      doc.text("FOTO DE REFERÊNCIA", imgBoxX + 6, imgBoxY + 10);

      // Imagem contida com proporção correta
      const padding = 6;
      const availW = imgBoxW - padding * 2;
      const availH = imgBoxH - 16 - padding;
      const fit = await fitContain(imageDataUrl, availW, availH);

      tryAddImage(
        doc,
        imageDataUrl,
        imgBoxX + padding + fit.ox,
        imgBoxY + 14 + fit.oy,
        fit.w,
        fit.h
      );
    }

    currentY += totalCardH + 14;
  }

  // Rodapé em todas as páginas com numeração
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Linha fina do rodapé
    doc.setDrawColor(...COLOR.borderSoft);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageH - 26, pageW - marginX, pageH - 26);

    // Texto do rodapé
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR.textMuted);
    doc.text("KASA HUB  ·  Sistema Operacional para Agências", marginX, pageH - 14);

    const pageStr = `Página ${p} de ${totalPages}`;
    doc.text(pageStr, pageW - marginX - doc.getTextWidth(pageStr), pageH - 14);
  }

  const slug = (s: string) => sanitize(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const parts = [
    slug(script.jobs?.title ?? ""),
    slug(script.clients?.name ?? ""),
    slug(script.title ?? "roteiro"),
    new Date().toISOString().slice(0, 10),
  ].filter(Boolean);

  doc.save(`${parts.join("-") || "roteiro"}.pdf`);
}
