import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { ProposalEditorContent } from "@/components/proposals/ProposalEditorContent";
import { ProposalPresentation } from "@/components/proposals/ProposalPresentation";
import { ArrowLeft, Maximize2, Minimize2, Presentation } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/propostas/$proposalId")({
  head: () => ({ meta: [{ title: "Proposta — KASA HUB" }] }),
  component: ProposalDetailPage,
});

function ProposalDetailPage() {
  const { proposalId } = useParams({ from: "/_authenticated/propostas/$proposalId" });
  const { focusMode, toggleFocusMode, setFocusMode } = useFocusMode();
  const [presenting, setPresenting] = useState(false);


  // Atalho: F alterna foco. Esc sai do foco.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const isTyping =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFocusMode();
      } else if (e.key === "Escape" && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, toggleFocusMode, setFocusMode]);

  // Sempre sair do modo foco ao desmontar a tela
  useEffect(() => () => setFocusMode(false), [setFocusMode]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-5 lg:px-8 py-3.5 border-b border-border/60 bg-card sticky top-0 z-20">
        <div className="w-full mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/propostas"
              className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground shrink-0 border border-border/60"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block">
                Propostas Comerciais
              </span>
              <h1 className="font-display text-base lg:text-lg font-bold truncate text-foreground">Editar Proposta</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresenting(true)}
              className="h-8 px-3 text-xs font-mono-kasa gap-1.5 rounded-md border-border/60"
              title="Apresentar proposta ao cliente"
            >
              <Presentation className="size-3.5" />
              <span className="hidden sm:inline">Apresentar</span>
            </Button>

            <Button
              variant={focusMode ? "default" : "outline"}
              size="sm"
              onClick={toggleFocusMode}
              className={cn(
                "h-8 px-3 text-xs font-mono-kasa gap-1.5 rounded-md border-border/60",
                focusMode && "bg-foreground text-background hover:bg-foreground/90"
              )}
              title={focusMode ? "Sair do modo foco (Esc)" : "Entrar em modo foco (F)"}
            >
              {focusMode ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              <span className="hidden sm:inline">{focusMode ? "Sair do foco" : "Modo foco"}</span>
              <kbd className="hidden md:inline text-[9px] font-mono-kasa border border-current/30 rounded px-1 py-0.2 opacity-70">
                F
              </kbd>
            </Button>
          </div>

        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 w-full mx-auto">
        <ProposalEditorContent proposalId={proposalId} />
      </main>

      <ProposalPresentation
        proposalId={proposalId}
        open={presenting}
        onClose={() => setPresenting(false)}
      />
    </div>
  );
}

