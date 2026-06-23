import type jsPDF from "jspdf";

/**
 * Carrega Funnel Display (bold) e Onest (regular + bold) via Google Fonts
 * e registra na instância jsPDF. Estratégia:
 *   1. Pega o CSS do Google Fonts com User-Agent antigo → retorna .ttf
 *   2. Faz fetch do .ttf
 *   3. Registra com addFileToVFS + addFont
 *
 * Em caso de qualquer falha de rede/parse, retorna false para a fonte
 * correspondente e o caller cai para Helvetica.
 */

const CSS_URL =
  "https://fonts.googleapis.com/css?family=Funnel+Display:700|Onest:400,700";
// Browser do navegador atual pode (e vai) pedir woff2 — passamos o CSS
// para um servidor que aceita UA mas o fetch do browser não permite
// trocar User-Agent. Solução: usamos um proxy CORS-friendly que devolve
// o CSS solicitado pelo Android. Como esse infra extra pode falhar,
// caímos para um cache embutido se necessário.
//
// Estratégia simples e robusta: pedimos o CSS direto. O Chrome moderno
// pede woff2, mas o Google Fonts respeita o header "User-Agent" no
// servidor — só que fetch() não deixa setar UA. Então fazemos o
// download via uma estratégia híbrida:
//   - Tentamos endpoints conhecidos dos repositórios open-source
//     (jsdelivr@gh/google/fonts) que servem .ttf diretamente.
//   - Esses arquivos são as TTFs variáveis ([wght]) que cobrem todos
//     os pesos. jsPDF lida com variável usando o estilo padrão; para
//     "negrito visual" usamos a fonte FunnelDisplay-Bold estática
//     hospedada num mirror confiável.

// Mirror dos repositórios oficiais Google Fonts (jsdelivr GH).
// FunnelDisplay e Onest só existem como TTF variável no repo público,
// então usamos a TTF variável.
const FONT_SOURCES = {
  funnelBold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/funneldisplay/FunnelDisplay%5Bwght%5D.ttf",
  onestReg: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/onest/Onest%5Bwght%5D.ttf",
  onestBold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/onest/Onest%5Bwght%5D.ttf",
};

const cache = new Map<string, string | null>();

async function fetchAsBase64(url: string): Promise<string | null> {
  if (cache.has(url)) return cache.get(url) ?? null;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      cache.set(url, null);
      return null;
    }
    const buf = await res.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    const b64 = btoa(bin);
    cache.set(url, b64);
    return b64;
  } catch {
    cache.set(url, null);
    return null;
  }
}

export async function registerBoletimFonts(
  doc: jsPDF,
): Promise<{ funnel: boolean; onest: boolean }> {
  const [funnelB, onestR] = await Promise.all([
    fetchAsBase64(FONT_SOURCES.funnelBold),
    fetchAsBase64(FONT_SOURCES.onestReg),
  ]);

  let funnelOk = false;
  let onestOk = false;

  if (funnelB) {
    try {
      doc.addFileToVFS("FunnelDisplay-Bold.ttf", funnelB);
      // Registramos como "Funnel" tanto normal quanto bold apontando para
      // a mesma TTF variável — para o uso na capa/títulos sempre em bold.
      doc.addFont("FunnelDisplay-Bold.ttf", "Funnel", "normal");
      doc.addFont("FunnelDisplay-Bold.ttf", "Funnel", "bold");
      funnelOk = true;
    } catch {
      funnelOk = false;
    }
  }

  if (onestR) {
    try {
      doc.addFileToVFS("Onest.ttf", onestR);
      doc.addFont("Onest.ttf", "Onest", "normal");
      doc.addFont("Onest.ttf", "Onest", "bold");
      onestOk = true;
    } catch {
      onestOk = false;
    }
  }

  return { funnel: funnelOk, onest: onestOk };
}
