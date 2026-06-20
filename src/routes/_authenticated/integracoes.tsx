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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendEmail } from "@/lib/email.functions";
import { listGoogleEvents } from "@/lib/calendar-google.functions";
import { pingInter, registrarWebhookInter, listBoletosInter } from "@/lib/inter/boletos.functions";
import { Barcode } from "lucide-react";

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
          <TabsTrigger value="inter" className="gap-2"><Barcode className="size-3.5" /> Banco Inter</TabsTrigger>
          <TabsTrigger value="wa" className="gap-2">WhatsApp</TabsTrigger>
          <TabsTrigger value="pwa" className="gap-2"><Smartphone className="size-3.5" /> PWA</TabsTrigger>
        </TabsList>

        <TabsContent value="email"><ResendPanel /></TabsContent>
        <TabsContent value="gcal"><GCalPanel /></TabsContent>
        <TabsContent value="inter"><InterPanel /></TabsContent>
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
        <div className="py-2 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="size-8 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
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

function InterPanel() {
  const ping = useServerFn(pingInter);
  const registrar = useServerFn(registrarWebhookInter);
  const list = useServerFn(listBoletosInter);
  const [pinging, setPinging] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin.replace("id-preview--", "")}/api/public/webhooks/inter?secret=SUBSTITUIR_PELO_SECRET`
      : "";

  const { data: boletos = [], isLoading, refetch } = useQuery({
    queryKey: ["boletos_inter"],
    queryFn: () => list({}),
  });

  return (
    <Card>
      <Header
        title="Banco Inter — Cobrança"
        status="conectado"
        right={
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={async () => {
              setPinging(true);
              try {
                await ping({});
                toast.success("Conexão com Inter OK!");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setPinging(false);
              }
            }}
            disabled={pinging}
          >
            {pinging ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Testar conexão
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-background border border-border space-y-2">
          <p className="text-xs font-semibold">Webhook de pagamentos</p>
          <p className="text-xs text-foreground/60">
            Registre esta URL no Banco Inter para baixa automática. Substitua{" "}
            <code className="text-primary">SUBSTITUIR_PELO_SECRET</code> pelo valor que você
            configurou em <code>INTER_WEBHOOK_SECRET</code>.
          </p>
          <code className="block text-[10px] p-2 rounded bg-muted/40 break-all">{webhookUrl}</code>
          <Button
            size="sm"
            className="gap-2"
            onClick={async () => {
              const url = prompt("Cole a URL completa do webhook (com ?secret=...)", webhookUrl);
              if (!url) return;
              setRegistrando(true);
              try {
                await registrar({ data: { webhookUrl: url } });
                toast.success("Webhook registrado no Inter!");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setRegistrando(false);
              }
            }}
            disabled={registrando}
          >
            {registrando ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Registrar webhook no Inter
          </Button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold">Últimos boletos emitidos</p>
            <Button size="sm" variant="ghost" onClick={() => refetch()}>
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
          {isLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="size-4 animate-spin" /></div>
          ) : boletos.length === 0 ? (
            <p className="text-xs text-foreground/50 py-4 text-center">Nenhum boleto emitido ainda.</p>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg max-h-72 overflow-y-auto">
              {boletos.map((b: any) => (
                <li key={b.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium">
                      {b.clients?.company || b.clients?.name || "—"}
                    </div>
                    <div className="text-foreground/50">
                      R$ {Number(b.valor_nominal).toFixed(2)} · vence {b.data_vencimento}
                    </div>
                  </div>
                  <span className="font-mono-kasa text-[10px] uppercase px-2 py-0.5 rounded bg-muted">
                    {b.situacao}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
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
