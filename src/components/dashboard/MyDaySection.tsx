import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, CheckCircle2, FileText, ListChecks, ArrowUpRight } from "lucide-react";

/**
 * "Meu Dia" — seção personalizada do dashboard com linguagem visual de agência/estúdio.
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
      label: "Demandas Ativas",
      hint: "Jobs em produção",
      count: counts?.jobs ?? 0,
      icon: Briefcase,
      to: "/jobs" as const,
      badgeStyle: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    },
    {
      label: "Checklist Pendente",
      hint: "Suas entregas pendentes",
      count: counts?.checklist ?? 0,
      icon: ListChecks,
      to: "/jobs" as const,
      badgeStyle: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      label: "Aprovações",
      hint: "Aguardando validação",
      count: counts?.approvals ?? 0,
      icon: CheckCircle2,
      to: "/aprovacoes" as const,
      badgeStyle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Propostas em Aberto",
      hint: "Em negociação comercial",
      count: counts?.proposals ?? 0,
      icon: FileText,
      to: "/propostas" as const,
      badgeStyle: "bg-primary/10 text-primary border-primary/20",
    },
  ];

  const totalPending = cards.reduce((s, c) => s + c.count, 0);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-lg lg:text-xl font-bold tracking-tight">
            {greeting}{userName ? `, ${userName}` : ""}
          </h2>
          <p className="text-foreground/60 text-xs mt-0.5">
            {totalPending === 0
              ? "Nenhuma pendência imediata sob sua responsabilidade."
              : `${totalPending} ${totalPending === 1 ? "ação requer" : "ações requerem"} sua atenção hoje.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const hasItems = card.count > 0;
          return (
            <Link
              key={card.label}
              to={card.to}
              className={`group relative rounded-xl border bg-card p-4 transition-all duration-200 hover:border-foreground/25 hover:shadow-xs ${
                hasItems ? "border-border/80" : "border-border/60 opacity-80"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors min-w-0">
                  <Icon className="size-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                  <span className="text-xs font-semibold tracking-tight text-foreground/85 group-hover:text-foreground truncate">
                    {card.label}
                  </span>
                </div>
                <ArrowUpRight className="size-3.5 text-muted-foreground/35 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>

              <div className="space-y-0.5">
                <div className="text-2xl lg:text-3xl font-display font-bold tabular-nums tracking-tight text-foreground">
                  {card.count}
                </div>
                <div className="text-[11px] font-mono-kasa text-muted-foreground truncate">
                  {card.hint}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
