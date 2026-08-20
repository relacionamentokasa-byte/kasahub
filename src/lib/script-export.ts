import type { Script, ScriptScene } from "@/lib/scripts-api";

export async function exportScriptPDF(script: Script, scenes: ScriptScene[], clientName: string) {
  const { exportScriptPDF: realExport } = await import("./script-export-real");
  return realExport(script, scenes, clientName);
}
