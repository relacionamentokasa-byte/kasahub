export type DmeBatchPdfMode = "approval" | "approved" | "all";

export async function generateSingleDmePdf(dmeId: string): Promise<void> {
  const { generateSingleDmePdf: real } = await import("./dme-batch-pdf-real");
  return real(dmeId);
}

export async function generateDmeBatchPdf(batchId: string, mode: DmeBatchPdfMode = "all") {
  const { generateDmeBatchPdf: real } = await import("./dme-batch-pdf-real");
  return real(batchId, mode);
}

export async function generateConsolidatedTxPdf(consolidatedTransactionId: string): Promise<void> {
  const { generateConsolidatedTxPdf: real } = await import("./dme-batch-pdf-real");
  return real(consolidatedTransactionId);
}
