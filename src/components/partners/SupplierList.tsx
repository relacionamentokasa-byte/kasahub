import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type Supplier,
} from "@/lib/suppliers-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Trash2,
  Edit2,
  Truck,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export function SupplierList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });

  const filtered = suppliers.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.document?.toLowerCase().includes(search.toLowerCase()),
  );

  const deleteMut = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Fornecedor removido com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-foreground/40 animate-pulse">
        Carregando fornecedores...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou documento..."
            className="pl-9 h-9 bg-card border-border/80 rounded-lg text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={openNew}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium h-9 px-4 gap-2 shadow-xs transition-colors cursor-pointer text-xs"
        >
          <Plus className="size-3.5" /> Novo Fornecedor
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center bg-card border-border/80 rounded-xl shadow-xs">
          <p className="text-muted-foreground text-xs">
            Nenhum fornecedor cadastrado.
          </p>
          <Button variant="link" onClick={openNew} className="mt-2 text-xs text-primary font-medium">
            Cadastrar o primeiro
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <Card
              key={s.id}
              className="p-4 bg-card border-border/80 hover:border-foreground/30 transition-all rounded-xl shadow-xs hover:shadow-sm group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-3 min-w-0">
                  <Avatar className="size-11 border border-border/80 bg-muted rounded-full shrink-0">
                    <AvatarFallback className="text-sm font-bold text-foreground font-mono-kasa uppercase bg-muted">
                      {s.name?.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-xs leading-tight text-foreground group-hover:text-primary transition-colors truncate">
                      {s.name}
                    </h3>
                    <Badge variant="outline" className="mt-1 text-[10px] font-mono-kasa border-border/80 text-muted-foreground font-normal">
                      <Truck className="size-2.5 mr-1 text-amber-500" /> Fornecedor
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => openEdit(s)}
                      className="gap-2 text-xs cursor-pointer"
                    >
                      <Edit2 className="size-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (confirm(`Excluir "${s.name}"?`)) {
                          deleteMut.mutate(s.id);
                        }
                      }}
                      className="gap-2 text-xs text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1 pt-1 border-t border-border/40">
                {s.document && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate font-mono-kasa tabular-nums">
                    <FileText className="size-3 shrink-0" />
                    <span className="truncate">{s.document}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono-kasa tabular-nums">
                    <Phone className="size-3 shrink-0" /> {s.phone}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <SupplierDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        supplier={editing}
      />
    </div>
  );
}

function SupplierDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  supplier: Supplier | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!supplier?.id;
  const [form, setForm] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: supplier?.name ?? "",
      document: supplier?.document ?? "",
      email: supplier?.email ?? "",
      phone: supplier?.phone ?? "",
      notes: supplier?.notes ?? "",
    });
  }, [open, supplier]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome é obrigatório");
      const payload = {
        name: form.name.trim(),
        document: form.document.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (isEdit) return updateSupplier(supplier!.id, payload);
      return createSupplier(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(isEdit ? "Fornecedor atualizado com sucesso!" : "Fornecedor cadastrado com sucesso!");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Truck className="size-5" />
            </div>
            <span>{isEdit ? "Editar Fornecedor" : "Novo Fornecedor"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre fornecedores sincronizados automaticamente com o módulo Financeiro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Razão Social / Nome Fantasia *
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Vivo Fibra, Google Cloud, Fornecedor X..."
              className="h-9 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                CNPJ / CPF
              </Label>
              <Input
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="h-9 text-xs font-mono-kasa tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Telefone / WhatsApp
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="h-9 text-xs font-mono-kasa tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              E-mail de Contato / Cobrança
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contato@fornecedor.com"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Observações Internas
            </Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Detalhes sobre contratos, faturamento ou dados bancários..."
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.name.trim()}
            className="h-9 text-xs font-medium gap-1.5"
          >
            {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Truck className="size-3.5" />}
            {isEdit ? "Salvar Alterações" : "Cadastrar Fornecedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
