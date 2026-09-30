import React, { useState } from "react";
import { KasaPortalTopNav, type PortalTab } from "./KasaPortalTopNav";
import { KasaInstagramFeed } from "./KasaInstagramFeed";
import { KasaClientDashboard } from "./KasaClientDashboard";
import { KasaApprovalsView } from "./KasaApprovalsView";
import { KasaProjectsView } from "./KasaProjectsView";
import { KasaFilesView } from "./KasaFilesView";
import { KasaBrandFilesView } from "./KasaBrandFilesView";
import { KasaTrafficAdsView } from "./KasaTrafficAdsView";
import { KasaVideoDeliverablesView } from "./KasaVideoDeliverablesView";
import { KasaCalendarView } from "./KasaCalendarView";
import { KasaFinancialView } from "./KasaFinancialView";
import { KasaContentsView } from "./KasaContentsView";
import { KasaReportsView } from "./KasaReportsView";
import { KasaSupportView } from "./KasaSupportView";
import { toast } from "sonner";

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
    portal_slug?: string | null;
    created_at?: string | null;
  };
  slug?: string;
  jobs?: any[];
  approvalItems?: any[];
  editorialPosts?: any[];
  approvalComments?: Record<string, any[]>;
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
  slug,
  jobs = [],
  approvalItems = [],
  editorialPosts = [],
  approvalComments = {},
  invoices = [],
  proposals = [],
  currentContract,
  events = [],
  initialTab = "feed",
  onTabChange,
  teamMembers,
}: KasaPortalLayoutProps) {
  const [currentTab, setCurrentTab] = useState<PortalTab>(initialTab);
  const [approvalsState, setApprovalsState] = useState(approvalItems);
  const displayName = client.company || client.name;

  // Paleta dinâmica sincronizada com a marca do cliente
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

  // Aprovação em Lote ("Aprovar Mês Inteiro com 1 Clique")
  const handleApproveAll = () => {
    setApprovalsState((prev) =>
      prev.map((item) => ({ ...item, status: "approved" }))
    );
  };

  const pendingApprovalsCount = approvalsState.filter(
    (item) => item.status === "pending"
  ).length;

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
      className="min-h-screen bg-[#FAF8F5] text-[#0C1618] font-sans antialiased selection:bg-[var(--client-primary)] selection:text-[#0C1618] flex flex-col"
    >
      {/* 1. Top Bar Glassmórfica com Branding Sincronizado do Cliente */}
      <KasaPortalTopNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        pendingApprovalsCount={pendingApprovalsCount}
        client={client}
        teamMembers={teamMembers}
      />

      {/* 2. Área de Conteúdo */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12">
        {currentTab === "feed" && (
          <KasaInstagramFeed
            client={client}
            slug={slug}
            approvalItems={approvalsState}
            editorialPosts={editorialPosts}
            approvalComments={approvalComments}
            onNavigateTab={(tab) => handleSelectTab(tab as PortalTab)}
            onApproveAll={handleApproveAll}
          />
        )}

        {currentTab === "trafego" && (
          <KasaTrafficAdsView
            clientBrandColor={primaryColor}
            clientName={displayName}
          />
        )}

        {currentTab === "branding" && (
          <KasaBrandFilesView
            clientBrandColor={primaryColor}
            clientName={displayName}
            clientLogoUrl={client.logo_url}
          />
        )}

        {currentTab === "videos" && (
          <KasaVideoDeliverablesView
            clientBrandColor={primaryColor}
            clientName={displayName}
          />
        )}

        {currentTab === "projetos" && (
          <KasaProjectsView
            jobs={jobs as any}
            clientBrandColor={primaryColor}
          />
        )}

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
  );
}
