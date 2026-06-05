import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ProposalEditorContent } from "@/routes/_authenticated/propostas.$proposalId";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

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
        {proposalId && (
          <div className="p-6 lg:p-8">
            <div className="flex justify-end mb-4">
              <Link
                to="/propostas/$proposalId"
                params={{ proposalId }}
                onClick={onClose}
                className="text-xs text-foreground/60 hover:text-primary flex items-center gap-1.5"
              >
                <ExternalLink className="size-3.5" /> Abrir em página inteira
              </Link>
            </div>
            <ProposalEditorContent proposalId={proposalId} embedded />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
