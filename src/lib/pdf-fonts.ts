import type jsPDF from "jspdf";

export async function registerBoletimFonts(doc: jsPDF) {
  const { registerBoletimFonts: realRegister } = await import("./pdf-fonts-real");
  return realRegister(doc);
}
