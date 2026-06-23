import type jsPDF from "jspdf";

/**
 * Carrega Funnel Display Bold + Onest (regular & bold) e registra na
 * instância jsPDF como famílias "Funnel" e "Onest".
 *
 * Estratégia: usa as TTFs estáticas hospedadas no gstatic (servidas
 * com CORS *). Em caso de falha, cai para a TTF variável do repo
 * google/fonts no jsdelivr.
 */

const SRC = {
  funnelBold: [
    "https://fonts.gstatic.com/s/funneldisplay/v3/B50bF7FGv37QNVWgE0ga--4PbZSRJXrOHcLHLoAYfWTnX890.ttf",
    "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/funneldisplay/FunnelDisplay%5Bwght%5D.ttf",
  ],
  onestReg: [
    "https://fonts.gstatic.com/s/onest/v9/gNMZW3F-SZuj7zOT0IfSjTS16cPh9R-ptRtI.ttf",
    "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/onest/Onest%5Bwght%5D.ttf",
  ],
  onestBold: [
    "https://fonts.gstatic.com/s/onest/v9/gNMZW3F-SZuj7zOT0IfSjTS16cPhEhiptRtI.ttf",
    "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/onest/Onest%5Bwght%5D.ttf",
  ],
};

const cache = new Map<string, string | null>();

async function fetchOneAsBase64(url: string): Promise<string | null> {
  if (cache.has(url)) return cache.get(url) ?? null;
  try {
    const res = await fetch(url);
    if (!res.ok) { cache.set(url, null); return null; }
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

async function fetchWithFallback(urls: string[]): Promise<string | null> {
  for (const u of urls) {
    const b = await fetchOneAsBase64(u);
    if (b) return b;
  }
  return null;
}

export async function registerBoletimFonts(
  doc: jsPDF,
): Promise<{ funnel: boolean; onest: boolean }> {
  const [funnelB, onestR, onestB] = await Promise.all([
    fetchWithFallback(SRC.funnelBold),
    fetchWithFallback(SRC.onestReg),
    fetchWithFallback(SRC.onestBold),
  ]);

  let funnelOk = false;
  let onestOk = false;

  if (funnelB) {
    try {
      doc.addFileToVFS("FunnelDisplay-Bold.ttf", funnelB);
      // Mesma TTF (700) usada tanto para normal quanto bold — títulos sempre encorpados
      doc.addFont("FunnelDisplay-Bold.ttf", "Funnel", "normal");
      doc.addFont("FunnelDisplay-Bold.ttf", "Funnel", "bold");
      funnelOk = true;
    } catch { funnelOk = false; }
  }

  if (onestR) {
    try {
      doc.addFileToVFS("Onest-Regular.ttf", onestR);
      doc.addFont("Onest-Regular.ttf", "Onest", "normal");
      if (onestB) {
        doc.addFileToVFS("Onest-Bold.ttf", onestB);
        doc.addFont("Onest-Bold.ttf", "Onest", "bold");
      } else {
        // Sem variante bold — usa regular para os dois pesos
        doc.addFont("Onest-Regular.ttf", "Onest", "bold");
      }
      onestOk = true;
    } catch { onestOk = false; }
  }

  return { funnel: funnelOk, onest: onestOk };
}
