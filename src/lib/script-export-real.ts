import jsPDF from "jspdf";
import {
  type Script, type ScriptScene,
  SCRIPT_CONTENT_LABEL, SCRIPT_STATUS_LABEL,
} from "@/lib/scripts-api";
import { SOCIAL_LABEL } from "@/lib/editorial-api";
import { registerBoletimFonts } from "@/lib/pdf-fonts";
import { resolveStorageUrl } from "@/lib/use-storage-url";

/* =========================================================
 * Paleta KASA HUB — Design System Oficial
 *
 * Baseada no design system da aplicação (styles.css):
 * - Dark Petrol profundo (#0C1618) e Grafite Zinc (#18181B)
 * - Âmbar Dourado KASA (#FFBC45 / #F59E0B)
 * - Fundo de cartões neutro contrastado (#F9FAFB / #FFFFFF)
 * - Tipografia oficial: Funnel Display (títulos) e Onest (corpo)
 * ========================================================= */
const COLOR = {
  bgDark: [12, 22, 24] as [number, number, number],          // #0C1618 Dark Petrol
  bgZinc: [24, 24, 27] as [number, number, number],          // #18181B Surface Dark
  brand: [255, 188, 69] as [number, number, number],         // #FFBC45 Amarelo Kasa
  brandDark: [194, 120, 3] as [number, number, number],      // #C27803 Âmbar escuro legível
  brandSoft: [254, 243, 199] as [number, number, number],    // #FEF3C7 Amber 100 suave
  brandBorder: [251, 191, 36] as [number, number, number],   // #FBBF24 Amber 400
  cardBg: [255, 255, 255] as [number, number, number],       // #FFFFFF Card limpo
  cardHeaderBg: [244, 244, 245] as [number, number, number], // #F4F4F5 Zinc 100
  bubbleBg: [248, 250, 252] as [number, number, number],     // #F8FAFC
  bubbleSpeechBg: [255, 251, 235] as [number, number, number],// #FFFBEB Amber 50
  bubbleSpeechBorder: [253, 230, 138] as [number, number, number], // #FDE68A Amber 200
  textDark: [15, 23, 42] as [number, number, number],        // #0F172A Slate 900
  textMedium: [51, 65, 85] as [number, number, number],      // #334155 Slate 700
  textMuted: [100, 116, 139] as [number, number, number],    // #64748B Slate 500
  border: [226, 232, 240] as [number, number, number],       // #E2E8F0 Slate 200
  borderSoft: [241, 245, 249] as [number, number, number],   // #F1F5F9 Slate 100
  white: [255, 255, 255] as [number, number, number],
};

interface ImageMetadata {
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: "landscape" | "portrait" | "square";
}

