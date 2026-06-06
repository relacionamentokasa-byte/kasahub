## PWA do KASA HUB — implementação faseada

Vou entregar em fases para manter qualidade. Confirme se quer tudo ou só a Fase 1.

### Fase 1 — PWA instalável + offline (escopo recomendado para esta entrega)

**1. Manifest e ícones**
- `public/manifest.webmanifest` com `name`, `short_name`, `description`, `theme_color`, `background_color`, `display: standalone`, `start_url`, ícones 192/512 (já existe `manifest.webmanifest` — revisar).
- Tags `<link rel="manifest">`, `theme-color`, `apple-touch-icon` em `src/routes/__root.tsx`.
- Ícones em `public/` (PNG 192/512, apple-touch).

**2. Service worker offline (vite-plugin-pwa)**
- `bun add -d vite-plugin-pwa`.
- Configurar em `vite.config.ts` com `registerType: "autoUpdate"`, `injectRegister: null`, `devOptions.enabled: false`, `generateSW`, runtime caching:
  - HTML/navegações → `NetworkFirst`.
  - Assets hashed mesma origem → `CacheFirst`.
  - Excluir `/~oauth`, `/api/*`.
- Wrapper `src/lib/pwa-register.ts` com guarda contra preview Lovable / iframe / `?sw=off` / dev. Importado em `src/start.ts`.
- Remover/substituir `public/sw.js` existente por kill-switch ANTES de subir o novo (se houver registro anterior); aqui o atual `public/sw.js` é simples — reaproveitar via vite-plugin-pwa.

**3. UI**
- Componente `InstallPWAButton` que escuta `beforeinstallprompt` e mostra "📲 Instalar KASA HUB" no AppTopbar/menu.
- Componente `ConnectionIndicator` (🟢/🔴) no topbar usando `navigator.onLine` + eventos `online`/`offline`. Ao reconectar, dispara `queryClient.invalidateQueries()` (sincroniza automaticamente).
- Splash já é nativo via manifest (background_color + theme_color + ícone 512).
- Footer com `KASA HUB v1.0.0` (`src/lib/version.ts`).

**4. Configurações → Aplicativo (PWA)**
- Nova aba em `src/routes/_authenticated/config.tsx` → `PwaSettingsTab.tsx`:
  - Campos: nome, short_name, descrição, theme_color, background_color (lidos/gravados em `agency_settings` — adicionar colunas `pwa_name`, `pwa_short_name`, `pwa_description`, `pwa_theme_color`, `pwa_background_color`).
  - Upload de ícones 192/512 e favicon (bucket `public-assets`).
  - Botão "🔔 Enviar Notificação de Teste" (usa Notification API local + som, infra existente).
  - Switches de notificação já existem em `notification_preferences` — reusar e exibir aqui também.
- Endpoint `/api/public/manifest.webmanifest` (server route) gera manifest dinâmico a partir de `agency_settings` (para customização). Tag `<link rel="manifest" href="/api/public/manifest.webmanifest">`.

**5. Indicador de versão**
- Constante `APP_VERSION = "1.0.0"` em `src/lib/version.ts`.
- Exibido em rodapé/sidebar.

### Fase 2 — Push notifications (entrega separada)
- Requer escolha do provider: **Web Push nativo (VAPID)** OU **Firebase Cloud Messaging**.
- Tabela `push_subscriptions(user_id, endpoint, p256dh, auth, user_agent)`.
- Server route `/api/public/push-subscribe` (POST autenticado).
- Edge function ou server fn `sendPush(userId, payload)` para disparar nas mesmas regras de `notify_user`.
- Worker dedicado `public/firebase-messaging-sw.js` OU bloco `push` no SW principal (Web Push).
- Pergunto qual provider antes de implementar.

### Fase 3 — Auditoria responsiva
- Revisão página a página (Dashboard, CRM, Clientes, Propostas, Contratos, Projetos, Jobs, Agenda, Financeiro, Portal). Trabalho extenso — recomendo abrir em pedidos individuais conforme prioridade.

---

**Recomendação**: implementar **Fase 1 agora** (instalação + offline + indicador + aba Aplicativo + versão). Push e auditoria mobile ficam para mensagens dedicadas. Confirma?
