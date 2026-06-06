import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileImageUpload } from "@/components/profile/ProfileImageUpload";
import { fetchMyProfile, updateMyProfile } from "@/lib/profile-api";

function Grid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>{children}</div>;
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function UserProfileTab({ canEdit }: { canEdit?: boolean }) {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (profile) {
      const { email, ...rest } = profile;
      setForm(rest);
    }
  }, [profile]);

  const mut = useMutation({
    mutationFn: () => updateMyProfile(form),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !profile) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 space-y-6">
          <div className="space-y-4">
            <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60 font-semibold">Foto de perfil</Label>
            <ProfileImageUpload
              value={form.avatar_url}
              onChange={(url) => setForm({ ...form, avatar_url: url })}
              label="Sua Foto"
            />
            <p className="text-[10px] text-foreground/40 text-center">
              Recomendado: 400x400px (JPG, PNG ou WebP)
            </p>
          </div>

          {/* Removido duplicidade da logo aqui, pois agora está em Identidade Visual */}
        </div>

        <div className="flex-1 space-y-4">
          <Grid>
            <Field label="Nome completo">
              <Input 
                value={form.full_name ?? ""} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
              />
            </Field>
            <Field label="Nome de exibição">
              <Input 
                value={form.display_name ?? ""} 
                onChange={(e) => setForm({ ...form, display_name: e.target.value })} 
                placeholder="Como quer ser chamado"
              />
            </Field>
            <Field label="Cargo / Função">
              <Input 
                value={form.job_title ?? ""} 
                onChange={(e) => setForm({ ...form, job_title: e.target.value })} 
              />
            </Field>
            <Field label="Telefone / WhatsApp">
              <Input 
                value={form.phone ?? ""} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              />
            </Field>
            <Field label="Departamento">
              <Input 
                value={form.department ?? ""} 
                onChange={(e) => setForm({ ...form, department: e.target.value })} 
              />
            </Field>
          </Grid>
          
          <div className="pt-4 border-t border-border mt-4">
            <Button 
              onClick={() => mut.mutate()} 
              disabled={mut.isPending}
              className="w-full md:w-auto"
            >
              {mut.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
              Salvar meu perfil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
