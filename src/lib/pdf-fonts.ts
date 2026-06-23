import type jsPDF from "jspdf";

/**
 * Carrega Funnel Display + Onest (Google Fonts via jsdelivr) e registra
 * em uma instância jsPDF para uso como "Funnel" e "Onest".
 *
 * Sem rede / falha → não lança erro; o caller deve cair para Helvetica.
 */

const FUNNEL_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/funneldisplay/FunnelDisplay%5Bwght%5D.ttf";
const ONEST_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/onest/Onest%5Bwght%5D.ttf";

let funnelB64: string | null | undefined;
let onestB64: string | null | undefined;

async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    return btoa(bin);
  } catch {
    return null;
  }
}

export async function registerBoletimFonts(doc: jsPDF): Promise<{ funnel: boolean; onest: boolean }> {
  if (funnelB64 === undefined) funnelB64 = await fetchAsBase64(FUNNEL_URL);
  if (onestB64 === undefined) onestB64 = await fetchAsBase64(ONEST_URL);

  let funnelOk = false;
  let onestOk = false;

  if (funnelB64) {
    try {
      doc.addFileToVFS("FunnelDisplay.ttf", funnelB64);
      doc.addFont("FunnelDisplay.ttf", "Funnel", "normal");
      doc.addFont("FunnelDisplay.ttf", "Funnel", "bold");
      funnelOk = true;
    } catch {
      funnelOk = false;
    }
  }

  if (onestB64) {
    try {
      doc.addFileToVFS("Onest.ttf", onestB64);
      doc.addFont("Onest.ttf", "Onest", "normal");
      doc.addFont("Onest.ttf", "Onest", "bold");
      onestOk = true;
    } catch {
      onestOk = false;
    }
  }

  return { funnel: funnelOk, onest: onestOk };
}
