import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchClients } from "@/lib/ops-api";
import { fetchApprovals, type Approval } from "@/lib/approvals-api";
import { cn } from "@/lib/utils";

interface Props {
  onPickClient: (clientId: string, firstApproval: Approval) => void;
}

interface ClientStoryBucket {
  clientId: string;
  name: string;
  initials: string;
  logoUrl: string | null;
  brandColor: string | null;
  pendingCount: number;
  firstApproval: Approval;
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ApprovalStoriesRow({ onPickClient }: Props) {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: approvals = [] } = useQuery({
    queryKey: ["approvals", "stories-row"],
    queryFn: () => fetchApprovals(),
    refetchInterval: 30_000,
  });

  // Only "story" pieces. Pending = pending or changes_requested.
  const storyApprovals = approvals.filter((a) => a.kind === "story");
  if (!storyApprovals.length) return null;

  const buckets = new Map<string, ClientStoryBucket>();
  for (const a of storyApprovals) {
    const c = clients.find((c) => c.id === a.client_id);
    if (!c) continue;
    const name = c.company || c.name || "Cliente";
    const existing = buckets.get(c.id);
    const isPending = a.status === "pending" || a.status === "changes_requested";
    if (!existing) {
      buckets.set(c.id, {
        clientId: c.id,
        name,
        initials: initialsFor(name),
        logoUrl: c.logo_url,
        brandColor: c.brand_primary,
        pendingCount: isPending ? 1 : 0,
        firstApproval: a,
      });
    } else {
      if (isPending) {
        existing.pendingCount += 1;
        // prefer earliest pending as the opening one
        if (
          existing.firstApproval.status !== "pending" &&
          existing.firstApproval.status !== "changes_requested"
        ) {
          existing.firstApproval = a;
        }
      }
    }
  }

  const items = Array.from(buckets.values()).sort(
    (a, b) => b.pendingCount - a.pendingCount,
  );
  // Hide entirely when there are no stories at all (already returned above);
  // keep showing even if all are "seen", per Instagram tray feel.
  if (!items.length) return null;

  return (
    <div className="-mx-4 lg:-mx-8 px-4 lg:px-8">
      <div className="flex items-start gap-6 overflow-x-auto pb-3 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {items.map((it) => {
          const pending = it.pendingCount > 0;
          return (
            <button
              key={it.clientId}
              onClick={() => onPickClient(it.clientId, it.firstApproval)}
              className={cn(
                "group flex flex-col items-center gap-2 shrink-0 cursor-pointer",
                !pending && "opacity-70 hover:opacity-100 transition-opacity",
              )}
              title={it.name}
            >
              <div
                className={cn(
                  "relative w-[72px] h-[72px] rounded-full transition-transform group-hover:scale-105",
                  pending
                    ? "p-[3px] bg-gradient-to-tr from-[#ec4899] via-[#f43f5e] to-[#f59e0b]"
                    : "p-[2px] bg-border",
                )}
              >
                <div className="w-full h-full rounded-full border-[3px] border-background overflow-hidden bg-surface flex items-center justify-center">
                  {it.logoUrl ? (
                    <img
                      src={it.logoUrl}
                      alt={it.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className="text-white font-bold text-lg"
                      style={
                        it.brandColor
                          ? { color: it.brandColor }
                          : undefined
                      }
                    >
                      {it.initials}
                    </span>
                  )}
                </div>
                {pending && (
                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-background">
                    {it.pendingCount}
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "text-[11px] w-[72px] text-center truncate",
                  pending ? "text-foreground/80" : "text-foreground/50",
                )}
              >
                {it.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
