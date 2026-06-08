import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KasaLogo } from "@/components/KasaLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/invite")({
  ssr: false,
  head: () => ({ meta: [{ title: "Boas-vindas ao KASA HUB" }] }),
  component: InvitePage,
});

function InvitePage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateInvite = async () => {
      // Como o Supabase envia um email com link de confirmação,
      // se o usuário clicar no nosso link customizado, ele ainda não está logado.
      // Precisamos do fluxo de convite do Supabase.
      
      // Se não houver sessão, podemos tentar verificar se há um token na URL
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Se não houver sessão, o convite pode não ter sido aceito via Supabase ainda.
        // O ideal é que o link no email seja o link de confirmação do Supabase que redireciona para cá.
        // Por agora, vamos apenas mostrar um erro se não houver usuário.
        setIsValidating(false);
        return;
      }
      
      setUserName(session.user.user_metadata?.full_name || "");
      setIsValidating(false);
    };
    validateInvite();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha definida com sucesso! Bem-vindo(a).");
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err.message || "Erro ao definir senha.");
    } finally {
      setLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c1618]">
        <Loader2 className="size-8 animate-spin text-[#ffbc45]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c1618] p-6 text-white font-sans">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center space-y-6">
          <KasaLogo variant="login" />
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-display font-bold text-[#ffbc45]">
              Olá, {userName}!
            </h1>
            <p className="text-white/60 text-sm">
              Você foi convidado para o KASA HUB. Defina sua senha para começar.
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#ffbc45]">
                Nova Senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-white/20 outline-none focus:border-[#ffbc45]/60 focus:ring-2 focus:ring-[#ffbc45]/20 transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#ffbc45]">
                Confirmar Senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-white/20 outline-none focus:border-[#ffbc45]/60 focus:ring-2 focus:ring-[#ffbc45]/20 transition"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#ffbc45] text-[#0c1618] hover:bg-[#ffbc45]/90 rounded-xl font-bold gap-2 text-sm shadow-lg shadow-[#ffbc45]/10"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Entrar no Kasa Hub
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 text-white/40 text-[10px] uppercase font-bold tracking-widest">
          <ShieldCheck className="size-3" />
          Acesso Seguro · Kasa Marketing
        </div>
      </div>
    </div>
  );
}
