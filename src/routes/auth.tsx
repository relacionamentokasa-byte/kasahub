import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KasaLogo } from "@/components/KasaLogo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — KASA HUB" },
      {
        name: "description",
        content: "Acesso ao sistema de gestão inteligente da Kasa Marketing Consultoria.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Já está logado? Redirecionar para o painel.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled && data.user) navigate({ to: "/", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, display_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Bem-vindo ao KASA HUB.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Acesso liberado.");
      }
      navigate({ to: "/", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha na autenticação";
      toast.error(
        msg.toLowerCase().includes("invalid login")
          ? "E-mail ou senha incorretos."
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setOauthLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Falha ao entrar com Google.");
      setOauthLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Lado visual */}
      <div className="hidden lg:flex relative bg-surface overflow-hidden flex-col justify-between p-12">
        <div className="kasa-pattern absolute inset-0 opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/70 to-transparent" />
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 size-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <KasaLogo variant="login" />
        </div>

        <div className="relative space-y-8">
          <span className="text-primary text-[10px] font-mono-kasa capitalize font-semibold">
            Sistema de Gestão Kasa · Inteligência ERP
          </span>
          <h1 className="font-display text-5xl xl:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
            Toda a sua operação,
            <br />
            <span className="text-primary italic">em um só lugar.</span>
          </h1>
          <p className="text-foreground/60 max-w-md text-balance">
            Comercial, operação, financeiro, clientes e experiência — integrados num
            ERP feito sob medida para agências.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4 text-[10px] font-mono-kasa capitalize text-foreground/40">
          <div>
            <p className="text-primary font-semibold text-2xl font-display normal-case tracking-tight">
              CRM
            </p>
            <p className="mt-1">Funil & propostas</p>
          </div>
          <div>
            <p className="text-primary font-semibold text-2xl font-display normal-case tracking-tight">
              Jobs
            </p>
            <p className="mt-1">Kanban & equipe</p>
          </div>
          <div>
            <p className="text-primary font-semibold text-2xl font-display normal-case tracking-tight">
              Portal
            </p>
            <p className="mt-1">Experiência cliente</p>
          </div>
        </div>
      </div>

      {/* Lado do formulário */}
      <div className="flex flex-col justify-center p-8 lg:p-16 max-w-xl mx-auto w-full">
        <div className="lg:hidden mb-12">
          <KasaLogo variant="login" />
        </div>

        <div className="space-y-2 mb-8">
          <span className="text-primary text-[10px] font-mono-kasa capitalize font-semibold">
            {mode === "signin" ? "Acesso restrito" : "Nova conta"}
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight">
            {mode === "signin" ? "Entrar no KASA HUB" : "Criar conta no KASA HUB"}
          </h2>
          <p className="text-foreground/60 text-sm">
            {mode === "signin"
              ? "Use o e-mail corporativo cadastrado pela administração."
              : "Crie sua conta para acessar a operação da Kasa."}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={oauthLoading || loading}
          className="w-full h-11 rounded-lg border-border hover:bg-surface gap-3 text-sm font-medium"
        >
          {oauthLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleIcon className="size-4" />
          )}
          Continuar com Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-[10px] font-mono-kasa capitalize text-foreground/30">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-5" onSubmit={handleEmailSubmit}>
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="text-[10px] font-mono-kasa capitalize text-foreground/60 font-semibold">
                Nome completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                className="w-full h-11 px-4 bg-surface border border-border rounded-lg text-sm placeholder:text-foreground/30 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-mono-kasa capitalize text-foreground/60 font-semibold">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@kasa.marketing"
              className="w-full h-11 px-4 bg-surface border border-border rounded-lg text-sm placeholder:text-foreground/30 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-mono-kasa capitalize text-foreground/60 font-semibold">
              Senha
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-4 bg-surface border border-border rounded-lg text-sm placeholder:text-foreground/30 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || oauthLoading}
            className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold gap-2 text-sm"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                {mode === "signin" ? "Entrar no sistema" : "Criar conta"}
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-foreground/60">
          {mode === "signin" ? (
            <>
              Ainda não tem conta?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-primary hover:underline font-medium"
              >
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-primary hover:underline font-medium"
              >
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.2 0-.6-.06-1.1-.15-1.6H12z"
      />
    </svg>
  );
}
