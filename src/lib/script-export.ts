import type { Script, ScriptScene } from "@/lib/scripts-api";

export async function exportScriptPDF(opts: {
  script: Script & { clients?: { name: string } | null; jobs?: { title: string } | null };
  scenes: ScriptScene[];
}) {
  const { exportScriptPDF: real } = await import("./script-export-real");
  return real(opts);
}
