import type { LaunchGridProduct, LaunchGridBoletim } from "@/lib/launch-grids-api";

export async function exportBoletimPdf(product: LaunchGridProduct, grid: LaunchGridBoletim) {
  const { exportBoletimPdf: realExport } = await import("./boletim-pdf-real");
  return realExport(product, grid);
}

export const CATEGORIA_OPTIONS = [
  "Perfumaria",
  "Higiene",
  "Cuidados da Pele",
  "Cuidados dos Cabelos",
  "Infantil",
  "Maquiagem",
] as const;
