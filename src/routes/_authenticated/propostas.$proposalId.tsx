import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { ProposalEditorContent } from "@/components/proposals/ProposalEditorContent";
import { ProposalPresentation } from "@/components/proposals/ProposalPresentation";
import { ArrowLeft, Maximize2, Minimize2, Presentation } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFocusMode } from "@/contexts/FocusModeContext";


export const Route = createFileRoute("/_authenticated/propostas/$proposalId")({
  head: () => ({ meta: [{ title: "Proposta — KASA HUB" }] }),
  component: ProposalDetailPage,
});

function ProposalDetailPage() {
  const { proposalId } = useParams({ from: "/_authenticated/propostas/$proposalId" });
  const { focusMode, toggleFocusMode, setFocusMode } = useFocusMode();

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
      <header className="px-6 lg:px-10 py-6 border-b border-border bg-surface sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              to="/propostas"
              className="p-2 hover:bg-muted rounded-full transition-colors text-foreground/60 shrink-0"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-xl lg:text-2xl font-bold truncate">Editar Proposta</h1>
              <p className="text-xs text-foreground/40 hidden sm:block truncate">ID: {proposalId}</p>
            </div>
          </div>

          <Button
            variant={focusMode ? "default" : "outline"}
            size="sm"
            onClick={toggleFocusMode}
            className="gap-2 shrink-0"
            title={focusMode ? "Sair do modo foco (Esc)" : "Entrar em modo foco (F)"}
          >
            {focusMode ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{focusMode ? "Sair do foco" : "Modo foco"}</span>
            <kbd className="hidden md:inline text-[10px] font-mono-kasa border border-current/30 rounded px-1 py-0.5 opacity-70">
              F
            </kbd>
          </Button>
        </div>
      </header>

      <main className="p-6 lg:p-10 max-w-7xl mx-auto">
        <ProposalEditorContent proposalId={proposalId} />
      </main>
    </div>
  );
}
