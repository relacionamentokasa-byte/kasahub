import type { CallSheetData } from "@/types/call-sheet";

export function formatCallSheetForWhatsApp(jobTitle: string, data: CallSheetData): string {
  const lines: string[] = [];

  lines.push(`🎬 *ORDEM DO DIA / CALL SHEET*`);
  lines.push(`*Job:* ${jobTitle || "Gravação"}`);
  if (data.shoot_date) {
    const [y, m, d] = data.shoot_date.split("-");
    lines.push(`📅 *Data:* ${d}/${m}/${y}`);
  }
  lines.push(
    `⏰ *Chamada Geral:* ${data.general_call_time || "--:--"} | *Início Set:* ${data.on_set_call_time || "--:--"} | *Wrap Previsto:* ${data.estimated_wrap || "--:--"}`
  );
  lines.push("");

  // Locação
  lines.push(`📍 *LOCAL DA GRAVAÇÃO:*`);
  if (data.location_name) lines.push(`*Local:* ${data.location_name}`);
  if (data.location_address) {
    lines.push(`*Endereço:* ${data.location_address}`);
    const encoded = encodeURIComponent(data.location_address);
    lines.push(`🗺️ *Google Maps:* https://www.google.com/maps/search/?api=1&query=${encoded}`);
    lines.push(`🚗 *Waze:* https://waze.com/ul?q=${encoded}&navigate=yes`);
  }
  if (data.location_parking_info) lines.push(`🅿️ *Estacionamento:* ${data.location_parking_info}`);
  if (data.location_access_notes) lines.push(`ℹ️ *Acesso/Portaria:* ${data.location_access_notes}`);
  if (data.contact_on_site?.name) {
    lines.push(
      `📞 *Contato no Local:* ${data.contact_on_site.name}${data.contact_on_site.phone ? ` (${data.contact_on_site.phone})` : ""}`
    );
  }
  lines.push("");

  // Equipe e Convocados
  if (data.crew && data.crew.length > 0) {
    lines.push(`👥 *EQUIPE & CONVOCADOS:*`);
    data.crew.forEach((c) => {
      const time = c.call_time ? `[${c.call_time}]` : "";
      const phone = c.phone ? ` - ${c.phone}` : "";
      lines.push(`• ${time} *${c.name}* (${c.role || "Equipe"})${phone}`);
      if (c.notes) lines.push(`  ↳ _Obs: ${c.notes}_`);
    });
    lines.push("");
  }

  // Linha do tempo / Cronograma
  if (data.timeline && data.timeline.length > 0) {
    lines.push(`⏱️ *CRONOGRAMA DO DIA:*`);
    data.timeline.forEach((item) => {
      const timeRange = item.time_end ? `${item.time_start} às ${item.time_end}` : item.time_start;
      const sceneRef = item.scene_number ? ` [Cena ${item.scene_number}]` : "";
      lines.push(`• *${timeRange}* - ${item.title}${sceneRef}`);
      if (item.description) {
        lines.push(`  ↳ _${item.description}_`);
      }
    });
    lines.push("");
  }

  // Observações Gerais
  if (data.general_notes) {
    lines.push(`⚠️ *ORIENTAÇÕES GERAIS:*`);
    lines.push(data.general_notes);
    lines.push("");
  }

  lines.push(`_Gerado pelo Kasa Hub_ ✨`);

  return lines.join("\n");
}
