export type CallSheetBlockType =
  | "prep"        // Preparação / Setup / Montagem
  | "shooting"    // Gravação / Cena
  | "break"       // Logística / Refeição (Almoço, Café)
  | "wrap"        // Desmontagem / Encerramento
  | "transit";    // Deslocamento / Transporte

export interface CallSheetCrewMember {
  id: string;
  profile_id?: string | null;
  name: string;
  role: string;
  call_time: string;
  phone?: string;
  notes?: string;
  confirmed?: boolean;
}

export interface CallSheetTimelineItem {
  id: string;
  time_start: string;
  time_end?: string;
  type: CallSheetBlockType;
  title: string;
  description?: string;
  scene_id?: string | null;
  scene_number?: number | null;
  location_detail?: string;
}

export interface CallSheetGearItem {
  id: string;
  category: "camera" | "audio" | "lighting" | "grip" | "props" | "other";
  name: string;
  checked: boolean;
  responsible?: string;
}

export interface CallSheetData {
  version: 1;
  shoot_date?: string;          // YYYY-MM-DD
  general_call_time?: string;   // ex: "08:00"
  on_set_call_time?: string;    // ex: "08:30"
  estimated_wrap?: string;      // ex: "18:00"

  // Locação
  location_name?: string;
  location_address?: string;
  location_parking_info?: string;
  location_access_notes?: string;
  contact_on_site?: {
    name: string;
    phone: string;
  };

  // Seções
  crew: CallSheetCrewMember[];
  timeline: CallSheetTimelineItem[];
  gear_checklist: CallSheetGearItem[];
  general_notes?: string;
}

export const CALL_SHEET_BLOCK_LABELS: Record<CallSheetBlockType, { label: string; color: string; bg: string; border: string }> = {
  prep: {
    label: "Preparação & Setup",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  shooting: {
    label: "Gravação / Cena",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  break: {
    label: "Refeição / Pausa",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  transit: {
    label: "Deslocamento",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
  },
  wrap: {
    label: "Desmontagem / Wrap",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
};

export const GEAR_CATEGORY_LABELS: Record<CallSheetGearItem["category"], string> = {
  camera: "Câmeras & Lentes",
  audio: "Áudio & Microfones",
  lighting: "Iluminação & Led",
  grip: "Suportes & Tripés / Estabilizadores",
  props: "Figurino, Objetos & Cenário",
  other: "Baterias, Cartões & Outros",
};

export function createEmptyCallSheet(): CallSheetData {
  return {
    version: 1,
    shoot_date: "",
    general_call_time: "08:00",
    on_set_call_time: "08:30",
    estimated_wrap: "18:00",
    location_name: "",
    location_address: "",
    location_parking_info: "",
    location_access_notes: "",
    contact_on_site: {
      name: "",
      phone: "",
    },
    crew: [],
    timeline: [
      {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        time_start: "08:00",
        time_end: "08:30",
        type: "prep",
        title: "Chegada da equipe & Café",
        description: "Recepção, café e alinhamento inicial do set",
      },
      {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        time_start: "08:30",
        time_end: "09:30",
        type: "prep",
        title: "Montagem de Câmera e Luz",
        description: "Montagem de tripés, testes de luz e enquadramento",
      },
      {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        time_start: "09:30",
        time_end: "12:30",
        type: "shooting",
        title: "Gravação - Bloco 1",
        description: "Captação das primeiras tomadas",
      },
      {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        time_start: "12:30",
        time_end: "13:30",
        type: "break",
        title: "Pausa para Almoço",
        description: "Alimentação e recarga de baterias",
      },
      {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        time_start: "13:30",
        time_end: "17:00",
        type: "shooting",
        title: "Gravação - Bloco 2",
        description: "Captação de entrevistas e B-rolls",
      },
      {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        time_start: "17:00",
        time_end: "18:00",
        type: "wrap",
        title: "Desmontagem, Backup & Wrap",
        description: "Desmontagem de equipamentos e conferência de cartões",
      },
    ],
    gear_checklist: [
      { id: "g1", category: "camera", name: "Câmera Principal + Baterias extras", checked: false },
      { id: "g2", category: "camera", name: "Lentes e Cartões SD formatados", checked: false },
      { id: "g3", category: "audio", name: "Lapelas sem fio + Baterias/Pilhas", checked: false },
      { id: "g4", category: "lighting", name: "Kit de Luz LED + Tripés", checked: false },
      { id: "g5", category: "other", name: "Extensões e réguas de energia", checked: false },
    ],
    general_notes: "",
  };
}
