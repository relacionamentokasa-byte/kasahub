import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ClientDetailContent } from "@/routes/_authenticated/clientes.$clientId";
import { useQuery } from "@tanstack/react-query";
import { fetchClient, fetchJobs, fetchExtraDemands, fetchProjects } from "@/lib/ops-api";
import { fetchContracts, brl } from "@/lib/finance-api";
import { FileSignature, FolderKanban, CheckSquare, Activity, DollarSign, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { fetchProfiles } from "@/lib/profile-api";

export function ClientDetailSheet({
  clientId,
  open,
  onOpenChange,
}: {
  clientId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-5xl p-0 overflow-hidden flex flex-col bg-background"
      >
        {clientId && (
          <div className="flex-1 overflow-y-auto">
            <ClientDetailContent clientId={clientId} embedded />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
