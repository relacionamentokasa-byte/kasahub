export async function generateSingleDmePdf(dmeId: string): Promise<void> {
  const { generateSingleDmePdf: real } = await import("./dme-batch-pdf-real");
  return real(dmeId);
}

export async function generateDmeBatchPdf(batch: any, dmes: any[], agency: any) {
  const { generateDmeBatchPdf: real } = await import("./dme-batch-pdf-real");
  return real(batch, dmes, agency);
}

export async function generateConsolidatedTxPdf(consolidatedTransactionId: string): Promise<void> {
  const { generateConsolidatedTxPdf: real } = await import("./dme-batch-pdf-real");
  return real(consolidatedTransactionId);
}
