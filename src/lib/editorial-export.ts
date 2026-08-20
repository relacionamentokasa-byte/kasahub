import type { EditorialPost } from "@/lib/editorial-api";

export async function exportEditorialPostsPDF(opts: {
  posts: EditorialPost[];
  clientName: string;
  periodLabel: string;
}) {
  const { exportEditorialPostsPDF: realExport } = await import("./editorial-export-real");
  return realExport(opts);
}
