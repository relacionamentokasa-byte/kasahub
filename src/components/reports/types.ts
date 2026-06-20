export type SlideType =
  | "cover"
  | "section"
  | "text"
  | "image"
  | "gallery"
  | "kpis"
  | "deliverables"
  | "comparison"
  | "next-steps"
  | "closing";

export type KpiItem = { label: string; value: string; delta?: string };
export type DeliverableItem = { label: string; done: boolean };

export type SlideProps = {
  // common
  title?: string;
  subtitle?: string;
  kicker?: string;
  body?: string;
  period?: string;
  // image
  imageUrl?: string;
  caption?: string;
  // gallery
  images?: string[];
  // kpis
  items?: KpiItem[] | DeliverableItem[] | string[];
  // comparison
  leftTitle?: string;
  leftBody?: string;
  rightTitle?: string;
  rightBody?: string;
};

export type Slide = {
  id: string;
  type: SlideType;
  props: SlideProps;
};

export const BLOCK_LABELS: Record<SlideType, string> = {
  cover: "Capa",
  section: "Título de seção",
  text: "Texto livre",
  image: "Imagem destaque",
  gallery: "Galeria",
  kpis: "KPIs",
  deliverables: "Lista de entregas",
  comparison: "Comparativo (antes/depois)",
  "next-steps": "Próximos passos",
  closing: "Fechamento",
};

export function newSlide(type: SlideType): Slide {
  const id = crypto.randomUUID();
  switch (type) {
    case "cover":
      return { id, type, props: { kicker: "RELATÓRIO", title: "Novo relatório", subtitle: "Subtítulo opcional", period: "" } };
    case "section":
      return { id, type, props: { kicker: "01", title: "Nova seção" } };
    case "text":
      return { id, type, props: { title: "Título", body: "Escreva aqui o conteúdo." } };
    case "image":
      return { id, type, props: { title: "Imagem", imageUrl: "", caption: "" } };
    case "gallery":
      return { id, type, props: { title: "Galeria", images: [] } };
    case "kpis":
      return { id, type, props: { title: "Indicadores", items: [{ label: "Indicador", value: "0", delta: "" }] as KpiItem[] } };
    case "deliverables":
      return { id, type, props: { title: "Entregas", items: [{ label: "Entrega 1", done: true }] as DeliverableItem[] } };
    case "comparison":
      return { id, type, props: { title: "Comparativo", leftTitle: "Antes", leftBody: "- Item", rightTitle: "Depois", rightBody: "- Item" } };
    case "next-steps":
      return { id, type, props: { title: "Próximos passos", items: ["Ação 1"] } };
    case "closing":
      return { id, type, props: { title: "Obrigado.", subtitle: "" } };
  }
}
