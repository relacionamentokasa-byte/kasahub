import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Sun, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileImageUpload } from "@/components/profile/ProfileImageUpload";
import { fetchMyProfile, updateMyProfile } from "@/lib/profile-api";
import { useTheme } from "@/lib/theme";

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

export function UserProfileTab({ canEdit: _canEdit }: { canEdit?: boolean }) {
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();

  const themeOptions: { value: "light" | "dark"; label: string; desc: string; icon: typeof Sun }[] = [
    { value: "light", label: "Tema Claro", desc: "Fundo claro e contrastado.", icon: Sun },
    { value: "dark", label: "Tema Escuro", desc: "Padrão Kasa sofisticado.", icon: Moon },
  ];

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (profile) {
      const { email: _email, ...rest } = profile;
      setForm(rest);
    }
  }, [profile]);

  const mut = useMutation({
    mutationFn: () => updateMyProfile(form),
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground gap-2 text-xs font-mono-kasa">
        <Loader2 className="size-4 animate-spin text-primary" /> Carregando perfil...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dados Pessoais */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-6">
          <h3 className="font-display text-lg font-semibold">Dados Pessoais</h3>
          <p className="text-xs text-foreground/50">Suas informações de identificação e contato no Kasa Hub.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3 space-y-4">
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

          <div className="flex-1 space-y-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Field label="Departamento" className="sm:col-span-2">
                <Input
                  value={form.department ?? ""}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </Field>
            </div>

            <div className="pt-4 border-t border-border mt-4 flex justify-end">
              <Button
                onClick={() => mut.mutate()}
                disabled={mut.isPending}
                className="w-full sm:w-auto h-9 text-xs font-medium gap-1.5"
              >
                {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Salvar meu perfil
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferência de Tema e Aparência */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <div>
              <p className="font-display text-base font-semibold">Aparência da Interface</p>
              <p className="text-xs text-foreground/50">
                Preferência salva no seu navegador para uso individual no sistema.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {themeOptions.map((opt) => {
              const active = theme === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`text-left rounded-xl border p-4 transition-all flex items-start gap-3.5 ${
                    active
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                      : "border-border bg-background/40 hover:border-foreground/20"
                  }`}
                >
                  <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-primary/20 text-primary" : "bg-muted text-foreground/60"}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-foreground/50 mt-0.5">{opt.desc}</p>
                  </div>
                  <span className={`size-4 rounded-full border-2 mt-1 ${active ? "border-primary bg-primary" : "border-foreground/30"}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
