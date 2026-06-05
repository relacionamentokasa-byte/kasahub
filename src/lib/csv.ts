export function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return "";
  const keys = headers ?? Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const head = keys.join(";");
  const body = rows.map((r) => keys.map((k) => esc(r[k])).join(";")).join("\n");
  return `\uFEFF${head}\n${body}`;
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
