/**
 * Glossário do portal do cliente.
 * Traduz jargão interno da agência para linguagem amigável ao cliente.
 * NÃO altera nomes de tabelas/campos — apenas a apresentação.
 */
export const PORTAL_LABELS = {
  // Entidades
  job: "Demanda",
  jobs: "Demandas",
  project: "Projeto",
  projects: "Projetos",
  stage: "Etapa",
  stages: "Etapas",
  status: "Situação",
  approval: "Aprovação",
  approvals: "Aprovações",
  dme: "Solicitação de Pagamento",
  dmes: "Solicitações de Pagamento",
  briefing: "Resumo do pedido",
  launch_grid: "Lançamento",
  proposal: "Proposta",

  // Ações
  approve: "Aprovar",
  reject: "Pedir ajuste",
  comment: "Comentar",
  download: "Baixar",

  // Status
  not_started: "Aguardando início",
  in_progress: "Em produção",
  review: "Aguardando você",
  done: "Concluído",
  paused: "Aguardando retorno",

  // Cabeçalhos
  my_projects: "Meus Projetos",
  account_manager: "Sua conta",
  pending_for_you: "Aguardando você",
  recent_updates: "Atualizações recentes",
} as const;

export type PortalLabelKey = keyof typeof PORTAL_LABELS;

/**
 * Retorna o label amigável do glossário, com fallback ao termo original.
 */
export function pt(key: string): string {
  return (PORTAL_LABELS as Record<string, string>)[key] ?? key;
}
