import type jsPDF from "jspdf";

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
  for (const url of urls) {
    const b64 = await fetchOneAsBase64(url);
    if (b64) return b64;
  }
  return null;
}

export async function registerBoletimFonts(doc: jsPDF) {
  const [fBold, oReg, oBold] = await Promise.all([
    fetchWithFallback(SRC.funnelBold),
    fetchWithFallback(SRC.onestReg),
    fetchWithFallback(SRC.onestBold),
  ]);

  const res = { funnel: false, onest: false };

  if (fBold) {
    try {
      doc.addFileToVFS("Funnel-Bold.ttf", fBold);
      doc.addFont("Funnel-Bold.ttf", "Funnel", "bold");
      res.funnel = true;
    } catch (e) { console.error("PDF: falha Funnel", e); }
  }

  if (oReg && oBold) {
    try {
      doc.addFileToVFS("Onest-Regular.ttf", oReg);
      doc.addFont("Onest-Regular.ttf", "Onest", "normal");
      doc.addFileToVFS("Onest-Bold.ttf", oBold);
      doc.addFont("Onest-Bold.ttf", "Onest", "bold");
      res.onest = true;
    } catch (e) { console.error("PDF: falha Onest", e); }
  }

  return res;
}
