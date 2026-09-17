import { useState } from "react";
import { OnboardingTemplatesManager } from "@/components/config/OnboardingTemplatesManager";
import { LeadSourcesPanel } from "@/components/config/LeadSourcesPanel";
import { Rocket, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function CrmCatalogTab({ canEdit }: { canEdit: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState<"onboarding" | "lead-sources">("onboarding");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/70 max-w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab("onboarding")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeSubTab === "onboarding"
              ? "bg-background text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Rocket className="size-3.5" />
          Modelos de Onboarding
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("lead-sources")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeSubTab === "lead-sources"
              ? "bg-background text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Target className="size-3.5" />
          Origens de Leads (CRM)
        </button>
      </div>

      {activeSubTab === "onboarding" ? (
        <OnboardingTemplatesManager canEdit={canEdit} />
      ) : (
        <LeadSourcesPanel />
      )}
    </div>
  );
}
