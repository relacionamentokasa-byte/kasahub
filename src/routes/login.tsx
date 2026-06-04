import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KasaLogo } from "@/components/KasaLogo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — KASA OS" },
      { name: "description", content: "Acesso ao sistema operacional da Kasa Marketing Consultoria." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Visual side */}
      <div className="hidden lg:flex relative bg-surface overflow-hidden flex-col justify-between p-12">
        <div className="kasa-grid absolute inset-0 opacity-30" />
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 size-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <KasaLogo />
        </div>

        <div className="relative space-y-8">
          <span className="text-primary text-[10px] font-mono-kasa uppercase tracking-[0.3em] font-semibold">
            Sistema Operacional · Agências de Marketing
          </span>
          <h1 className="font-display text-5xl xl:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
            Toda a sua operação,
            <br />
            <span className="text-primary italic">em um só lugar.</span>
          </h1>
          <p className="text-foreground/60 max-w-md text-balance">
            Comercial, operação, financeiro, clientes e experiência —
            integrados num ERP feito sob medida para agências.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4 text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40">
          <div>
            <p className="text-primary font-semibold text-2xl font-display normal-case tracking-tight">CRM</p>
            <p className="mt-1">Funil & propostas</p>
          </div>
          <div>
            <p className="text-primary font-semibold text-2xl font-display normal-case tracking-tight">Jobs</p>
            <p className="mt-1">Kanban & equipe</p>
          </div>
          <div>
            <p className="text-primary font-semibold text-2xl font-display normal-case tracking-tight">Portal</p>
            <p className="mt-1">Experiência cliente</p>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-col justify-center p-8 lg:p-16 max-w-xl mx-auto w-full">
        <div className="lg:hidden mb-12">
          <KasaLogo />
        </div>

        <div className="space-y-2 mb-10">
          <span className="text-primary text-[10px] font-mono-kasa uppercase tracking-[0.25em] font-semibold">
            Acesso restrito
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight">Entrar no KASA OS</h2>
          <p className="text-foreground/60 text-sm">
            Use o e-mail corporativo cadastrado pela administração.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="space-y-2">
            <label className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/60 font-semibold">
              E-mail
            </label>
            <input
              type="email"
              placeholder="voce@kasa.marketing"
              className="w-full h-11 px-4 bg-surface border border-border rounded-lg text-sm placeholder:text-foreground/30 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/60 font-semibold">
                Senha
              </label>
              <a href="#" className="text-[10px] text-primary hover:underline font-mono-kasa">
                Esqueci minha senha
              </a>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full h-11 px-4 bg-surface border border-border rounded-lg text-sm placeholder:text-foreground/30 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          <Button
            asChild
            className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold gap-2 text-sm"
          >
            <Link to="/">
              Entrar no sistema
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-[10px] text-foreground/40 font-mono-kasa uppercase tracking-widest">
            Autenticação real será ativada na Fase 2
          </p>
        </div>
      </div>
    </div>
  );
}
