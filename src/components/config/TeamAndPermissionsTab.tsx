import { useState } from "react";
import { UsersManagementTab } from "@/components/config/UsersManagementTab";
import { PermissionsManager } from "@/components/PermissionsManager";
import { Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function TeamAndPermissionsTab({ canEdit }: { canEdit: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState<"members" | "roles">("members");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/70 max-w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab("members")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeSubTab === "members"
              ? "bg-background text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="size-3.5" />
          Membros da Equipe
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("roles")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeSubTab === "roles"
              ? "bg-background text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Shield className="size-3.5" />
          Perfis & Permissões
        </button>
      </div>

      {activeSubTab === "members" ? (
        <UsersManagementTab canEdit={canEdit} />
      ) : (
        <PermissionsManager canEdit={canEdit} />
      )}
    </div>
  );
}
