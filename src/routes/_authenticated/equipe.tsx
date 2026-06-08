import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Plus, Trash2, UsersRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchTeamMembers,
  fetchInvites,
  setMemberRole,
  createInvite,
  deleteInvite,
  deleteTeamMember,
  ROLE_LABEL,
  ROLE_COLOR,
  type AppRole,
} from "@/lib/team-api";
import { fetchCurrentUserRoles, hasAnyRole } from "@/lib/roles-api";
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

const ROLES: AppRole[] = ["admin", "ceo", "gestor", "operador", "cliente"];

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [{ title: "Equipe — KASA HUB" }] }),
  component: EquipePage,
});

function EquipePage() {
  const qc = useQueryClient();
  const { data: members = [] } = useQuery({ queryKey: ["team"], queryFn: fetchTeamMembers });
  const { data: invites = [] } = useQuery({ queryKey: ["team-invites"], queryFn: fetchInvites });
  const { data: myRoles = [] } = useQuery({ queryKey: ["roles", "me"], queryFn: fetchCurrentUserRoles });
  const isAdmin = hasAnyRole(myRoles, ["admin"]);

  // Test send email logic if requested
  const handleResendTest = async () => {
    try {
      await createInvite("conteudokasa@gmail.com", "operador");
      toast.success("Convite de teste enviado para conteudokasa@gmail.com");
      qc.invalidateQueries({ queryKey: ["team-invites"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const roleMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      setMemberRole(userId, role),
    onSuccess: () => {
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delInvite = useMutation({
    mutationFn: deleteInvite,
    onSuccess: () => {
      toast.success("Convite removido");
      qc.invalidateQueries({ queryKey: ["team-invites"] });
    },
  });

  const delMember = useMutation({
    mutationFn: deleteTeamMember,
    onSuccess: () => {
      toast.success("Membro removido da equipe");
      qc.invalidateQueries({ queryKey: ["team"] });
      setMemberToDelete(null);
    },
    onError: (e: Error) => toast.error("Erro ao remover membro: " + e.message),
  });

  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  return (
    <div className="px-6 lg:px-10 py-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-[10px] font-mono-kasa capitalize text-primary font-semibold">
            Gestão · Equipe
          </span>
          <h1 className="font-display text-3xl font-bold mt-1">Equipe & permissões</h1>
          <p className="text-foreground/60 text-sm mt-1">
            Gerencie membros, papéis e convites de acesso ao KASA HUB.
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleResendTest} className="gap-2 border-primary/30 text-primary/80">
              <Mail className="size-4" /> Testar Resend
            </Button>
          )}
          {isAdmin && <NewInviteDialog />}
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-[10px] font-mono-kasa capitalize text-foreground/40">
          Membros ({members.length})
        </h2>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {members.length === 0 ? (
            <div className="p-12 text-center text-foreground/50">
              <UsersRound className="size-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhum membro cadastrado.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-[10px] font-mono-kasa capitalize text-foreground/40">
                <tr>
                  <th className="text-left px-4 py-3">Membro</th>
                  <th className="text-left px-4 py-3">Cargo</th>
                  <th className="text-left px-4 py-3">Papéis</th>
                  <th className="text-right px-4 py-3">Permissão principal</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center shrink-0 overflow-hidden">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.display_name ?? m.full_name ?? ""} className="size-full object-cover" />
                          ) : (
                            <span className="text-xs font-semibold text-primary">
                              {(m.display_name ?? m.full_name ?? "?").slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{m.display_name ?? m.full_name ?? "—"}</p>
                          <p className="text-xs text-foreground/40">{m.phone ?? ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/70">{m.job_title ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.roles.length === 0 ? (
                          <span className="text-xs text-foreground/40">Sem papel</span>
                        ) : (
                          m.roles.map((r) => (
                            <Badge key={r} variant="outline" className={ROLE_COLOR[r]}>
                              {ROLE_LABEL[r]}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin ? (
                          <>
                            <Select
                              value={m.roles[0] ?? "operador"}
                              onValueChange={(v) => roleMut.mutate({ userId: m.id, role: v as AppRole })}
                            >
                              <SelectTrigger className="w-32 h-8 text-[10px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {ROLE_LABEL[r]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMemberToDelete(m.id)}
                              className="text-foreground/40 hover:text-destructive h-8 w-8 p-0"
                              title="Remover membro"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-[10px] text-foreground/40 uppercase font-mono-kasa">Somente admin</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o acesso do usuário e excluirá seu perfil. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => memberToDelete && delMember.mutate(memberToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {delMember.isPending ? "Removendo..." : "Remover permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="space-y-3">
        <h2 className="text-[10px] font-mono-kasa capitalize text-foreground/40">
          Convites pendentes ({invites.filter((i) => i.status === "pending").length})
        </h2>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {invites.length === 0 ? (
            <div className="p-8 text-center text-sm text-foreground/50">
              <Mail className="size-8 mx-auto mb-2 opacity-40" />
              Nenhum convite registrado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-[10px] font-mono-kasa capitalize text-foreground/40">
                <tr>
                  <th className="text-left px-4 py-3">E-mail</th>
                  <th className="text-left px-4 py-3">Papel</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{i.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={ROLE_COLOR[i.role]}>
                        {ROLE_LABEL[i.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground/70 capitalize">{i.status}</td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              createInvite(i.email, i.role)
                                .then(() => toast.success("Convite reenviado"))
                                .catch((e) => toast.error(e.message));
                            }}
                            className="text-foreground/60 hover:text-primary h-8 w-8 p-0"
                            title="Reenviar convite"
                          >
                            <RefreshCw className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => delInvite.mutate(i.id)}
                            className="text-foreground/60 hover:text-red-400 h-8 w-8 p-0"
                            title="Remover convite"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-foreground/40">
          O convite cria um registro de acesso. O usuário deve se cadastrar com o e-mail
          informado em <code className="font-mono-kasa text-primary">/auth</code> para
          ativar o acesso. O papel é atribuído pelo admin após o cadastro.
        </p>
      </section>
    </div>
  );
}

function NewInviteDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("operador");
  const mut = useMutation({
    mutationFn: () => createInvite(email, role),
    onSuccess: () => {
      toast.success("Convite registrado");
      qc.invalidateQueries({ queryKey: ["team-invites"] });
      setOpen(false);
      setEmail("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" /> Convidar membro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@kasa.marketing"
            />
          </div>
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mut.mutate()} disabled={!email || mut.isPending}>
            Registrar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
