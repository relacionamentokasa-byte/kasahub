import { Target, ArrowRight, TrendingUp, ArrowUpRight, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PerformanceSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
          <Target className="size-4" /> Metas e Performance
        </h3>
      </div>
      
      <Card className="bg-surface border-border rounded-2xl p-6 relative overflow-hidden group">
         <p className="text-xs text-foreground/50">Módulo de metas simplificado em breve.</p>
      </Card>
    </div>
  );
}
