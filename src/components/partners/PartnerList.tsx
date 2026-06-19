import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPartners, type Partner, type PartnerType, deletePartner } from "@/lib/partners-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, MoreHorizontal, Mail, Phone, Trash2, Edit2, Calculator, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PartnerDialog } from "./PartnerDialog";
import { PartnerSheet } from "./PartnerSheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { brl } from "@/lib/utils-format";

interface Props {
  type: PartnerType;
}

export function PartnerList({ type }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [sheetPartner, setSheetPartner] = useState<Partner | null>(null);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners", type],
    queryFn: () => fetchPartners(type),
  });

  const filtered = partners.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const deleteMut = useMutation({
    mutationFn: deletePartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Parceiro removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleEdit = (p: any) => {
    setEditingPartner(p);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingPartner(null);
    setDialogOpen(true);
  };

  const ctaLabel =
    type === "representative" ? "Novo Representante" :
    type === "freelancer" ? "Novo Freelancer" :
    type === "supplier" ? "Novo Fornecedor" : "Novo Parceiro";

  if (isLoading) return <div className="py-20 text-center text-foreground/40 animate-pulse">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/30" />
          <Input
            placeholder="Buscar..."
            className="pl-10 bg-surface"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="size-4" /> {ctaLabel}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center bg-surface border-dashed border-border">
          <p className="text-foreground/50 text-sm">Nenhum cadastro ainda.</p>
          <Button variant="link" onClick={handleNew} className="mt-2">
            Cadastrar o primeiro
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p: any) => (
            <Card
              key={p.id}
              onClick={() => setSheetPartner(p)}
              className="p-5 bg-surface border-border hover:border-primary/50 transition-colors group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-3 min-w-0">
                  <Avatar className="size-12 border border-primary/20 bg-primary/5 rounded-full overflow-hidden shrink-0">
                    <AvatarImage src={p.photo_url || ""} />
                    <AvatarFallback className="text-lg font-bold text-primary bg-primary/10 uppercase">
                      {p.name?.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors truncate">
                      {p.name}
                    </h3>
                    {type === "freelancer" && p.specialty && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        <Sparkles className="size-2.5 mr-1" /> {p.specialty}
                      </Badge>
                    )}
                    {type === "representative" && (
                      <Badge variant="outline" className="mt-1 text-[10px] border-primary/30 text-primary">
                        <Calculator className="size-2.5 mr-1" /> 20% / 10%
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => handleEdit(p)} className="gap-2">
                      <Edit2 className="size-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteMut.mutate(p.id)} className="gap-2 text-rose-500">
                      <Trash2 className="size-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1.5">
                {p.email && (
                  <div className="flex items-center gap-2 text-xs text-foreground/60 truncate">
                    <Mail className="size-3 shrink-0" /> <span className="truncate">{p.email}</span>
                  </div>
                )}
                {p.phone && (
                  <div className="flex items-center gap-2 text-xs text-foreground/60">
                    <Phone className="size-3 shrink-0" /> {p.phone}
                  </div>
                )}
                {type === "freelancer" && p.hourly_rate != null && (
                  <div className="text-xs text-emerald-500 font-semibold pt-1">
                    {brl(Number(p.hourly_rate))}/h
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <PartnerDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditingPartner(null);
        }}
        partner={editingPartner}
        type={type}
      />

      <PartnerSheet partner={sheetPartner} onClose={() => setSheetPartner(null)} />
    </div>
  );
}
