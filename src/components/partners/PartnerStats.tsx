import { useQuery } from "@tanstack/react-query";
import { fetchPartnerStats, type Partner, type PartnerType } from "@/lib/partners-api";
import { Card } from "@/components/ui/card";
import { Users, CheckCircle2, Clock, Briefcase } from "lucide-react";

interface Props {
  partner: Partner;
}

export function PartnerStats({ partner }: Props) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["partner-stats", partner.id, partner.type],
    queryFn: () => fetchPartnerStats(partner.id, partner.type as PartnerType),
  });

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-20 bg-muted rounded-xl"></div></div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {partner.type === 'representative' && (
          <>
            <StatCard label="Leads Indicados" value={(stats as any).leadsCount} icon={Users} />
            <StatCard label="Contratos Fechados" value={(stats as any).contractsCount} icon={Briefcase} />
          </>
        )}


        {partner.type === 'freelancer' && (
          <>
            <StatCard label="Jobs Ativos" value={(stats as any).activeJobs} icon={Clock} />
            <StatCard label="Jobs Concluídos" value={(stats as any).doneJobs} icon={CheckCircle2} color="text-emerald-500" />
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "text-primary" }: { label: string, value: any, icon: any, color?: string }) {
  return (
    <Card className="p-4 bg-background border-border flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className={`size-3.5 ${color}`} />
        <span className="text-[10px] uppercase font-mono-kasa text-foreground/40">{label}</span>
      </div>
      <span className="text-xl font-bold">{value}</span>
    </Card>
  );
}
