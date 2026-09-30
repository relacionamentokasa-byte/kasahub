import React from "react";
import {
  Grid,
  Home,
  FolderKanban,
  FolderGit2,
  Calendar,
  Wallet,
  MessageSquare,
  Sparkles,
  CheckSquare,
  TrendingUp,
  Palette,
  Film,
  Rocket,
} from "lucide-react";
import { SocialIcon } from "@/components/editorial/SocialIcon";

export type PortalTab =
  | "feed"
  | "trafego"
  | "branding"
  | "videos"
  | "projetos"
  | "visao-geral"
  | "financeiro"
  | "conteudos"
  | "aprovacoes"
  | "arquivos"
  | "calendario"
  | "relatorios"
  | "suporte";

export type ContractedServiceKey =
  | "social_media"
  | "traffic_ads"
  | "branding"
  | "video_production"
  | "special_projects"
  | "financial";

interface KasaPortalTopNavProps {
  currentTab: PortalTab;
  onSelectTab: (tab: PortalTab) => void;
  pendingApprovalsCount?: number;
  client: {
    name: string;
    company?: string | null;
    logo_url?: string | null;
    brand_primary?: string | null;
    portal_primary_color?: string | null;
    contracted_services?: ContractedServiceKey[] | string[] | null;
  };
  teamMembers?: Array<{ name: string; avatar?: string | null }>;
  whatsappNumber?: string;
  onOpenSupport?: () => void;
}

const ALL_PRIMARY_TABS: Array<{
  id: PortalTab;
  serviceKey: ContractedServiceKey;
  label: string;
  badgeCount?: (pending: number) => number;
  icon: any;
  customIcon?: string;
}> = [
  {
    id: "feed",
    serviceKey: "social_media",
    label: "Feed Instagram",
    customIcon: "instagram",
    badgeCount: (p) => p,
    icon: Grid,
  },
  {
    id: "trafego",
    serviceKey: "traffic_ads",
    label: "Tráfego & Ads",
    icon: TrendingUp,
  },
  {
    id: "branding",
    serviceKey: "branding",
    label: "Branding & Arquivos",
    icon: Palette,
  },
  {
    id: "videos",
    serviceKey: "video_production",
    label: "Vídeos & Entregas",
    icon: Film,
  },
  {
    id: "projetos",
    serviceKey: "special_projects",
    label: "Projetos & Lançamentos",
    icon: FolderKanban,
  },
  {
    id: "financeiro",
    serviceKey: "financial",
    label: "Financeiro",
    icon: Wallet,
  },
];

export function KasaPortalTopNav({
  currentTab,
  onSelectTab,
  pendingApprovalsCount = 0,
  client,
  teamMembers = [
    { name: "Ariel Matos" },
    { name: "Isabela" },
    { name: "Arthur" },
  ],
  whatsappNumber = "5511999999999",
  onOpenSupport,
}: KasaPortalTopNavProps) {
  const displayName = client.company || client.name;
  const primaryColor =
    client.portal_primary_color?.trim() ||
    client.brand_primary?.trim() ||
    "#FFBC45";

  // Filtra as abas estritamente de acordo com os serviços contratados pelo cliente
  const activeServices = (client.contracted_services && client.contracted_services.length > 0)
    ? client.contracted_services
    : ["social_media", "traffic_ads", "branding", "video_production", "special_projects", "financial"];

  const visibleTabs = ALL_PRIMARY_TABS.filter((tab) =>
    activeServices.includes(tab.serviceKey)
  );

  const handleWhatsApp = () => {
    if (onOpenSupport) {
      onOpenSupport();
      return;
    }
    const cleanNum = whatsappNumber.replace(/\D/g, "");
    window.open(
      `https://wa.me/${cleanNum}?text=Ol%C3%A1%20time%20Kasa!`,
      "_blank"
    );
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. TOP BAR DESKTOP & TABLET (PADRÃO KASA HUB PRETO #121214)               */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full bg-[#121214]/95 backdrop-blur-xl border-b border-white/10 text-white select-none transition-all shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Esquerda: Logo Kasa + Badge do Cliente */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-display tracking-tight text-[#FFBC45]">
                kasa
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-[#71717A] border-l border-white/10 pl-2.5">
                Client Portal
              </span>
            </div>

            {/* Chip da Marca do Cliente */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18181B] border border-white/10">
              <div
                className="size-5 rounded-full flex items-center justify-center text-[10px] font-bold text-[#09090B] overflow-hidden"
                style={{ backgroundColor: primaryColor }}
              >
                {client.logo_url ? (
                  <img
                    src={client.logo_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-xs font-semibold text-[#F4F4F5] truncate max-w-[140px]">
                {displayName}
              </span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* Centro: Segmented Control de Abas (Estilo Apple / Framer) */}
          <nav className="hidden md:flex items-center p-1 rounded-2xl bg-[#18181B] border border-white/10 shadow-inner">
            {visibleTabs.map((tab) => {
              const active = currentTab === tab.id;
              const Icon = tab.icon;
              const badge = tab.badgeCount ? tab.badgeCount(pendingApprovalsCount) : 0;

              return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSelectTab(tab.id)}
                    style={
                      active
                        ? {
                            backgroundColor: primaryColor,
                            color: "#09090B",
                          }
                        : undefined
                    }
                    className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      active
                        ? "shadow-md scale-[1.02]"
                        : "text-[#A1A1AA] hover:text-white hover:bg-[#27272A]"
                    }`}
                  >
                    {tab.customIcon === "instagram" ? (
                      <SocialIcon network="instagram" size={15} />
                    ) : (
                      <Icon className="size-4" strokeWidth={active ? 2.5 : 2} />
                    )}
                    <span>{tab.label}</span>

                    {badge > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full flex items-center justify-center animate-pulse ${
                          active
                            ? "bg-[#09090B] text-white"
                            : "bg-[#EE9C87] text-white"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
              );
            })}
          </nav>

          {/* Direita: Time Kasa + CTA WhatsApp Suporte VIP */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Avatares do Time */}
            <div className="hidden xl:flex items-center -space-x-1.5">
              {teamMembers.slice(0, 3).map((m, i) => (
                <div
                  key={i}
                  title={`Time Kasa: ${m.name}`}
                  className="size-7 rounded-full bg-[#27272A] border-2 border-[#121214] flex items-center justify-center text-[10px] font-bold text-[#D4D4D8]"
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>

            {/* Botão Falar com o Time */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center gap-2 bg-[#FFBC45] hover:bg-[#F2AC35] text-[#09090B] font-bold text-xs py-2 px-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <MessageSquare className="size-3.5" strokeWidth={2.5} />
              <span className="hidden sm:inline">Time Kasa</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MOBILE BOTTOM BAR (NAVEGAÇÃO NATIVA INFERIOR PRETO #121214)              */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#121214]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
        {visibleTabs.slice(0, 5).map((tab) => {
          const active = currentTab === tab.id;
          const Icon = tab.icon;
          const badge = tab.badgeCount ? tab.badgeCount(pendingApprovalsCount) : 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              style={active ? { color: primaryColor } : undefined}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative ${
                active ? "font-bold" : "text-[#71717A] hover:text-[#E4E4E7]"
              }`}
            >
              <div className="relative">
                {tab.customIcon === "instagram" ? (
                  <SocialIcon network="instagram" size={20} />
                ) : (
                  <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                )}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 size-3.5 rounded-full bg-[#EE9C87] text-white text-[9px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5">
                {tab.id === "feed" ? "Feed" : tab.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
