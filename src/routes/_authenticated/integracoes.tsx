import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  CalendarRange,
  RefreshCw,
  Send,
  ExternalLink,
  Smartphone,
  RefreshCw as RefreshIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendEmail } from "@/lib/email.functions";
import { listGoogleEvents } from "@/lib/calendar-google.functions";

export const Route = createFileRoute("/_authenticated/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — KASA HUB" }] }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  return (
    <div className="px-6 lg:px-10 py-8 space-y-6 max-w-5xl mx-auto">
      <header>
        <span className="text-[10px] font-mono-kasa capitalize text-primary font-semibold">
          Sistema · Integrações
        </span>
        <h1 className="font-display text-3xl font-bold mt-1">Integrações ativas</h1>
        <p className="text-foreground/60 text-sm mt-1">
          Resend, Google Agenda, WhatsApp e PWA — teste e diagnostique aqui.
        </p>
      </header>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList>
          <TabsTrigger value="email" className="gap-2"><Mail className="size-3.5" /> Resend</TabsTrigger>
          <TabsTrigger value="gcal" className="gap-2"><CalendarRange className="size-3.5" /> Google Agenda</TabsTrigger>
          <TabsTrigger value="wa" className="gap-2">WhatsApp</TabsTrigger>
          <TabsTrigger value="pwa" className="gap-2"><Smartphone className="size-3.5" /> PWA</TabsTrigger>
        </TabsList>

        <TabsContent value="email"><ResendPanel /></TabsContent>
        <TabsContent value="gcal"><GCalPanel /></TabsContent>
        <TabsContent value="wa"><WhatsAppPanel /></TabsContent>
        <TabsContent value="pwa"><PWAPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface p-6">{children}</div>;
}

function ResendPanel() {
  const send = useServerFn(sendEmail);
  const [to, setTo] = useState("relacionamentokasa@gmail.com");
  const [subject, setSubject] = useState("KASA HUB — teste de envio");
  const [html, setHtml] = useState(
    "<h2>Olá!</h2><p>Este é um teste de envio do KASA HUB via Resend.</p>",
  );
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <Header
        title="Resend (e-mails transacionais)"
        status="conectado"
        right={
          <a
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
            href="https://resend.com/domains"
            target="_blank"
            rel="noreferrer"
          >
            Verificar domínio <ExternalLink className="size-3" />
          </a>
        }
      />
      <p className="text-xs text-foreground/50 mb-4">
        Em testes usamos <code className="text-primary">onboarding@resend.dev</code>. Para
        enviar com <code className="text-primary">relacionamentokasa@gmail.com</code> você
        precisa verificar o domínio no painel da Resend.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Destinatário">
          <Input value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Assunto">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
      </div>
      <Field label="HTML" className="mt-4">
        <Textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={5} />
      </Field>
      <div className="mt-4 flex justify-end">
        <Button
          onClick={async () => {
            setLoading(true);
            try {
              const r = await send({ data: { to, subject, html } });
              toast.success(`Enviado · id ${r.id ?? "ok"}`);
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Enviar teste
        </Button>
      </div>
    </Card>
  );
}

function GCalPanel() {
  const [isConnected, setIsConnected] = useState(true);
  const list = useServerFn(listGoogleEvents);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["gcal", "events"],
    queryFn: () =>
      list({
        data: {
          calendarId: "primary",
          maxResults: 20,
          timeMin: new Date().toISOString(),
        },
      }),
    enabled: isConnected,
  });

  return (
    <Card>
      <Header
        title="Google Agenda"
        status={isConnected ? "conectado" : "pendente"}
        right={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => refetch()} disabled={!isConnected}>
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button size="sm" variant={isConnected ? "destructive" : "default"} onClick={() => setIsConnected(!isConnected)}>
              {isConnected ? "Desconectar" : "Conectar Conta Google"}
            </Button>
          </div>
        }
      />
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Sincronização Automática</p>
            <p className="text-xs text-foreground/50">Sincronizar eventos bidirecionalmente.</p>
          </div>
          <Switch checked={isConnected} />
        </div>
        
        <p className="text-xs text-foreground/50">
          Próximos eventos do calendário primário conectado.
        </p>
      </div>
      {isLoading ? (
        <div className="py-10 flex justify-center"><Loader2 className="size-5 animate-spin text-primary" /></div>
      ) : isError ? (
        <p className="text-sm text-red-400">{(error as Error).message}</p>
      ) : !data?.length ? (
        <p className="text-sm text-foreground/50">Sem eventos futuros.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((ev) => {
            const start = ev.start?.dateTime ?? ev.start?.date;
            return (
              <li key={ev.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{ev.summary ?? "(sem título)"}</p>
                  <p className="text-xs text-foreground/50">
                    {start ? new Date(start).toLocaleString("pt-BR") : "—"}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </p>
                </div>
                {ev.htmlLink && (
                  <a
                    className="text-xs text-primary inline-flex items-center gap-1 shrink-0 hover:underline"
                    href={ev.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    abrir <ExternalLink className="size-3" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function WhatsAppPanel() {
  return (
    <Card>
      <Header title="WhatsApp" status="pendente" />
      <p className="text-sm text-foreground/60">
        Para ativar, precisamos do endpoint e token da sua instância (UAZAPI, Z-API ou
        WhatsApp Cloud API). Quando tiver, me passe que eu plugo a integração e habilito
        avisos automáticos de aprovação e cobrança.
      </p>
    </Card>
  );
}

function PWAPanel() {
  return (
    <Card>
      <Header title="PWA — Instalar como app" status="ativo" />
      <ol className="text-sm text-foreground/70 space-y-2 list-decimal pl-5">
        <li>
          Pelo <strong>Chrome / Edge no desktop</strong>: clique no ícone de instalação
          na barra de endereço.
        </li>
        <li>
          Pelo <strong>Android</strong>: menu ⋮ → <em>Instalar app</em>.
        </li>
        <li>
          Pelo <strong>iPhone (Safari)</strong>: botão compartilhar → <em>Adicionar
          à Tela de Início</em>.
        </li>
      </ol>
      <p className="text-xs text-foreground/40 mt-4">
        Instalação completa fica disponível na URL publicada (preview do editor não
        permite instalar).
      </p>
    </Card>
  );
}

function Header({
  title,
  status,
  right,
}: {
  title: string;
  status: "conectado" | "pendente" | "ativo";
  right?: React.ReactNode;
}) {
  const color =
    status === "conectado"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "ativo"
        ? "bg-primary/15 text-primary"
        : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span
          className={`inline-block mt-1 text-[10px] font-mono-kasa capitalize px-2 py-0.5 rounded ${color}`}
        >
          {status}
        </span>
      </div>
      {right}
    </div>
  );
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
