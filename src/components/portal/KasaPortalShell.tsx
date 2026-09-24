import React, { useState } from "react";
import { KasaPortalSidebar, type PortalTab } from "./KasaPortalSidebar";
import { KasaClientDashboard } from "./KasaClientDashboard";
import { KasaApprovalsView } from "./KasaApprovalsView";
import { KasaProjectsView } from "./KasaProjectsView";
import { KasaFilesView } from "./KasaFilesView";
import { KasaCalendarView } from "./KasaCalendarView";
import { KasaFinancialView } from "./KasaFinancialView";
import { KasaContentsView } from "./KasaContentsView";
import { KasaReportsView } from "./KasaReportsView";
import { KasaSupportView } from "./KasaSupportView";
import { Bell, User, ChevronDown, ExternalLink } from "lucide-react";

interface KasaPortalLayoutProps {
  client: {
    id: string;
    name: string;
    company?: string | null;
    logo_url?: string | null;
    brand_primary?: string | null;
    portal_primary_color?: string | null;
    portal_cover_url?: string | null;
    portal_cover_color?: string | null;
    created_at?: string | null;
  };
  jobs?: any[];
  approvalItems?: any[];
  invoices?: any[];
  proposals?: any[];
  currentContract?: any;
  events?: any[];
  children?: React.ReactNode;
  initialTab?: PortalTab;
  onTabChange?: (tab: PortalTab) => void;
  teamMembers?: Array<{ name: string; avatar?: string | null }>;
}

export function KasaPortalShell({
  client,
  jobs = [],
  approvalItems = [],
  invoices = [],
  proposals = [],
  currentContract,
  events = [],
  initialTab = "visao-geral",
  onTabChange,
  teamMembers,
}: KasaPortalLayoutProps) {
  const [currentTab, setCurrentTab] = useState<PortalTab>(initialTab);
  const [approvalsState, setApprovalsState] = useState(approvalItems);
  const displayName = client.company || client.name;

  // Paleta dinâmica baseada na identidade da marca do cliente
  const primaryColor =
    client.portal_primary_color?.trim() ||
    client.brand_primary?.trim() ||
    "#FFBC45";
  const coverColor = client.portal_cover_color?.trim() || "#0C1618";

  const themeVars = {
    "--client-primary": primaryColor,
    "--client-cover": coverColor,
  } as React.CSSProperties;

  const handleSelectTab = (tab: PortalTab) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  const handleApprove = (itemId: string) => {
    setApprovalsState((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: "approved" } : item
      )
    );
  };

  const handleRequestChange = (itemId: string, feedback: string) => {
    setApprovalsState((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, status: "rejected", feedback }
          : item
      )
    );
  };

  const pendingApprovalsCount = approvalsState.filter(
    (item) => item.status === "pending"
  ).length;

  // Encontrar o projeto principal ativo
  const activeJob = jobs.find((j) => j.status === "in_progress") || jobs[0];
  const featuredProject = activeJob
    ? {
        title: activeJob.title,
        progress: activeJob.progress_percentage || 60,
        nextMilestoneDate: activeJob.due_date
          ? new Date(activeJob.due_date).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "Em andamento",
        nextMilestoneLocation: "Kasa Hub · Produção",
      }
    : undefined;

  // Próxima reunião baseada nos eventos reais
  const nextEvent = events.length > 0 ? events[0] : null;
  const nextMeeting = nextEvent
    ? {
        date: new Date(nextEvent.starts_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: new Date(nextEvent.starts_at).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        topic: nextEvent.title,
        clientName: displayName,
      }
    : undefined;

  return (
    <div
      style={themeVars}
      className="flex min-h-screen bg-[#FAF8F5] text-[#0C1618] font-sans antialiased selection:bg-[var(--client-primary)] selection:text-[#0C1618]"
    >
      {/* 1. Menu Lateral Fixo Dark Petroleum */}
      <KasaPortalSidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        pendingApprovalsCount={pendingApprovalsCount}
        teamMembers={teamMembers}
      />

      {/* 2. Área de Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topo Executivo com identidade do cliente */}
        <header className="h-16 border-b border-[#E9E4DC] bg-[#FAF8F5]/80 backdrop-blur-md px-6 lg:px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-kasa font-bold uppercase tracking-wider text-[#6A787B]">
              Portal do Cliente
            </span>
            <span className="text-gray-300">/</span>
            <span className="text-xs font-bold text-[#0C1618] capitalize">
              {currentTab.replace("-", " ")}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notificações */}
            <button
              type="button"
              className="relative size-9 rounded-xl border border-[#E9E4DC] bg-white flex items-center justify-center text-[#6A787B] hover:text-[#0C1618] hover:border-[#D1C9BC] transition"
              title="Notificações"
            >
              <Bell className="size-4.5" />
              {pendingApprovalsCount > 0 && (
                <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-[#EE9C87] ring-2 ring-[#FAF8F5]" />
              )}
            </button>

            {/* Perfil & Marca do Cliente */}
            <div className="flex items-center gap-3 pl-2 border-l border-[#E9E4DC]">
              <div
                className="size-9 rounded-full text-white font-bold text-xs flex items-center justify-center overflow-hidden border border-[#E9E4DC] shadow-sm"
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
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-[#0C1618] leading-tight truncate max-w-[180px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-[#6A787B] font-medium">
                  Conta Ativa
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo Dinâmico por Aba */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          {currentTab === "visao-geral" && (
            <KasaClientDashboard
              client={client}
              featuredProject={featuredProject}
              pendingApprovalsCount={pendingApprovalsCount}
              nextMeeting={nextMeeting}
              onNavigateTab={(tab) => handleSelectTab(tab as PortalTab)}
            />
          )}

          {currentTab === "aprovacoes" && (
            <KasaApprovalsView
              items={approvalsState as any}
              onApprove={handleApprove}
              onRequestChange={handleRequestChange}
            />
          )}

          {currentTab === "projetos" && (
            <KasaProjectsView
              jobs={jobs as any}
              clientBrandColor={primaryColor}
            />
          )}

          {currentTab === "conteudos" && (
            <KasaContentsView
              clientBrandColor={primaryColor}
              clientName={displayName}
              onNavigateApproval={(id) => handleSelectTab("aprovacoes")}
            />
          )}

          {currentTab === "arquivos" && (
            <KasaFilesView
              clientBrandColor={primaryColor}
            />
          )}

          {currentTab === "calendario" && (
            <KasaCalendarView
              events={events as any}
              clientBrandColor={primaryColor}
              clientName={displayName}
            />
          )}

          {currentTab === "relatorios" && (
            <KasaReportsView
              clientBrandColor={primaryColor}
              clientName={displayName}
            />
          )}

          {currentTab === "financeiro" && (
            <KasaFinancialView
              invoices={invoices as any}
              contract={currentContract}
              clientBrandColor={primaryColor}
              clientName={displayName}
            />
          )}

          {currentTab === "suporte" && (
            <KasaSupportView
              clientName={displayName}
              clientBrandColor={primaryColor}
            />
          )}
        </main>
      </div>
    </div>
  );
}
