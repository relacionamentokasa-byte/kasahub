import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, CheckCircle2, FileText, ListChecks, ArrowRight } from "lucide-react";

/**
 * "Meu Dia" — seção personalizada do dashboard que mostra
 * exatamente o que precisa da atenção do usuário logado agora.
 */
export function MyDaySection() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      const name = prof?.display_name || prof?.full_name || data.user.email?.split("@")[0] || "";
      setUserName(name.split(" ")[0]);
    });
  }, []);

  const { data: counts } = useQuery({
    queryKey: ["my-day", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const teamFilter = `[{"user_id":"${userId}"}]`;
      const [jobsRes, checklistRes, approvalsRes, proposalsRes] = await Promise.all([
        // Jobs: assignee OR responsável principal OR membro da equipe
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .or(
            `assignee_id.eq.${userId},main_responsible_id.eq.${userId},team_involved.cs.${teamFilter}`,
          )
          .in("status", ["in_progress", "review", "not_started"]),
        supabase
          .from("job_checklist")
          .select("id", { count: "exact", head: true })
          .eq("responsible_id", userId)
          .eq("done", false),
        supabase
          .from("approval_items")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("proposals")
          .select("id", { count: "exact", head: true })
          .or(`owner_id.eq.${userId},created_by.eq.${userId}`)
          .in("status", ["draft", "sent", "viewed"]),
      ]);
      return {
        jobs: jobsRes.count ?? 0,
        checklist: checklistRes.count ?? 0,
        approvals: approvalsRes.count ?? 0,
        proposals: proposalsRes.count ?? 0,
      };
    },
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const cards = [
    {
      label: "Demandas comigo",
      hint: "em execução",
      count: counts?.jobs ?? 0,
      icon: Briefcase,
      to: "/jobs" as const,
      tint: "from-blue-500/15 to-blue-500/0 text-blue-500",
    },
    {
      label: "Sua vez no checklist",
      hint: "etapas aguardando você",
      count: counts?.checklist ?? 0,
      icon: ListChecks,
      to: "/jobs" as const,
      tint: "from-amber-500/15 to-amber-500/0 text-amber-500",
    },
    {
      label: "Aprovações pendentes",
      hint: "na fila",
      count: counts?.approvals ?? 0,
      icon: CheckCircle2,
      to: "/aprovacoes" as const,
      tint: "from-emerald-500/15 to-emerald-500/0 text-emerald-500",
    },
    {
      label: "Propostas em aberto",
      hint: "criadas por você",
      count: counts?.proposals ?? 0,
      icon: FileText,
      to: "/propostas" as const,
      tint: "from-violet-500/15 to-violet-500/0 text-violet-500",
    },
  ];

  const totalPending = cards.reduce((s, c) => s + c.count, 0);

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa font-medium uppercase tracking-widest">
            Meu Dia
          </span>
          <h2 className="font-display text-xl lg:text-2xl font-bold mt-1">
            {greeting}{userName ? `, ${userName}` : ""}.
          </h2>
          <p className="text-foreground/50 text-xs lg:text-sm mt-0.5">
            {totalPending === 0
              ? "Tudo em dia — nada esperando você."
              : `Você tem ${totalPending} ${totalPending === 1 ? "item esperando" : "itens esperando"} sua ação.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const hasItems = card.count > 0;
          return (
            <Link
              key={card.label}
              to={card.to}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 lg:p-5 transition hover:border-primary/40 hover:shadow-lg ${
                hasItems ? "ring-1 ring-primary/10" : ""
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.tint.replace(/text-[\w-]+/g, "")} opacity-60`} />
              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`size-9 rounded-xl bg-background/60 flex items-center justify-center ${card.tint.split(" ").find((c) => c.startsWith("text-"))}`}>
                    <Icon className="size-4" />
                  </div>
                  <ArrowRight className="size-4 text-foreground/30 group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                </div>
                <div>
                  <div className="text-3xl lg:text-4xl font-display font-bold tabular-nums leading-none">
                    {card.count}
                  </div>
                  <div className="text-xs font-semibold mt-1.5">{card.label}</div>
                  <div className="text-[10px] text-foreground/40 uppercase tracking-wider mt-0.5">
                    {card.hint}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
