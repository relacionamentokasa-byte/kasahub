import { useState } from "react";
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
      toast.success("Fornecedor removido");
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

  if (isLoading)
    return (
      <div className="py-20 text-center text-foreground/40 animate-pulse">
        Carregando...
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/30" />
          <Input
            placeholder="Buscar fornecedor..."
            className="pl-10 bg-surface"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="size-4" /> Novo Fornecedor
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center bg-surface border-dashed border-border">
          <p className="text-foreground/50 text-sm">
            Nenhum fornecedor cadastrado.
          </p>
          <Button variant="link" onClick={openNew} className="mt-2">
            Cadastrar o primeiro
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Card
              key={s.id}
              className="p-5 bg-surface border-border hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-3 min-w-0">
                  <Avatar className="size-12 border border-primary/20 bg-primary/5 rounded-full shrink-0">
                    <AvatarFallback className="text-lg font-bold text-primary bg-primary/10 uppercase">
                      {s.name?.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors truncate">
                      {s.name}
                    </h3>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      <Truck className="size-2.5 mr-1" /> Fornecedor
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => openEdit(s)}
                      className="gap-2"
                    >
                      <Edit2 className="size-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (confirm(`Excluir "${s.name}"?`))
                          deleteMut.mutate(s.id);
                      }}
                      className="gap-2 text-rose-500"
                    >
                      <Trash2 className="size-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1.5">
                {s.document && (
                  <div className="flex items-center gap-2 text-xs text-foreground/60 truncate">
                    <FileText className="size-3 shrink-0" />
                    <span className="truncate">{s.document}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-xs text-foreground/60 truncate">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs text-foreground/60">
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

  useState(() => {
    // initial - replaced by effect below
  });

  // sync form when opening
  if (open && supplier && form.name === "" && supplier.name) {
    // initialize once per open
  }

  // Use a key reset pattern via effect
  // (kept simple to avoid extra imports)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useStateEffect(open, supplier, setForm);

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
      toast.success(isEdit ? "Fornecedor atualizado" : "Fornecedor cadastrado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEdit ? "Editar" : "Novo"} Fornecedor
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sincronizado com o módulo Financeiro automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Vivo, Receita Federal..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CPF / CNPJ</Label>
              <Input
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Salvar" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// helper to sync form with supplier when dialog opens
import { useEffect } from "react";
function useStateEffect(
  open: boolean,
  supplier: Supplier | null,
  setForm: (f: any) => void,
) {
  useEffect(() => {
    if (!open) return;
    setForm({
      name: supplier?.name ?? "",
      document: supplier?.document ?? "",
      email: supplier?.email ?? "",
      phone: supplier?.phone ?? "",
      notes: supplier?.notes ?? "",
    });
  }, [open, supplier, setForm]);
}
