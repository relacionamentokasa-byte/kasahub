export const JOB_TEMPLATES: Record<string, string[]> = {
  social_media: ["Planejamento", "Design", "Copy", "Aprovação", "Publicação"],
  branding: ["Briefing", "Pesquisa", "Conceito", "Aplicações", "Manual"],
  website: ["Briefing", "Wireframe", "Design", "Desenvolvimento", "Homologação", "Publicação"],
  ads: ["Planejamento", "Criativos", "Configuração", "Lançamento", "Otimização"],
  content: ["Pauta", "Roteiro", "Produção", "Edição", "Publicação"],
  video: ["Pré-produção", "Roteiro", "Gravação", "Edição", "Aprovação", "Entrega"],
};

export const JOB_TEMPLATE_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "Não gerar jobs" },
  { value: "social_media", label: "Gestão de Redes Sociais" },
  { value: "branding", label: "Branding / Identidade" },
  { value: "website", label: "Website / Landing" },
  { value: "ads", label: "Tráfego pago / Ads" },
  { value: "content", label: "Conteúdo" },
  { value: "video", label: "Vídeo" },
];
