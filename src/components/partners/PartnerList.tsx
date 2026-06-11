import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPartners, type Partner, type PartnerType, deletePartner } from "@/lib/partners-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, MoreHorizontal, Phone, Mail, MapPin, Trash2, Edit2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PartnerDialog } from "./PartnerDialog";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/use-permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  type: PartnerType;
}

export function PartnerList({ type }: Props) {
  const qc = useQueryClient();
  const { isAdmin, can } = usePermissions();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any | null>(null);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners", type],
    queryFn: () => fetchPartners(),
  });

  const filtered = partners.filter((p: any) => 
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const deleteMut = useMutation({
    mutationFn: deletePartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Parceiro removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="py-20 text-center text-foreground/40 animate-pulse">Carregando parceiros...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/30" />
          <Input 
            placeholder="Buscar parceiro..." 
            className="pl-10 bg-surface" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="size-4" /> Novo Parceiro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p: any) => (
          <Card 
            key={p.id} 
            className="p-5 bg-surface border-border hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-4">
                <Avatar className="size-12 border border-primary/20 bg-primary/5 rounded-full overflow-hidden">
                  <AvatarImage src={p.photo_url || ""} />
                  <AvatarFallback className="text-lg font-bold text-primary bg-primary/10 uppercase">
                    {p.name?.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{p.name}</h3>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => deleteMut.mutate(p.id)} className="gap-2 text-rose-500">
                    <Trash2 className="size-3.5" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2 mb-4">
              {p.email && (
                <div className="flex items-center gap-2 text-xs text-foreground/60">
                  <Mail className="size-3.5" /> {p.email}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <PartnerDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        partner={editingPartner} 
        type={type} 
      />
    </div>
  );
}
