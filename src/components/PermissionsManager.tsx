import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Shield, UserCog, Edit2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PermissionsManager({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: fetchCustomRoles,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-with-roles"],
    queryFn: fetchProfilesWithRoles,
  });

  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [open, setOpen] = useState(false);

  const delMut = useMutation({
    mutationFn: deleteCustomRole,
    onSuccess: () => {
      toast.success("Perfil excluído com sucesso!");
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignMut = useMutation({
    mutationFn: (v: { profileId: string; roleId: string | null }) =>
      assignProfileRole(v.profileId, v.roleId),
    onSuccess: () => {
      toast.success("Perfil atribuído com sucesso!");
      qc.invalidateQueries({ queryKey: ["profiles-with-roles"] });
      qc.invalidateQueries({ queryKey: ["permissions", "me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/80 bg-card p-5">
        <header className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="size-4 text-primary" /> Perfis de Acesso
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Defina o que cada perfil pode visualizar, criar, editar, excluir, exportar ou aprovar em cada módulo.
            </p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              className="gap-1.5 h-9 text-xs font-medium"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="size-3.5" /> Novo Perfil
            </Button>
          )}
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((r) => {
            const moduleCount = Object.keys(r.permissions ?? {}).filter(
              (m) => r.permissions[m as ModuleId]?.view
            ).length;
            return (
              <div
                key={r.id}
                className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-xs leading-tight text-foreground">{r.name}</p>
                    {r.is_system && (
                      <span className="text-[9px] font-mono-kasa bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                        Sistema
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {r.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/40">
                  <p className="text-[10px] font-mono-kasa text-muted-foreground">
                    {moduleCount} módulos liberados
                  </p>
                  {canEdit && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs font-medium gap-1"
                        onClick={() => {
                          setEditing(r);
                          setOpen(true);
                        }}
                      >
                        <Edit2 className="size-3" /> Editar
                      </Button>
                      {!r.is_system && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Excluir perfil "${r.name}"?`)) delMut.mutate(r.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {roles.length === 0 && (
            <p className="text-xs text-muted-foreground py-8 text-center col-span-full">
              Nenhum perfil de acesso customizado cadastrado.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-card p-5">
        <header className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <UserCog className="size-4 text-primary" /> Atribuição de Perfis por Colaborador
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione o perfil de cada colaborador. As permissões de acesso são aplicadas instantaneamente.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8 text-[11px] font-mono-kasa"
            onClick={() => qc.invalidateQueries({ queryKey: ["profiles-with-roles"] })}
          >
            Atualizar Lista
          </Button>
        </header>

        <div className="space-y-2">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 border border-border/80 rounded-xl p-3 bg-muted/20"
            >
              <div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary font-mono-kasa">
                  {(p.display_name ?? p.full_name ?? "?").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">
                  {p.display_name ?? p.full_name ?? "Sem nome"}
                </p>
              </div>
              <div className="w-56">
                <Select
                  value={p.custom_role_id ?? "none"}
                  onValueChange={(v) =>
                    assignMut.mutate({ profileId: p.id, roleId: v === "none" ? null : v })
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecionar perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Sem perfil</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {profiles.length === 0 && (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Nenhum colaborador encontrado.
            </p>
          )}
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
      toast.success(role ? "Perfil atualizado com sucesso!" : "Perfil criado com sucesso!");
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (m: ModuleId, a: ActionId, v: boolean) =>
    setPerms((prev) => ({ ...prev, [m]: { ...(prev[m] ?? {}), [a]: v } }));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setName(role?.name ?? "");
          setDescription(role?.description ?? "");
          setPerms(role?.permissions ?? {});
        }
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Shield className="size-5" />
            </div>
            <span>{role ? `Editar Perfil · ${role.name}` : "Novo Perfil de Acesso"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure as permissões granulares por módulo do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Nome do Perfil *
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Gerente Comercial ou Redator"
                className="h-9 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Descrição
              </Label>
              <Input
                value={description ?? ""}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição resumida do papel"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-xs">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border/80">
                  <th className="text-left px-3.5 py-2.5 text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                    Módulo
                  </th>
                  {ACTIONS.map((a) => (
                    <th
                      key={a.id}
                      className="px-2 py-2.5 text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold text-center"
                    >
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {MODULES.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-3.5 py-2 font-medium text-foreground">{m.label}</td>
                    {ACTIONS.map((a) => (
                      <td key={a.id} className="text-center py-2">
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
            onClick={() => mut.mutate()}
            disabled={!name.trim() || mut.isPending}
            size="sm"
            className="h-9 text-xs font-medium gap-1.5"
          >
            {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Shield className="size-3.5" />}
            Salvar Perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
