import React, { useState } from "react";
import {
  Home,
  FolderKanban,
  FileText,
  CheckSquare,
  FolderGit2,
  Calendar,
  TrendingUp,
  Wallet,
  Headset,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export type PortalTab =
  | "visao-geral"
  | "projetos"
  | "conteudos"
  | "aprovacoes"
  | "arquivos"
  | "calendario"
  | "relatorios"
  | "financeiro"
  | "suporte";

interface PortalSidebarProps {
  currentTab: PortalTab;
  onSelectTab: (tab: PortalTab) => void;
  pendingApprovalsCount?: number;
  teamMembers?: Array<{ name: string; avatar?: string | null }>;
  whatsappNumber?: string;
  onOpenSupport?: () => void;
}

const MENU_ITEMS = [
  { id: "visao-geral" as PortalTab, label: "Visão geral", icon: Home },
  { id: "projetos" as PortalTab, label: "Projetos", icon: FolderKanban },
  { id: "conteudos" as PortalTab, label: "Conteúdos", icon: FileText },
  { id: "aprovacoes" as PortalTab, label: "Aprovações", icon: CheckSquare, hasBadge: true },
  { id: "arquivos" as PortalTab, label: "Arquivos", icon: FolderGit2 },
  { id: "calendario" as PortalTab, label: "Calendário", icon: Calendar },
  { id: "relatorios" as PortalTab, label: "Relatórios", icon: TrendingUp },
  { id: "financeiro" as PortalTab, label: "Financeiro", icon: Wallet },
  { id: "suporte" as PortalTab, label: "Suporte", icon: Headset },
];

export function KasaPortalSidebar({
  currentTab,
  onSelectTab,
  pendingApprovalsCount = 0,
  teamMembers = [
    { name: "Ariel Matos" },
    { name: "Isabela" },
    { name: "Arthur" },
    { name: "Amanda" },
  ],
  whatsappNumber = "5511999999999",
  onOpenSupport,
}: PortalSidebarProps) {
  const openWhatsApp = () => {
    if (onOpenSupport) {
      onOpenSupport();
      return;
    }
    const cleanNum = whatsappNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanNum}?text=Ol%C3%A1%20time%20Kasa!`, "_blank");
  };

  return (
    <aside className="w-[260px] shrink-0 bg-[#0C1618] text-[#F3F4F6] min-h-screen flex flex-col justify-between p-4 border-r border-[#1B2729] select-none font-sans">
      {/* Topo / Brand */}
      <div>
        <div className="px-3 pt-3 pb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black font-display tracking-tight text-[#FFBC45]">
              kasa
            </span>
          </div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[#9CA3AF] -mt-1">
            marketing & consultoria
          </p>
          <p className="text-[13px] text-[#D1D5DB] font-medium mt-3 italic">
            Antes da meta, humanidade.
          </p>
        </div>

        {/* Itens de Navegação */}
        <nav className="space-y-1">
          {MENU_ITEMS.map((item) => {
            const active = currentTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-[#FFBC45] text-[#0C1618] shadow-md font-bold"
                    : "text-[#D1D5DB] hover:text-white hover:bg-[#152326]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`size-4.5 ${
                      active ? "text-[#0C1618]" : "text-[#9CA3AF]"
                    }`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span>{item.label}</span>
                </div>

                {item.hasBadge && pendingApprovalsCount > 0 && (
                  <span
                    className={`text-[11px] font-bold size-5 rounded-full flex items-center justify-center ${
                      active
                        ? "bg-[#0C1618] text-[#FFBC45]"
                        : "bg-[#EE9C87] text-white"
                    }`}
                  >
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bloco Inferior: Time Kasa + CTA */}
      <div className="pt-6 border-t border-[#1C2A2D] space-y-4">
        <div>
          <p className="text-[11px] font-bold text-[#9CA3AF] mb-2 px-1">
            Seu time Kasa
          </p>
          <div className="flex items-center gap-1.5 px-1">
            {teamMembers.slice(0, 4).map((member, i) => (
              <div
                key={i}
                title={member.name}
                className="size-7 rounded-full bg-[#1C2A2D] border border-[#2D3E42] flex items-center justify-center text-[11px] font-bold text-[#D1D5DB]"
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#869296] leading-relaxed mt-2.5 px-1">
            Estratégia, conteúdo e resultados caminham melhor juntos.
          </p>
        </div>

        <button
          type="button"
          onClick={openWhatsApp}
          className="w-full flex items-center justify-center gap-2 bg-[#FFBC45] hover:bg-[#F2AC35] text-[#0C1618] font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
        >
          <MessageSquare className="size-4" strokeWidth={2.5} />
          <span>Falar com a Kasa</span>
        </button>
      </div>
    </aside>
  );
}
