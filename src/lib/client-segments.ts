// Lista controlada de segmentos de mercado para clientes.
// Mantenha em ordem alfabética; "Outros" sempre por último.
export const CLIENT_SEGMENTS = [
  "Alimentação & Restaurantes",
  "Automotivo",
  "Beleza & Estética",
  "Construção & Arquitetura",
  "Direito",
  "E-commerce & Varejo",
  "Educação",
  "Fitness & Bem-estar",
  "Imobiliário",
  "Indústria",
  "ONG & Terceiro Setor",
  "Saúde",
  "Serviços B2B",
  "Tecnologia",
  "Turismo & Hotelaria",
  "Outros",
] as const;

export type ClientSegment = (typeof CLIENT_SEGMENTS)[number];
