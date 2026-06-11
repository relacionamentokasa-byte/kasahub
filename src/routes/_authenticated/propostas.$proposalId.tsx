import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { ProposalEditorContent } from "@/components/proposals/ProposalEditorContent";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/propostas/$proposalId")({
  head: () => ({ meta: [{ title: "Proposta — KASA HUB" }] }),
  component: ProposalDetailPage,
});

function ProposalDetailPage() {
  const { proposalId } = useParams({ from: "/_authenticated/propostas/$proposalId" });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-6 lg:px-10 py-6 border-b border-border bg-surface sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/propostas" 
              className="p-2 hover:bg-muted rounded-full transition-colors text-foreground/60"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl lg:text-2xl font-bold">Editar Proposta</h1>
              <p className="text-xs text-foreground/40 hidden sm:block">ID: {proposalId}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 lg:p-10 max-w-7xl mx-auto">
        <ProposalEditorContent proposalId={proposalId} />
      </main>
    </div>
  );
}