async function imageToDataURL(url: string): Promise<ImageMetadata | null> {
  const signed = (await resolveStorageUrl(url)) ?? url;
  try {
    const res = await fetch(signed);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve("");
      r.readAsDataURL(blob);
    });

    if (!dataUrl) return null;

    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || img.width || 1, h: img.naturalHeight || img.height || 1 });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });

    const aspectRatio = dims.w / dims.h;
    const orientation = aspectRatio > 1.15 ? "landscape" : aspectRatio < 0.85 ? "portrait" : "square";

    return {
      dataUrl,
      width: dims.w,
      height: dims.h,
      aspectRatio,
      orientation,
    };
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
function fitContain(imgW: number, imgH: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = Math.max(1, imgW * scale);
  const h = Math.max(1, imgH * scale);
  return { w, h, ox: (boxW - w) / 2, oy: (boxH - h) / 2 };
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
  image: ImageMetadata | null;
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

  // Pré-carrega todas as imagens de referência com cálculo de dimensões e orientação
  const preloadedScenes: PreloadedScene[] = await Promise.all(
    sortedScenes.map(async (scene) => {
      let image: ImageMetadata | null = null;
      if (scene.reference_image_url) {
        image = await imageToDataURL(scene.reference_image_url);
      }
      return { scene, image };
    })
  );

  let currentY = 0;

  // Renderiza cabeçalho principal
  const drawMainHeader = () => {
    // Header Dark Petroleum Banner
    doc.setFillColor(...COLOR.bgDark);
    doc.rect(0, 0, pageW, 114, "F");

    // Faixa âmbar decorativa no topo
    doc.setFillColor(...COLOR.brand);
    doc.rect(0, 0, pageW, 3.5, "F");

    // Tag KASA HUB / Roteiro Operacional
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
    doc.text(titleLines.slice(0, 2), marginX, 52);

    // Metadados do Job e Cliente
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(203, 213, 225);
    const metaParts = [
      script.clients?.name ? `Cliente: ${sanitize(script.clients.name)}` : null,
      script.jobs?.title ? `Job: ${sanitize(script.jobs.title)}` : null,
    ].filter(Boolean);
    if (metaParts.length > 0) {
      doc.text(metaParts.join("   |   "), marginX, 88);
    }

    // Grid de Informações e Metadados Técnicos (Card Superior)
    const cardY = 124;
    const cardH = 64;
    doc.setFillColor(...COLOR.cardBg);
    doc.setDrawColor(...COLOR.border);
    doc.setLineWidth(0.75);
    doc.roundedRect(marginX, cardY, contentW, cardH, 6, 6, "FD");

    const totalDur = scenes.reduce((a, s) => a + (s.duration_sec ?? 0), 0);
    const estimatedDur = script.estimated_duration_sec ?? totalDur;
    const colW = contentW / 3;

    // Coluna 1: Formato & Canal
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

    // Coluna 3: Status & Data
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
    doc.text("KASA HUB  ·  ROTEIRO OPERACIONAL DE GRAVAÇÃO", marginX, 22);

    doc.setTextColor(...COLOR.white);
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(8.5);
    const shortTitle = sanitize(script.title || "Roteiro");
    doc.text(shortTitle, pageW - marginX - doc.getTextWidth(shortTitle), 22);

    currentY = 52;
  };

  drawMainHeader();

  // Se houver conceito geral / briefing do vídeo
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

  // Renderização de cada cena com adaptação inteligente de layout para fotos horizontais ou verticais
  for (let idx = 0; idx < preloadedScenes.length; idx++) {
    const { scene, image } = preloadedScenes[idx];
    const hasImage = Boolean(image);
    const isHorizontal = image?.orientation === "landscape";

    const cardHeaderH = 26;
    let totalCardH = 0;

    // Caso A: Foto HORIZONTAL (16:9 / widescreen) -> Renderiza abaixo do texto ocupando a largura total
    if (hasImage && isHorizontal && image) {
      const textColW = contentW - 24;

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

      let textH = 0;
      textH += 12 + visualLines.length * 11.5 + 6;

      let speechBoxH = 0;
      if (speechLines.length > 0) {
        speechBoxH = 18 + speechLines.length * 11.5 + 8;
        textH += speechBoxH + 6;
      }

      if (notesLines.length > 0) {
        textH += 12 + notesLines.length * 11 + 6;
      }

      if (refUrlLines.length > 0) {
        textH += 12 + refUrlLines.length * 10 + 4;
      }

      // Box horizontal para foto (max height 140pt)
      const photoBoxH = 135;
      totalCardH = cardHeaderH + textH + photoBoxH + 20;

      if (currentY + totalCardH > pageH - bottomMargin) {
        doc.addPage();
        drawSubsequentHeader();
      }

      const cardY = currentY;

      // Fundo do Card
      doc.setFillColor(...COLOR.cardBg);
      doc.setDrawColor(...COLOR.border);
      doc.setLineWidth(0.75);
      doc.roundedRect(marginX, cardY, contentW, totalCardH, 6, 6, "FD");

      // Header da Cena
      doc.setFillColor(...COLOR.cardHeaderBg);
      doc.roundedRect(marginX, cardY, contentW, cardHeaderH, 6, 6, "F");
      doc.rect(marginX, cardY + cardHeaderH - 4, contentW, 4, "F");

      doc.setDrawColor(...COLOR.borderSoft);
      doc.line(marginX, cardY + cardHeaderH, marginX + contentW, cardY + cardHeaderH);

      // Título da cena
      doc.setFont(FONT_TITLE, "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLOR.textDark);
      doc.text(`CENA ${scene.scene_number}`, marginX + 12, cardY + 17);

      // Badge de tempo
      const durStr = scene.duration_sec != null ? `${scene.duration_sec}s` : "tempo livre";
      doc.setFont(FONT_BODY, "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR.brandDark);
      const durBadgeW = doc.getTextWidth(`  ${durStr}  `) + 12;
      doc.setFillColor(...COLOR.brandSoft);
      doc.setDrawColor(...COLOR.brandBorder);
      doc.setLineWidth(0.5);
      doc.roundedRect(marginX + contentW - durBadgeW - 12, cardY + 6, durBadgeW, 15, 3, 3, "FD");
      doc.text(durStr, marginX + contentW - durBadgeW - 6, cardY + 17);

      // Conteúdo textual
      let innerY = cardY + cardHeaderH + 12;
      const textX = marginX + 12;

      // 1. Visual
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

      // 2. Fala
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

      // 3. Notas
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

      // 4. Link
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
        innerY += refUrlLines.length * 10 + 6;
      }

      // Foto Horizontal Banner
      const photoY = innerY;
      const photoBoxW = contentW - 24;
      doc.setFillColor(...COLOR.bubbleBg);
      doc.setDrawColor(...COLOR.border);
      doc.setLineWidth(0.5);
      doc.roundedRect(textX, photoY, photoBoxW, photoBoxH, 4, 4, "FD");

      doc.setFont(FONT_TITLE, "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...COLOR.textMuted);
      doc.text("FOTO DE REFERÊNCIA (HORIZONTAL)", textX + 6, photoY + 10);

      const padding = 6;
      const availW = photoBoxW - padding * 2;
      const availH = photoBoxH - 16 - padding;
      const fit = fitContain(image.width, image.height, availW, availH);

      tryAddImage(
        doc,
        image.dataUrl,
        textX + padding + fit.ox,
        photoY + 14 + fit.oy,
        fit.w,
        fit.h
      );

      currentY += totalCardH + 14;

    } else {
      // Caso B: Foto VERTICAL/QUADRADA ou SEM FOTO -> Layout em 2 colunas lado a lado
      const imageColW = hasImage ? 150 : 0;
      const gap = hasImage ? 14 : 0;
      const textColW = contentW - 24 - (hasImage ? (imageColW + gap) : 0);

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

      let textHeight = 0;
      textHeight += 12 + visualLines.length * 11.5 + 8;

      let speechBoxH = 0;
      if (speechLines.length > 0) {
        speechBoxH = 18 + speechLines.length * 11.5 + 8;
        textHeight += speechBoxH + 6;
      }

      if (notesLines.length > 0) {
        textHeight += 12 + notesLines.length * 11 + 6;
      }

      if (refUrlLines.length > 0) {
        textHeight += 12 + refUrlLines.length * 10 + 4;
      }

      const imageHeightReq = hasImage ? 175 : 0;
      const contentH = Math.max(textHeight, imageHeightReq);
      totalCardH = cardHeaderH + contentH + 16;

      if (currentY + totalCardH > pageH - bottomMargin) {
        doc.addPage();
        drawSubsequentHeader();
      }

      const cardY = currentY;

      // Fundo do Card
      doc.setFillColor(...COLOR.cardBg);
      doc.setDrawColor(...COLOR.border);
      doc.setLineWidth(0.75);
      doc.roundedRect(marginX, cardY, contentW, totalCardH, 6, 6, "FD");

      // Cabeçalho da cena
      doc.setFillColor(...COLOR.cardHeaderBg);
      doc.roundedRect(marginX, cardY, contentW, cardHeaderH, 6, 6, "F");
      doc.rect(marginX, cardY + cardHeaderH - 4, contentW, 4, "F");

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
      doc.setFillColor(...COLOR.brandSoft);
      doc.setDrawColor(...COLOR.brandBorder);
      doc.setLineWidth(0.5);
      doc.roundedRect(marginX + contentW - durBadgeW - 12, cardY + 6, durBadgeW, 15, 3, 3, "FD");
      doc.text(durStr, marginX + contentW - durBadgeW - 6, cardY + 17);

      // Renderização do texto
      let innerY = cardY + cardHeaderH + 12;
      const textX = marginX + 12;

      // 1. Ação / Visual
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

      // 2. Fala
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

      // 3. Notas
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

      // 4. Link
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

      // Foto Vertical / Quadrada na coluna lateral
      if (hasImage && image) {
        const imgBoxX = marginX + contentW - imageColW - 12;
        const imgBoxY = cardY + cardHeaderH + 12;
        const imgBoxW = imageColW;
        const imgBoxH = totalCardH - cardHeaderH - 24;

        doc.setFillColor(...COLOR.bubbleBg);
        doc.setDrawColor(...COLOR.border);
        doc.setLineWidth(0.5);
        doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 4, 4, "FD");

        doc.setFont(FONT_TITLE, "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...COLOR.textMuted);
        doc.text("FOTO DE REFERÊNCIA", imgBoxX + 6, imgBoxY + 10);

        const padding = 6;
        const availW = imgBoxW - padding * 2;
        const availH = imgBoxH - 16 - padding;
        const fit = fitContain(image.width, image.height, availW, availH);

        tryAddImage(
          doc,
          image.dataUrl,
          imgBoxX + padding + fit.ox,
          imgBoxY + 14 + fit.oy,
          fit.w,
          fit.h
        );
      }

      currentY += totalCardH + 14;
    }
  }

  // Rodapé em todas as páginas com numeração
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(...COLOR.borderSoft);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageH - 26, pageW - marginX, pageH - 26);

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
