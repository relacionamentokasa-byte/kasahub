import type { LaunchGridProduct, LaunchGridBoletim } from "@/lib/launch-grids-api";

export async function exportBoletimPdf(
  product: Pick<LaunchGridProduct, "name" | "image_url" | "due_date" | "links" | "skus" | "notes" | "description"> & {
    boletim: LaunchGridBoletim;
    statusLabel?: string;
    clientName?: string;
  }
) {
  const { exportBoletimPdf: realExport } = await import("./boletim-pdf-real");
  return realExport(product);
}

export const CATEGORIA_OPTIONS = [
  "Perfumaria",
  "Higiene",
  "Cuidados da Pele",
  "Cuidados dos Cabelos",
  "Infantil",
  "Maquiagem",
] as const;
