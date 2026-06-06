export const JOB_TYPES = [
  { value: "post", label: "Post" },
  { value: "video", label: "Vídeo" },
  { value: "design", label: "Design" },
  { value: "landing_page", label: "Landing Page" },
  { value: "site", label: "Site" },
  { value: "fachada", label: "Fachada" },
  { value: "campanha", label: "Campanha" },
  { value: "publicacao", label: "Publicação" },
  { value: "desenvolvimento", label: "Desenvolvimento" },
];

export function getJobTypeLabel(value?: string | null) {
  return JOB_TYPES.find(t => t.value === value)?.label || "Tarefa Geral";
}
