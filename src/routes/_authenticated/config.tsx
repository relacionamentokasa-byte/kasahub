import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  Loader2,
  Bell,
  Building2,
  Palette,
  Plug,
  Shield,
  Briefcase,
  FileText,
  User,
  Pencil,
  Users,
  ChevronRight,
  Menu,
  Download,
  SunMoon,
  Rocket,
} from "lucide-react";
import { OnboardingTemplatesManager } from "@/components/config/OnboardingTemplatesManager";
import { DetailHeaderSkeleton } from "@/components/ui/loading-skeletons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ServicesManager } from "@/components/config/ServicesManager";

import { PermissionsManager } from "@/components/PermissionsManager";
import { ContractTemplatesManager } from "@/components/config/ContractTemplatesManager";
import { ScopeTemplatesManager } from "@/components/config/ScopeTemplatesManager";
import { UserProfileTab } from "@/components/config/UserProfileTab";
import { UsersManagementTab } from "@/components/config/UsersManagementTab";
import { NotificationPreferencesTab } from "@/components/config/NotificationPreferencesTab";
import { IdentityTab } from "@/components/config/IdentityTab";
import { BrandTab } from "@/components/config/BrandTab";
import { SignatureTab } from "@/components/config/SignatureTab";
import { IntegrationsTab } from "@/components/config/IntegrationsTab";
import { PreferencesTab } from "@/components/config/PreferencesTab";
import { InstallAppTab } from "@/components/config/InstallAppTab";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import {
  fetchAgencySettings,
  updateAgencySettings,
  type AgencySettings,
} from "@/lib/settings-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/config")({
  head: () => ({ meta: [{ title: "Configurações — KASA HUB" }] }),
  component: ConfigPage,
});

type ConfigSection = {
  id: string;
  label: string;
  icon: any;
  group?: string;
  component: React.ReactNode;
};

