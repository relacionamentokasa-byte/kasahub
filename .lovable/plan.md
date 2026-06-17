
# Integração Banco Inter (Cobrança API v3)

Emitir boleto híbrido (boleto + PIX copia-e-cola) direto das transações de receita do Financeiro, com cancelamento e baixa automática via webhook. Ambiente: produção.

## Pré-requisitos do usuário (fora do código)

Você precisa gerar os acessos no Internet Banking PJ Inter antes de eu ativar a integração:

1. **Login no Internet Banking PJ** → menu **Aplicações** (ou *API* / *Cobrança Bolecode API*).
2. Criar uma **nova aplicação** com os escopos:
   - `boleto-cobranca.read`
   - `boleto-cobranca.write`
   - `webhook-cobranca.read`
   - `webhook-cobranca.write`
3. O Inter vai gerar e baixar **4 itens**:
   - `Client ID`
   - `Client Secret`
   - **Certificado** (`.crt`) — conteúdo PEM
   - **Chave privada** (`.key`) — conteúdo PEM
4. Anotar a **Conta Corrente** (agência/conta no formato exigido pelo header `x-conta-corrente`).
5. Definir um **Webhook Secret** (string aleatória que vamos validar nas chamadas recebidas).

Quando estiver com tudo em mãos, eu solicito os secrets via formulário seguro:
`INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`, `INTER_CERT_PEM`, `INTER_KEY_PEM`, `INTER_CONTA_CORRENTE`, `INTER_WEBHOOK_SECRET`.

## Esquema de banco

Nova tabela `public.boletos_inter` (com GRANTs + RLS) ligando cada boleto a uma `transactions.id`:

```text
id              uuid pk
transaction_id  uuid fk -> transactions(id) on delete cascade
client_id       uuid fk -> clients(id)
nosso_numero    text
codigo_solicitacao text unique   -- id retornado pelo Inter
seu_numero      text             -- referência nossa (ex.: TX-{id curto})
situacao        text             -- EM_ABERTO | RECEBIDO | CANCELADO | EXPIRADO | A_RECEBER
valor_nominal   numeric
data_vencimento date
pdf_url         text             -- URL assinada do PDF no storage (cache)
linha_digitavel text
codigo_barras   text
pix_copia_cola  text
pix_txid        text
emitido_em      timestamptz default now()
pago_em         timestamptz
raw             jsonb            -- payload bruto do Inter para auditoria
owner_id        uuid
created_at / updated_at
```

Também: bucket privado `boletos` no Storage para guardar PDFs.

## Backend (TanStack server functions + server route)

Tudo em `src/lib/inter/`:

- `inter-client.server.ts` — cliente mTLS isomórfico:
  - Obtém OAuth2 token (`/oauth/v2/token`) usando `client_credentials` + certificado mTLS, com cache em memória até `expires_in`.
  - Wrapper `interFetch(path, init)` que injeta cert/key (via `undici.Agent`) e `x-conta-corrente`.
- `boletos.functions.ts` (protegido por `requireSupabaseAuth`):
  - `emitirBoleto({ transactionId })` → monta payload Cobrança v3 (pagador a partir do cliente, vencimento da transação, valor, mensagem), chama `POST /cobranca/v3/cobrancas`, salva linha em `boletos_inter`, baixa PDF (`GET .../pdf`) e sobe no bucket `boletos`. Retorna `{ pdfUrl, linhaDigitavel, pixCopiaCola }`.
  - `cancelarBoleto({ boletoId, motivo })` → `POST /cobranca/v3/cobrancas/{codigoSolicitacao}/cancelar`.
  - `recriarBoleto({ boletoId })` → cancela + emite novamente (para correção de dados).
- `src/routes/api/public/webhooks/inter.ts` — server route pública:
  - Valida `INTER_WEBHOOK_SECRET` (header customizado configurado no Inter ou via path-token).
  - Para cada item `RECEBIDO`: atualiza `boletos_inter` (`situacao`, `pago_em`) e marca a `transactions` correspondente como `status='paid'`, `paid_at=...`, conta bancária = a do Inter (se cadastrada).
  - Carrega `supabaseAdmin` por `await import(...)` dentro do handler.
- Função `registerInterWebhook` (rodada uma vez via botão na tela de Integrações) que faz `PUT /cobranca/v3/webhook` apontando para `https://kasahub.lovable.app/api/public/webhooks/inter`.

## UI — somente no Financeiro

Em `src/routes/_authenticated/financeiro.tsx` (e/ou componentes de linha):

- Em cada transação `type='income'` com `client_id` preenchido, adicionar no menu de ações:
  - **Emitir boleto Inter** (disabled se já existe boleto ativo)
  - **Ver boleto** (abre PDF + copia linha digitável + copia PIX)
  - **Cancelar boleto**
- Badge na linha quando há boleto: `Boleto: EM ABERTO / RECEBIDO / CANCELADO`.
- Dialog `EmitirBoletoDialog`: confirma vencimento, valor e mensagem padrão; chama `emitirBoleto`.
- Após emissão: toast com botões "Copiar linha digitável", "Copiar PIX", "Abrir PDF".
- Validações de pré-emissão (cliente precisa ter CPF/CNPJ, CEP, endereço, número, bairro, cidade, UF — exigidos pelo Inter). Se faltar, abrir o `EditClientDialog` direto no cliente.

Em `src/routes/_authenticated/integracoes.tsx`: nova aba **Banco Inter** com:
- Status da conexão (testa token OAuth).
- Botão "Registrar webhook de cobrança".
- Listagem dos últimos boletos emitidos.

## Segurança

- Certificado e chave ficam **só** como secrets do servidor; nunca expostos ao browser.
- Webhook valida assinatura/secret e usa `timingSafeEqual`.
- RLS em `boletos_inter`: leitura/escrita só para usuários autenticados da agência; service_role livre para o webhook.
- Server fn de emissão valida que o usuário tem permissão no módulo financeiro antes de chamar o Inter.

## Limitações conhecidas

- O cliente precisa estar com **CPF/CNPJ + endereço completo** preenchidos (a API do Inter rejeita pagador incompleto). Já mapeado pelos campos novos do cadastro de cliente.
- Boleto leva alguns minutos para ser registrado na CIP; o `RECEBIDO` chega via webhook em até ~1 dia útil após o pagamento.
- mTLS no runtime serverless (Cloudflare Worker): vamos usar `undici.Agent` com `nodejs_compat`; se em runtime a TLS client-cert não for suportada, faremos fallback movendo a chamada para uma Supabase Edge Function dedicada *apenas* para a comunicação com o Inter (mantendo o resto em server fn). Esse risco existe e só é confirmável em produção.

## Próximo passo

Assim que você aprovar este plano, eu:
1. Crio a migration da tabela + bucket.
2. Implemento cliente Inter, server fns, webhook e UI no Financeiro.
3. Solicito os 6 secrets via formulário seguro (você cola Client ID, Secret, conteúdo PEM do .crt e do .key, conta corrente e webhook secret).
4. Você clica em "Registrar webhook" na aba Integrações → Banco Inter e testamos com 1 boleto real de valor baixo.
