import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus, ShieldAlert, RefreshCw, Mail, KeyRound, Send } from "lucide-react";
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
import { updateUserPassword } from "@/lib/team-api";
import { fetchAgencySettings } from "@/lib/settings-api";
import { fetchCustomRoles, assignProfileRole } from "@/lib/permissions-api";
import { createInvite as createTeamInvite, resendInvite, ROLE_LABEL, ROLE_COLOR, type AppRole } from "@/lib/team-api";
import { notify, criarNotificacao } from "@/lib/notifications-api";
import { usePermissions } from "@/hooks/use-permissions";


import { cn } from "@/lib/utils";

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

const APP_ROLES: AppRole[] = ["admin", "ceo", "gestor", "operador", "cliente"];

function InviteUserDialog({ roles = [], disabled, limitReached }: { roles?: any[], disabled?: boolean, limitReached?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role_id: '' });

  const mut = useMutation({
    mutationFn: async () => {
      const selectedRole = roles.find(r => r.id === form.role_id);
      // Mapeamento do nome do perfil para o AppRole esperado pelo sendInviteEmail
      const appRoleMapping: Record<string, AppRole> = {
        'Administrador': 'admin',
        'Gestor': 'gestor',
        'Equipe Interna': 'operador',
        'Representante': 'gestor', // Ou um mapeamento apropriado
        'Financeiro': 'operador'
      };
      
      const appRole = selectedRole ? (appRoleMapping[selectedRole.name] || 'operador') : 'operador';
      
      // A nova função createInvite do team-api lida com a criação no banco 
      // e o envio do e-mail personalizado com token em uma única operação segura no servidor.
      await createTeamInvite(
        form.email, 
        form.role_id, 
        form.full_name
      );
    },
    onSuccess: () => {
      toast.success("Convite enviado com sucesso");
      qc.invalidateQueries({ queryKey: ["invites"] });
      qc.invalidateQueries({ queryKey: ["team-invites"] });
      qc.invalidateQueries({ queryKey: ["users"] }); // Atualiza a contagem de limites e a lista de usuários (caso o convite crie um perfil pendente)
      setOpen(false);
      setForm({ email: '', full_name: '', role_id: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={disabled}>
          <UserPlus className="size-4" /> Convidar Membro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar novo membro</DialogTitle>
        </DialogHeader>
        {limitReached ? (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-start gap-3">
            <ShieldAlert className="size-5 shrink-0" />
            <p className="text-sm">O limite de usuários do seu plano foi atingido.</p>
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
              {mut.isPending ? "Enviando..." : "Enviar Convite"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ userId, userName, canEdit }: { userId: string, userName: string, canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: () => updateUserPassword(userId, password),
    onSuccess: () => {
      toast.success("Senha atualizada com sucesso");
      qc.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setPassword("");
    },
    onError: (e: Error) => toast.error("Erro ao atualizar senha: " + e.message),
  });

  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-foreground/40 hover:text-primary h-8 w-8 p-0"
          title="Redefinir Senha"
        >
          <KeyRound className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir Senha de {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <Input 
              id="new-password"
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Digite a nova senha (mín. 6 caracteres)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button 
            onClick={() => mut.mutate()} 
            disabled={password.length < 6 || mut.isPending}
          >
            {mut.isPending ? "Salvando..." : "Salvar Nova Senha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersManagementTab({ canEdit }: { canEdit: boolean }) {
  const { isAdmin } = usePermissions();
  const [isSendingTest, setIsSendingTest] = useState(false);


  const qc = useQueryClient();
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
  const { data: invitesData, isLoading: invitesLoading } = useQuery({ queryKey: ["invites"], queryFn: fetchInvites });
  const { data: agencyData } = useQuery({ queryKey: ["agency-settings"], queryFn: fetchAgencySettings });
  const { data: rolesData } = useQuery({ queryKey: ["custom-roles"], queryFn: fetchCustomRoles });

  const users = usersData || [];
  const invites = invitesData || [];
  const roles = rolesData || [];
  const agency = agencyData;

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

  const handleDeleteConfirm = useCallback(() => {
    if (userToDelete) {
      deleteUserMut.mutate(userToDelete);
    }
  }, [userToDelete, deleteUserMut]);

  if (usersLoading || invitesLoading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  const userLimit = agency?.user_limit || 10;
  const usedUsers = users.length;
  const pendingInvites = invites.filter(i => i.status === 'pending').length;
  const limitReached = usedUsers + pendingInvites >= userLimit;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <UserKPIBox title="Usuários Utilizados" value={`${usedUsers} / ${userLimit}`} sub={`Plano ${agency?.plan_name || 'Professional'}`} />
        <UserKPIBox title="Convites Pendentes" value={pendingInvites.toString()} />
        <UserKPIBox title="Usuários Ativos" value={users.filter(u => u.status === 'active').length.toString()} />
        <UserKPIBox title="Disponíveis" value={Math.max(0, userLimit - usedUsers - pendingInvites).toString()} />
      </div>

      <section className="rounded-xl border border-border bg-surface p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Membros da equipe</h2>
            <p className="text-xs text-foreground/50">Gerencie quem tem acesso e quais as permissões de cada um.</p>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && (
              <InviteUserDialog 
                roles={roles} 
                disabled={limitReached} 
                limitReached={limitReached}
              />
            )}
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-[10px] font-mono-kasa capitalize text-foreground/40">
              <tr>
                <th className="text-left px-4 py-3">Membro</th>
                <th className="text-left px-4 py-3">Cargo / Depto</th>
                <th className="text-left px-4 py-3">Perfil de Acesso</th>
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
                        <p className="text-[10px] text-foreground/40">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground/70">{u.job_title || "—"}</p>
                    <p className="text-[10px] text-foreground/40 uppercase">{u.department || "Geral"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                      {u.custom_roles?.name || "Sem perfil"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-foreground/50 text-xs">
                    {u.last_access ? new Date(u.last_access).toLocaleString('pt-BR') : "Nunca"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select 
                        value={u.status} 
                        onValueChange={(v) => statusMut.mutate({ userId: u.id, status: v })}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="w-32 h-8 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                          <SelectItem value="suspended">Suspenso</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {canEdit && (
                        <>
                          <ResetPasswordDialog 
                            userId={u.id} 
                            userName={u.display_name || u.full_name || "Usuário"} 
                            canEdit={canEdit} 
                          />
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-foreground/40 hover:text-primary h-8 w-8 p-0"
                                title="Editar perfil"
                              >
                                <ShieldAlert className="size-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Alterar Perfil de Acesso</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Perfil de Acesso</Label>
                                  <Select 
                                    defaultValue={u.custom_role_id || ""} 
                                    onValueChange={async (v) => {
                                      const roleId = v === "none" ? null : v;
                                      
                                      // Buscar o nome da role para atualizar localmente ou via query invalidation
                                      const selectedRole = roles.find(r => r.id === roleId);
                                      const roleName = selectedRole ? selectedRole.name : null;

                                      try {
                                        toast.loading("Atualizando perfil...");
                                        await assignProfileRole(u.id, roleId);
                                        
                                        // Além do custom_role_id no profile, precisamos garantir que o user_roles
                                        // seja atualizado para refletir o nível de acesso real (admin, gestor, etc)
                                        // O backend de assignProfileRole deve lidar com isso, mas garantimos a atualização da UI.
                                        
                                        qc.invalidateQueries({ queryKey: ["users"] });
                                        toast.dismiss();
                                        toast.success("Perfil atualizado com sucesso");
                                      } catch (err: any) {
                                        toast.dismiss();
                                        toast.error("Erro ao atualizar perfil: " + err.message);
                                      }
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione um perfil" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Sem perfil</SelectItem>
                                      {roles.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setUserToDelete(u.id)}
                            className="text-foreground/40 hover:text-destructive h-8 w-8 p-0"
                            title="Excluir usuário"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja remover este usuário do sistema?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente o acesso deste usuário e todos os seus dados de perfil.
            </AlertDialogDescription>

          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMut.isPending ? "Excluindo..." : "Excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {invites.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold mb-4 text-amber-500 flex items-center gap-2">
            <Mail className="size-5" /> Convites Enviados (Pendentes)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-[10px] font-mono-kasa capitalize text-foreground/40">
                <tr>
                  <th className="text-left px-4 py-3">E-mail</th>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">Data de Expiração</th>
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
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-2 text-[10px] font-mono-kasa"
                          onClick={async () => {
                            const loadingToast = toast.loading("Reenviando e-mail...");
                            try {
                              // Usando a nova função de reenvio que gera um novo token
                              await resendInvite(i.email, i.role_id, i.full_name);
                              toast.success("E-mail reenviado com sucesso!", { id: loadingToast });
                            } catch (e: any) {
                              toast.error(e.message, { id: loadingToast });
                            }
                          }}
                        >
                          <RefreshCw className="size-3" /> Reenviar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => delInvite.mutate(i.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
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