function ConfigPage() {
  const { tab } = Route.useSearch() as { tab?: string };
  const qc = useQueryClient();
  const { can, isLoading: permissionsLoading, isError: permsError, isAdmin: userIsAdmin } = usePermissions();
  const { data: settingsData, isLoading: settingsLoading, isError: settingsError } = useQuery({
    queryKey: ["agency-settings"],
    queryFn: fetchAgencySettings,
    retry: 1,
  });

  const isAdmin = userIsAdmin; // Usar o valor real do hook
  const canEdit = isAdmin || can("config", "edit");
  const displayData = settingsData || { id: "default", name: "Agência" };

  const [activeTab, setActiveTab] = useState(tab || "brand");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [form, setForm] = useState<Partial<AgencySettings>>({});

  useEffect(() => {
    if (settingsData) {
      setForm(settingsData);
    }
  }, [settingsData]);

  const mut = useMutation({
    mutationFn: () => updateAgencySettings(displayData.id, form),
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["agency-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof AgencySettings>(k: K, v: AgencySettings[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // Se houver erro persistente, tentamos renderizar com dados mínimos ou aviso
  if (settingsLoading || permissionsLoading) {
    return <DetailHeaderSkeleton />;
  }

  // Fallback se os dados da agência falharem mas tivermos o resto
  // displayData já definido no topo

  const sections: ConfigSection[] = [
    { id: "profile", label: "Meu Perfil", icon: User, group: "Conta", component: <UserProfileTab canEdit={canEdit} /> },
    { id: "notif", label: "Notificações", icon: Bell, group: "Conta", component: <NotificationPreferencesTab /> },
    { id: "prefs", label: "Aparência", icon: SunMoon, group: "Conta", component: <PreferencesTab /> },

    { id: "agency", label: "Identidade", icon: Building2, group: "Agência", component: <IdentityTab form={form} set={set} canEdit={canEdit} /> },
    { id: "brand", label: "Cores do Sistema", icon: Palette, group: "Agência", component: <BrandTab form={form} set={set} canEdit={canEdit} /> },
    { id: "signature", label: "Assinatura da Empresa", icon: Pencil, group: "Agência", component: <SignatureTab form={form} set={set} /> },

    { id: "users", label: "Gestão de Usuários", icon: Users, group: "Usuários e Permissões", component: <UsersManagementTab canEdit={canEdit} /> },
    { id: "perms", label: "Perfis e Permissões", icon: Shield, group: "Usuários e Permissões", component: <PermissionsManager canEdit={canEdit} /> },

    { id: "services", label: "Serviços", icon: Briefcase, group: "Catálogos", component: <ServicesManager canEdit={canEdit} /> },
    { id: "contracts", label: "Templates de Contratos", icon: FileText, group: "Catálogos", component: <ContractTemplatesManager canEdit={canEdit} /> },
    { id: "scope-templates", label: "Modelos de Escopo", icon: FileText, group: "Catálogos", component: <ScopeTemplatesManager canEdit={canEdit} /> },
    { id: "onboarding-templates", label: "Modelos de Onboarding", icon: Rocket, group: "Catálogos", component: <OnboardingTemplatesManager canEdit={canEdit} /> },

    { id: "integr", label: "Integrações", icon: Plug, group: "Sistema", component: <IntegrationsTab form={form} /> },
    { id: "install", label: "Instalar o App", icon: Download, group: "Sistema", component: <InstallAppTab /> },
  ];

  const currentSection = sections.find(s => s.id === activeTab) || sections[0];

  const groups = sections.reduce((acc, section) => {
    const groupName = section.group || "Geral";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(section);
    return acc;
  }, {} as Record<string, ConfigSection[]>);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      {/* Sidebar Mobile Toggle */}
      <div className="lg:hidden px-4 h-14 border-b border-border bg-background flex items-center justify-between sticky top-0 z-20">
        <h1 className="font-display font-bold text-lg">Configurações</h1>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-11 w-11">
          <Menu className="size-5" />
        </Button>
      </div>

      {/* Internal Config Sidebar */}
      <aside className={cn(
        "w-full lg:w-72 border-r border-border bg-muted/20 shrink-0 lg:block",
        mobileMenuOpen ? "block" : "hidden"
      )}>
        <div className="p-6 sticky top-0 h-full overflow-y-auto">
          <div className="mb-6 hidden lg:block">
            <h1 className="font-display text-2xl font-bold">Configurações</h1>
            <p className="text-foreground/40 text-xs mt-1">Gerencie seu HUB e sistema.</p>
          </div>

          <nav className="space-y-6">
            {Object.entries(groups).map(([groupName, groupSections]) => (
              <div key={groupName} className="space-y-1">
                <h3 className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40 px-3 mb-2">
                  {groupName}
                </h3>
                <div className="space-y-0.5">
                  {groupSections.map((s) => {
                    const active = activeTab === s.id;
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setActiveTab(s.id);
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                          active 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-foreground/60 hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", active ? "text-primary-foreground" : "text-foreground/40 group-hover:text-foreground/60")} />
                        <span className="truncate">{s.label}</span>
                        {active && <ChevronRight className="size-3.5 ml-auto opacity-50" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 bg-background/50">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="flex items-start justify-between gap-4 flex-wrap pb-6 border-b border-border/50">
            <div>
              <span className="text-[10px] font-mono-kasa capitalize text-primary font-semibold tracking-widest">
                Configurações · {currentSection.group || "Sistema"} HUB
              </span>
              <h2 className="font-display text-3xl font-bold mt-1">{currentSection.label}</h2>
            </div>
            {!["profile", "notif", "prefs", "perms", "users", "services", "contracts", "scope-templates", "onboarding-templates", "integr", "install"].includes(activeTab) && (
              <Button
                onClick={() => mut.mutate()}
                disabled={!canEdit || mut.isPending}
                className="gap-2 shadow-lg shadow-primary/20 h-11 w-full sm:w-auto"
              >
                {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Salvar alterações
              </Button>
            )}
          </header>

          {!canEdit && (
            <div className="text-xs text-foreground/50 border border-border bg-surface rounded-lg px-4 py-3 flex items-center gap-3">
              <Shield className="size-4 text-primary/50" />
              Você está em modo somente leitura. Seu perfil precisa da permissão de editar Configurações.
            </div>
          )}

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ErrorBoundary>
              {currentSection.component}
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}
