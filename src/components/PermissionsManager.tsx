import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Shield, UserCog } from "lucide-react";
import { toast } from "sonner";
import {
  fetchCustomRoles,
  upsertCustomRole,
  deleteCustomRole,
  fetchProfilesWithRoles,
  assignProfileRole,
  MODULES,
  ACTIONS,
  type CustomRole,
  type PermissionMap,
  type ModuleId,
  type ActionId,
} from "@/lib/permissions-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PermissionsManager({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: roles = [], isLoading } = useQuery({ queryKey: ["custom-roles"], queryFn: fetchCustomRoles });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles-with-roles"], queryFn: fetchProfilesWithRoles });

  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [open, setOpen] = useState(false);

  const delMut = useMutation({
    mutationFn: deleteCustomRole,
    onSuccess: () => {
      toast.success("Perfil excluído");
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignMut = useMutation({
    mutationFn: (v: { profileId: string; roleId: string | null }) => assignProfileRole(v.profileId, v.roleId),
    onSuccess: () => {
      toast.success("Perfil atribuído");
      qc.invalidateQueries({ queryKey: ["profiles-with-roles"] });
      qc.invalidateQueries({ queryKey: ["permissions", "me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="size-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-surface p-6">
        <header className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Shield className="size-4 text-primary" /> Perfis de acesso
            </h2>
            <p className="text-xs text-foreground/50">
              Defina o que cada perfil pode visualizar, criar, editar, excluir, exportar ou aprovar em cada módulo.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" className="gap-2" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="size-4" /> Novo perfil
            </Button>
          )}
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((r) => {
            const moduleCount = Object.keys(r.permissions ?? {}).filter((m) => r.permissions[m as ModuleId]?.view).length;
            return (
              <div key={r.id} className="rounded-lg border border-border bg-background/40 p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{r.name}</p>
                    {r.description && <p className="text-xs text-foreground/50 mt-0.5 line-clamp-2">{r.description}</p>}
                  </div>
                  {r.is_system && (
                    <span className="text-[9px] font-mono-kasa capitalize bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                      Sistema
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono-kasa capitalize text-foreground/40">
                  {moduleCount} módulos liberados
                </p>
                {canEdit && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(r); setOpen(true); }}>
                      Editar
                    </Button>
                    {!r.is_system && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm(`Excluir perfil "${r.name}"?`)) delMut.mutate(r.id);
                      }}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <header className="mb-5">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <UserCog className="size-4 text-primary" /> Atribuição de perfis
          </h2>
          <p className="text-xs text-foreground/50">
            Selecione o perfil de cada colaborador. As permissões são carregadas automaticamente.
          </p>
        </header>

        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center gap-4 border border-border rounded-lg p-3 bg-background/40">
              <div className="size-9 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {(p.display_name ?? p.full_name ?? "?").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.display_name ?? p.full_name ?? "Sem nome"}</p>
              </div>
              <div className="w-56">
                <Select
                  value={p.custom_role_id ?? "none"}
                  onValueChange={(v) => assignMut.mutate({ profileId: p.id, roleId: v === "none" ? null : v })}
                  disabled={!canEdit}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar perfil" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem perfil</SelectItem>
                    {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {profiles.length === 0 && <p className="text-sm text-foreground/50 py-6 text-center">Nenhum colaborador encontrado.</p>}
        </div>
      </section>

      <RoleEditorDialog open={open} onOpenChange={setOpen} role={editing} />
    </div>
  );
}

function RoleEditorDialog({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: CustomRole | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [perms, setPerms] = useState<PermissionMap>(role?.permissions ?? {});


  const mut = useMutation({
    mutationFn: () =>
      upsertCustomRole({
        id: role?.id,
        name: name.trim(),
        description: description.trim() || null,
        permissions: perms,
      }),
    onSuccess: () => {
      toast.success(role ? "Perfil atualizado" : "Perfil criado");
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (m: ModuleId, a: ActionId, v: boolean) =>
    setPerms((prev) => ({ ...prev, [m]: { ...(prev[m] ?? {}), [a]: v } }));

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v);
      if (v) {
        setName(role?.name ?? "");
        setDescription(role?.description ?? "");
        setPerms(role?.permissions ?? {});
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? `Editar perfil: ${role.name}` : "Novo perfil"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Gerente comercial" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input value={description ?? ""} onChange={(e) => setDescription(e.target.value)} placeholder="Curta descrição" />
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background/60 border-b border-border">
                  <th className="text-left px-3 py-2 text-[10px] font-mono-kasa capitalize text-foreground/60">Módulo</th>
                  {ACTIONS.map((a) => (
                    <th key={a.id} className="px-2 py-2 text-[10px] font-mono-kasa capitalize text-foreground/60 text-center">
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{m.label}</td>
                    {ACTIONS.map((a) => (
                      <td key={a.id} className="text-center py-1">
                        <Switch
                          checked={Boolean(perms[m.id]?.[a.id])}
                          onCheckedChange={(v) => toggle(m.id, a.id, v)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={!name.trim() || mut.isPending}>
            {mut.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
