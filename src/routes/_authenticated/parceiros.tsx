import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartnerList } from "@/components/partners/PartnerList";
import { SupplierList } from "@/components/partners/SupplierList";
import { fetchPartners } from "@/lib/partners-api";
import { fetchSuppliers } from "@/lib/suppliers-api";
import { Users, Code, Truck, Star, Sparkles, Building2, Handshake, BadgePercent } from "lucide-react";

export const Route = createFileRoute("/_authenticated/parceiros")({
  head: () => ({ meta: [{ title: "Parceiros — KASA HUB" }] }),
  component: PartnersPage,
});

function PartnersPage() {
  const [activeTab, setActiveTab] = useState<string>("representative");

  const { data: representatives = [] } = useQuery({
    queryKey: ["partners", "representative"],
    queryFn: () => fetchPartners("representative"),
    staleTime: 60_000,
  });

  const { data: freelancers = [] } = useQuery({
    queryKey: ["partners", "freelancer"],
    queryFn: () => fetchPartners("freelancer"),
    staleTime: 60_000,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
    staleTime: 60_000,
  });

  const { data: strategics = [] } = useQuery({
    queryKey: ["partners", "strategic"],
    queryFn: () => fetchPartners("strategic"),
    staleTime: 60_000,
  });

  const totalPartners = representatives.length + freelancers.length + suppliers.length + strategics.length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full mx-auto space-y-6 animate-reveal">
      {/* Header Executivo */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa uppercase tracking-widest font-semibold">
            Ecossistema & Rede de Parcerias
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight mt-1">
            Gestão de Parceiros
          </h1>
          <p className="text-muted-foreground text-xs lg:text-sm mt-1">
            Representantes comerciais, freelancers homologados, fornecedores e parceiros estratégicos da agência.
          </p>
        </div>
      </div>

      {/* KPI Ribbon Executivo - Grid 2x2 no Mobile e 4 cols no Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              Representantes
            </span>
            <Users className="size-3.5 text-primary shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {representatives.length}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa">
              comercial
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              Freelancers
            </span>
            <Code className="size-3.5 text-blue-500 shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {freelancers.length}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa">
              especialistas
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              Fornecedores
            </span>
            <Truck className="size-3.5 text-amber-500 shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {suppliers.length}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa">
              cadastrados
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/80 shadow-xs rounded-xl p-2.5 sm:p-3.5 hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono-kasa truncate">
              Ecossistema
            </span>
            <Handshake className="size-3.5 text-emerald-500 shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
            <span className="font-mono-kasa text-base sm:text-xl font-bold text-foreground tabular-nums">
              {totalPartners}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono-kasa">
              conexões
            </span>
          </div>
        </div>
      </div>

      {/* Navegação por Categorias de Parceiros */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto no-scrollbar pb-1">
          <TabsList className="bg-card border border-border/80 p-1 h-auto rounded-xl flex whitespace-nowrap w-max sm:w-auto">
            <TabsTrigger value="representative" className="gap-2 py-2 px-3 sm:px-4 rounded-lg font-medium text-xs data-[state=active]:bg-foreground/5 data-[state=active]:text-foreground data-[state=active]:shadow-2xs">
              <Users className="size-3.5" /> Representantes ({representatives.length})
            </TabsTrigger>
            <TabsTrigger value="freelancer" className="gap-2 py-2 px-3 sm:px-4 rounded-lg font-medium text-xs data-[state=active]:bg-foreground/5 data-[state=active]:text-foreground data-[state=active]:shadow-2xs">
              <Code className="size-3.5" /> Freelancers ({freelancers.length})
            </TabsTrigger>
            <TabsTrigger value="supplier" className="gap-2 py-2 px-3 sm:px-4 rounded-lg font-medium text-xs data-[state=active]:bg-foreground/5 data-[state=active]:text-foreground data-[state=active]:shadow-2xs">
              <Truck className="size-3.5" /> Fornecedores ({suppliers.length})
            </TabsTrigger>
            <TabsTrigger value="strategic" className="gap-2 py-2 px-3 sm:px-4 rounded-lg font-medium text-xs data-[state=active]:bg-foreground/5 data-[state=active]:text-foreground data-[state=active]:shadow-2xs">
              <Star className="size-3.5" /> Estratégicos ({strategics.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="representative" className="mt-0">
          <PartnerList type="representative" />
        </TabsContent>
        <TabsContent value="freelancer" className="mt-0">
          <PartnerList type="freelancer" />
        </TabsContent>
        <TabsContent value="supplier" className="mt-0">
          <SupplierList />
        </TabsContent>
        <TabsContent value="strategic" className="mt-0">
          <PartnerList type="strategic" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
