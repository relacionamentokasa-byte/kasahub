import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
  };

  const close = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-700 pointer-events-none">
      <div className="max-w-2xl mx-auto bg-surface/95 backdrop-blur-md border border-border/50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] rounded-2xl p-6 pointer-events-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <Cookie className="size-6 text-primary" />
          </div>
          
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-bold tracking-tight flex items-center gap-2">
              Privacidade e Cookies
              <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-mono-kasa uppercase">LGPD</span>
            </h4>
            <p className="text-xs text-foreground/60 leading-relaxed max-w-lg">
              Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência no KASA HUB, analisar desempenho e garantir a segurança dos seus dados conforme nossa Política de Privacidade.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={close}
              className="flex-1 md:flex-none h-10 px-4 rounded-xl text-xs font-semibold"
            >
              Recusar
            </Button>
            <Button 
              size="sm" 
              onClick={accept}
              className="flex-1 md:flex-none h-10 px-6 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              <ShieldCheck className="size-3.5" />
              Aceitar Tudo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
