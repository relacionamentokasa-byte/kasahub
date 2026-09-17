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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou especialidade..."
            className="pl-9 h-9 bg-card border-border/80 rounded-lg text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={handleNew} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium h-9 px-4 gap-2 shadow-xs transition-colors cursor-pointer text-xs">
          <Plus className="size-3.5" /> {ctaLabel}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center bg-card border-border/80 rounded-xl shadow-xs">
          <p className="text-muted-foreground text-xs">Nenhum parceiro encontrado.</p>
          <Button variant="link" onClick={handleNew} className="mt-2 text-xs text-primary font-medium">
            Cadastrar o primeiro
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p: any) => (
            <Card
              key={p.id}
              onClick={() => setSheetPartner(p)}
              className="p-4 bg-card border-border/80 hover:border-foreground/30 transition-all rounded-xl shadow-xs hover:shadow-sm group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-3 min-w-0">
                  <Avatar className="size-11 border border-border/80 bg-muted rounded-full overflow-hidden shrink-0">
                    <AvatarImage src={p.photo_url || ""} />
                    <AvatarFallback className="text-sm font-bold text-foreground font-mono-kasa uppercase bg-muted">
                      {p.name?.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-xs leading-tight text-foreground group-hover:text-primary transition-colors truncate">
                      {p.name}
                    </h3>
                    {type === "freelancer" && p.specialty && (
                      <Badge variant="outline" className="mt-1 text-[10px] font-mono-kasa border-border/80 text-muted-foreground font-normal">
                        <Sparkles className="size-2.5 mr-1 text-primary" /> {p.specialty}
                      </Badge>
                    )}
                    {type === "representative" && (
                      <Badge variant="outline" className="mt-1 text-[10px] font-mono-kasa border-primary/30 text-primary bg-primary/5 font-medium">
                        <Calculator className="size-2.5 mr-1" /> 20% / 10%
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => handleEdit(p)} className="gap-2 text-xs">
                      <Edit2 className="size-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteMut.mutate(p.id)} className="gap-2 text-xs text-rose-500">
                      <Trash2 className="size-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1 pt-1 border-t border-border/40">
                {p.email && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                    <Mail className="size-3 shrink-0" /> <span className="truncate">{p.email}</span>
                  </div>
                )}
                {p.phone && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Phone className="size-3 shrink-0" /> {p.phone}
                  </div>
                )}
                {type === "freelancer" && p.hourly_rate != null && (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono-kasa font-bold pt-1">
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
