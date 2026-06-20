import { Sheet, SheetContent } from "@/components/ui/sheet";

import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2 } from "lucide-react";
import { ProposalEditorContent } from "./ProposalEditorContent";
import { SheetContentSkeleton } from "@/components/ui/loading-skeletons";

export function ProposalDetailSheet({
  proposalId,
  onClose,
}: {
  proposalId: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!proposalId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl lg:max-w-5xl p-0 overflow-y-auto bg-background"
      >
        {proposalId ? (
          <div className="p-6 lg:p-8 space-y-8">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight">Editar Proposta</h2>
                <p className="text-sm text-foreground/50">Gerencie itens, valores e escopo.</p>
              </div>
              <Link
                to="/propostas/$proposalId"
                params={{ proposalId }}
                onClick={onClose}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 bg-primary/10 px-3 py-2 rounded-full transition-colors"
              >
                <ExternalLink className="size-3.5" /> Abrir em página inteira
              </Link>
            </div>
            
            <ProposalEditorContent proposalId={proposalId} />
          </div>
        ) : (
          <SheetContentSkeleton />
        )}
      </SheetContent>
    </Sheet>
  );
}

