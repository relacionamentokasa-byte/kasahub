import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ProjectDetailContent } from "@/routes/_authenticated/projetos.$projectId";

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
        {projectId && (
          <div className="flex-1 overflow-y-auto">
            <ProjectDetailContent projectId={projectId} embedded />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
