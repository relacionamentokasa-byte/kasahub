import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, UserPlus, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchUsers, fetchInvites, createInvite, deleteInvite, updateUserStatus, deleteUser } from "@/lib/users-api";
import { fetchAgencySettings } from "@/lib/settings-api";
import { fetchCustomRoles } from "@/lib/permissions-api";

function UserKPIBox({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-[10px] font-mono-kasa capitalize text-foreground/40 font-semibold">{title}</p>
      <p className="text-2xl font-bold mt-1 text-primary">{value}</p>
      {sub && <p className="text-[10px] text-foreground/40 mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    inactive: "bg-muted text-muted-foreground",
    suspended: "bg-red-500/15 text-red-300 border-red-500/30",
    pending_invite: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  };
  const labels: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    suspended: "Suspenso",
    pending_invite: "Pendente",
  };
  return (
    <Badge variant="outline" className={styles[status] || styles.inactive}>
      {labels[status] || status}
    </Badge>
  );
}

function InviteUserDialog({ roles, disabled, limitReached }: { roles: any[], disabled?: boolean, limitReached?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role_id: '' });

  const mut = useMutation({
    mutationFn: () => createInvite(form),
    onSuccess: () => {
      toast.success("Convite enviado com sucesso");
      qc.invalidateQueries({ queryKey: ["invites"] });
      setOpen(false);
      setForm({ email: '', full_name: '', role_id: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={disabled}>
          <UserPlus className="size-4" /> Convidar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo convite de usuário</DialogTitle>
        </DialogHeader>
        {limitReached ? (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-start gap-3">
            <ShieldAlert className="size-5 shrink-0" />
            <p className="text-sm">O limite de usuários do seu plano foi atingido. Remova um usuário ou faça upgrade para continuar.</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input 
                value={form.full_name} 
                onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))} 
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input 
                type="email" 
                value={form.email} 
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} 
                placeholder="email@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select value={form.role_id} onValueChange={v => setForm(prev => ({ ...prev, role_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          {!limitReached && (
            <Button 
              onClick={() => mut.mutate()} 
              disabled={!form.email || !form.full_name || !form.role_id || mut.isPending}
            >
              Enviar Convite
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersManagementTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: users = [], isLoading: usersLoading } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const { data: invites = [], isLoading: invitesLoading } = useQuery({ queryKey: ["invites"], queryFn: fetchInvites });
  const { data: agency } = useQuery({ queryKey: ["agency-settings"], queryFn: fetchAgencySettings });
  const { data: roles = [] } = useQuery({ queryKey: ["custom-roles"], queryFn: fetchCustomRoles });

  const delInvite = useMutation({
    mutationFn: deleteInvite,
    onSuccess: () => {
      toast.success("Convite removido");
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ userId, status }: { userId: string, status: any }) => updateUserStatus(userId, status),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteUserMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso");
      qc.invalidateQueries({ queryKey: ["users"] });
      setUserToDelete(null);
    },
    onError: (e: Error) => toast.error("Erro ao excluir usuário: " + e.message),
  });

  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  if (usersLoading || invitesLoading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  const userLimit = agency?.user_limit || 10;
  const usedUsers = users.length;
  const pendingInvites = invites.filter(i => i.status === 'pending').length;
  const limitReached = usedUsers + pendingInvites >= userLimit;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UserKPIBox title="Usuários Utilizados" value={`${usedUsers} / ${userLimit}`} sub={`Plano ${agency?.plan_name || 'Professional'}`} />
        <UserKPIBox title="Convites Pendentes" value={pendingInvites.toString()} />
        <UserKPIBox title="Usuários Ativos" value={users.filter(u => u.status === 'active').length.toString()} />
        <UserKPIBox title="Disponíveis" value={Math.max(0, userLimit - usedUsers - pendingInvites).toString()} />
      </div>

      <section className="rounded-xl border border-border bg-surface p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Usuários da plataforma</h2>
            <p className="text-xs text-foreground/50">Gerencie quem tem acesso e quais as permissões de cada um.</p>
          </div>
          {canEdit && (
            <InviteUserDialog 
              roles={roles} 
              disabled={limitReached} 
              limitReached={limitReached}
            />
          )}
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-[10px] font-mono-kasa capitalize text-foreground/40">
              <tr>
                <th className="text-left px-4 py-3">Usuário</th>
                <th className="text-left px-4 py-3">Cargo / Depto</th>
                <th className="text-left px-4 py-3">Perfil</th>
                <th className="text-left px-4 py-3">Último Acesso</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border group hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center shrink-0 overflow-hidden">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.display_name || u.full_name || ""} className="size-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-primary">
                            {(u.display_name || u.full_name || "?").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{u.display_name || u.full_name || "Sem nome"}</p>
                        <p className="text-[10px] text-foreground/40">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground/70">{u.job_title || "—"}</p>
                    <p className="text-[10px] text-foreground/40 uppercase">{u.department || "Geral"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                      {(u as any).custom_roles?.name || "Sem perfil"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-foreground/50 text-xs">
                    {u.last_access ? new Date(u.last_access).toLocaleString('pt-BR') : "Nunca"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Select 
                      value={u.status} 
                      onValueChange={(v) => statusMut.mutate({ userId: u.id, status: v })}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="w-32 ml-auto h-8 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {invites.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Convites Enviados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-[10px] font-mono-kasa capitalize text-foreground/40">
                <tr>
                  <th className="text-left px-4 py-3">E-mail</th>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">Expira em</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{i.email}</td>
                    <td className="px-4 py-3 text-foreground/60">{i.full_name}</td>
                    <td className="px-4 py-3 text-foreground/40 text-xs">
                      {new Date(i.expires_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => delInvite.mutate(i.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
