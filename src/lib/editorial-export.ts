import type { EditorialPost } from "@/lib/editorial-api";

export async function exportEditorialPostsPDF(opts: {
  clientName: string;
  clientLogoUrl?: string | null;
  strategy?: string;
  cursor: Date;
  posts: EditorialPost[];
}) {
  const { exportEditorialPostsPDF: real } = await import("./editorial-export-real");
  return real(opts);
}

export async function exportEditorialPostsCSV(opts: {
  clientName: string;
  cursor: Date;
  posts: EditorialPost[];
}) {
  const { exportEditorialPostsCSV: real } = await import("./editorial-export-real");
  return real(opts);
}
