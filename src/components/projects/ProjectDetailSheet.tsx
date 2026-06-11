import { Sheet, SheetContent } from "@/components/ui/sheet";

export function ProjectDetailSheet({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-5xl p-0 overflow-hidden flex flex-col bg-background"
      >
        <div className="p-6 text-foreground/40 italic">Visualização rápida simplificada em breve.</div>
      </SheetContent>
    </Sheet>
  );
}
