import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KasaLogo } from "@/components/KasaLogo";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const conviteSearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/convite")({
  ssr: false,
  validateSearch: (search) => conviteSearchSchema.parse(search),
  head: () => ({ meta: [{ title: "Boas-vindas ao KASA HUB" }] }),
  component: ConvitePage,
});

function ConvitePage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      // If no token in URL, check if there's already a session (e.g. from a standard Supabase link)
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setFullName(session.user.user_metadata?.full_name || "");
          setIsValidating(false);
          return;
        }
        setTokenError(true);
        setIsValidating(false);
        return;
      }

      try {
        // Verify the token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'invite',
        });
        
        if (error) {
          console.error("Token verification error:", error);
          setTokenError(true);
        } else if (data.user) {
          setFullName(data.user.user_metadata?.full_name || "");
        }
      } catch (err) {
        console.error("Unexpected error validating token:", err);
        setTokenError(true);
      } finally {
        setIsValidating(false);
      }
    };
    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    
    setLoading(true);
    try {
      // Update user password and name
      const { error } = await supabase.auth.updateUser({ 
        password,
        data: { 
          full_name: fullName,
          display_name: fullName 
        }
      });
      
      if (error) throw error;
      
      toast.success("Cadastro concluído com sucesso! Bem-vindo(a).");
      
      // Redirect to dashboard or home
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar cadastro.");
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

  if (tokenError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c1618] p-6 text-white font-sans text-center">
        <KasaLogo variant="white" className="mb-8 h-16" />
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl max-w-md w-full">
          <h2 className="text-xl font-bold text-[#ffbc45] mb-4">Convite Inválido</h2>
          <p className="text-white/60 mb-6 text-sm">
            Este link de convite é inválido ou já expirou. Por favor, entre em contato com o administrador.
          </p>
          <Button 
            onClick={() => navigate({ to: "/auth" })}
            className="w-full bg-[#ffbc45] text-[#0c1618] hover:bg-[#ffbc45]/90 rounded-xl font-bold"
          >
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c1618] p-6 text-white font-sans">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center space-y-6">
          <KasaLogo variant="white" className="h-16" />
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-display font-bold text-[#ffbc45]">
              Bem-vindo ao KASA HUB
            </h1>
            <p className="text-white/60 text-sm">
              Preencha seus dados para completar o acesso.
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#ffbc45]">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-white/20 outline-none focus:border-[#ffbc45]/60 focus:ring-2 focus:ring-[#ffbc45]/20 transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#ffbc45]">
                Definir Senha
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
              className="w-full h-12 bg-[#ffbc45] text-[#0c1618] hover:bg-[#ffbc45]/90 rounded-xl font-bold gap-2 text-sm shadow-lg shadow-[#ffbc45]/10 mt-2"
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
