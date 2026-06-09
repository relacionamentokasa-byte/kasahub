import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPartners, createPartner, type Partner, type PartnerType, deletePartner } from "@/lib/partners-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, MoreHorizontal, Phone, Mail, MapPin, Trash2, Edit2, ExternalLink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PartnerDialog } from "./PartnerDialog";
import { PartnerSheet } from "./PartnerSheet";
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
  const [sheetPartner, setSheetPartner] = useState<Partner | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners", type],
    queryFn: () => fetchPartners(type),
  });

  const filtered = partners.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const deleteMut = useMutation({
    mutationFn: deletePartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Parceiro removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleEdit = (p: Partner) => {
    setEditingPartner(p);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingPartner(null);
    setDialogOpen(true);
  };

  if (isLoading) return <div className="py-20 text-center text-foreground/40 animate-pulse">Carregando parceiros...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/30" />
          <Input 
            placeholder="Buscar por nome, e-mail ou empresa..." 
            className="pl-10 bg-surface" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(isAdmin || can("parceiros", "create")) && (
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="size-4" /> Novo {typeLabel(type)}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Card 
            key={p.id} 
            className="p-5 bg-surface border-border hover:border-primary/50 transition-colors group cursor-pointer"
            onClick={() => setSheetPartner(p)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-4">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="size-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-primary">{p.name[0]}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{p.name}</h3>
                  <p className="text-xs text-foreground/40 font-medium">
                    {p.company_name || typeLabel(type)}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(p);
                    }} 
                    className="gap-2"
                  >
                    <Edit2 className="size-3.5" /> Editar
                  </DropdownMenuItem>
                  {(isAdmin || can("parceiros", "delete")) && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Deseja realmente excluir este parceiro?")) {
                          deleteMut.mutate(p.id);
                        }
                      }}
                      className="gap-2 text-rose-500"
                    >
                      <Trash2 className="size-3.5" /> Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2 mb-4">
              {p.email && (
                <div className="flex items-center gap-2 text-xs text-foreground/60">
                  <Mail className="size-3.5" /> {p.email}
                </div>
              )}
              {p.phone && (
                <div className="flex items-center gap-2 text-xs text-foreground/60">
                  <Phone className="size-3.5" /> {p.phone}
                </div>
              )}
              {p.city && (
                <div className="flex items-center gap-2 text-xs text-foreground/60">
                  <MapPin className="size-3.5" /> {p.city}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Badge variant="outline" className={p.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}>
                {p.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
              {type === 'freelancer' && p.specialty && (
                <Badge className="bg-primary/10 text-primary border-none">{p.specialty}</Badge>
              )}
              {type === 'representative' && p.commission_value && (
                <span className="text-[10px] font-mono-kasa font-bold">
                  {p.commission_type === 'percentage' ? `${p.commission_value}%` : `R$ ${p.commission_value}`}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center bg-surface rounded-2xl border border-dashed border-border">
          <p className="text-foreground/40">Nenhum parceiro encontrado.</p>
        </div>
      )}

      <PartnerDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        partner={editingPartner} 
        type={type} 
      />

      <PartnerSheet
        partner={sheetPartner}
        onClose={() => setSheetPartner(null)}
      />
    </div>
  );
}

function typeLabel(type: PartnerType) {
  switch (type) {
    case 'representative': return 'Representante';
    case 'freelancer': return 'Freelancer';
    case 'supplier': return 'Fornecedor';
    case 'strategic': return 'Parceiro Estratégico';
  }
}
