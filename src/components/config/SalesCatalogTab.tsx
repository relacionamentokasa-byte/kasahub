import { useState } from "react";
import { ServicesManager } from "@/components/config/ServicesManager";
import { ContractTemplatesManager } from "@/components/config/ContractTemplatesManager";
import { Briefcase, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function SalesCatalogTab({ canEdit }: { canEdit: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState<"services" | "contracts">("services");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/70 max-w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab("services")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeSubTab === "services"
              ? "bg-background text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Briefcase className="size-3.5" />
          Serviços & Precificação
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("contracts")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeSubTab === "contracts"
              ? "bg-background text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="size-3.5" />
          Templates de Contrato
        </button>
      </div>

      {activeSubTab === "services" ? (
        <ServicesManager canEdit={canEdit} />
      ) : (
        <ContractTemplatesManager canEdit={canEdit} />
      )}
    </div>
  );
}
