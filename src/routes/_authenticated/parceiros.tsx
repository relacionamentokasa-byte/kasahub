import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartnerList } from "@/components/partners/PartnerList";
import { SupplierList } from "@/components/partners/SupplierList";
import { Users, Code, Truck, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/parceiros")({
  head: () => ({ meta: [{ title: "Parceiros — KASA HUB" }] }),
  component: PartnersPage,
});

function PartnersPage() {
  const [activeTab, setActiveTab] = useState<string>("representative");

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
      <header>
        <span className="text-[10px] font-mono-kasa capitalize text-primary font-semibold">
          Ecossistema · Parceiros
        </span>
        <h1 className="font-display text-3xl font-bold mt-1">Gestão de Parceiros</h1>
        <p className="text-foreground/60 text-sm mt-1">
          Representantes, freelancers, fornecedores e parceiros estratégicos.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-surface border border-border p-1 h-auto flex-wrap">
          <TabsTrigger value="representative" className="gap-2 py-2 px-4">
            <Users className="size-4" /> Representantes
          </TabsTrigger>
          <TabsTrigger value="freelancer" className="gap-2 py-2 px-4">
            <Code className="size-4" /> Freelancers
          </TabsTrigger>
          <TabsTrigger value="supplier" className="gap-2 py-2 px-4">
            <Truck className="size-4" /> Fornecedores
          </TabsTrigger>
          <TabsTrigger value="strategic" className="gap-2 py-2 px-4">
            <Star className="size-4" /> Estratégicos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="representative">
          <PartnerList type="representative" />
        </TabsContent>
        <TabsContent value="freelancer">
          <PartnerList type="freelancer" />
        </TabsContent>
        <TabsContent value="supplier">
          <SupplierList />
        </TabsContent>
        <TabsContent value="strategic">
          <PartnerList type="strategic" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
