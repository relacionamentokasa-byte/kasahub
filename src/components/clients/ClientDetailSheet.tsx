import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ClientDetailContent } from "@/routes/_authenticated/clientes.$clientId";

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
