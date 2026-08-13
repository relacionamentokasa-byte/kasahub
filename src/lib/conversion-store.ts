import { create } from 'zustand';

export interface ConversionData {
  title: string;
  briefing: string;
  dueDate: string;
  clientId: string;
  sourcePostId: string;
  coverUrl?: string;
}

interface ConversionStore {
  conversionData: ConversionData | null;
  setConversionData: (data: ConversionData | null) => void;
  clearConversionData: () => void;
}

export const useConversionStore = create<ConversionStore>((set) => ({
  conversionData: null,
  setConversionData: (data) => set({ conversionData: data }),
  clearConversionData: () => set({ conversionData: null }),
}));
