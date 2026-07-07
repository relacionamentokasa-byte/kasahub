## Problema

O guard de registro do Service Worker (`src/lib/pwa-register.ts`) trata **todo** host `.lovable.app` como preview e recusa registrar o SW. Como o site publicado também roda em `kasahub.lovable.app`, o SW nunca é registrado — e o card de push mostra sempre "Service Worker não registrado. Publique e abra a versão publicada.", mesmo depois de publicar.

Os hosts reais de preview do Lovable são apenas os prefixados por `id-preview--` e `preview--` (mais os domínios internos `lovableproject.com` / `lovableproject-dev.com` / `beta.lovable.dev`). Domínios finais `*.lovable.app` e custom domains devem registrar o SW normalmente.

## Correção

Em `src/lib/pwa-register.ts`, remover a linha `host.includes(".lovable.app") ||` da checagem `isLovablePreview`. Manter todo o resto do guard (dev, iframe, `?sw=off`, prefixos `id-preview--`/`preview--`, domínios `lovableproject*` e `beta.lovable.dev`).

Resultado: no site publicado (`kasahub.lovable.app` e qualquer custom domain), o SW registra normalmente, `subscribeToPush` passa a encontrar a registration e a ativação de push funciona. Preview do editor continua sem registrar (guard de iframe + prefixo `id-preview--`).

## Como testar

1. Abrir `https://kasahub.lovable.app` no celular (após a próxima publicação).
2. Configurações → Notificações → ativar toggle → aceitar permissão → botão de teste.
