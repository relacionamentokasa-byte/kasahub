# Instalação do KASA HUB no celular e no PC

Objetivo: permitir que qualquer pessoa instale o KASA HUB como app no Android, iPhone e desktop (Windows/Mac/Linux), com ícone próprio e abertura em janela cheia — sem precisar de loja de aplicativos.

## O que o app já tem
- Manifesto dinâmico em `/api/public/manifest` com nome, cores e ícones.
- `<link rel="manifest">`, `theme-color`, favicon e `apple-touch-icon` no `__root.tsx`.
- Botão "Instalar KASA HUB" no topo (`InstallPWAButton`) que aparece quando o navegador oferece a instalação.
- Service worker (`/sw.js`) já registrado em produção.

## O que falta para ficar redondo

1. **Página/aba "Instalar o app"** dentro de Configurações, explicando passo a passo para cada plataforma:
   - **Android (Chrome/Edge)**: banner automático ou menu ⋮ → "Instalar app".
   - **iPhone/iPad (Safari)**: botão Compartilhar → "Adicionar à Tela de Início" (Safari não suporta prompt automático — precisa de instrução visual).
   - **Windows/Mac/Linux (Chrome/Edge)**: ícone de instalação na barra de endereço ou menu ⋮ → "Instalar KASA HUB".
   - Mostrar o botão de instalação automática quando o navegador disponibilizar, e o estado "✅ Já instalado" quando aplicável.

2. **CTA de instalação mais visível para quem ainda não instalou**: um card discreto no dashboard (dispensável) sugerindo instalar o app, exibido só em navegador (não dentro do app já instalado) e respeitando "dispensar para sempre".

3. **Garantir ícones definitivos do PWA**: hoje o manifesto serve o logo amarelo da Kasa como 192/512 e maskable. Confirmar que o PNG tem fundo sólido nas bordas (senão alguns sistemas cortam). Se necessário, gerar uma versão "maskable" com área de segurança.

4. **Splash screen iOS** (opcional, mas melhora muito a sensação de app no iPhone): adicionar `<link rel="apple-touch-startup-image">` com a tela de abertura nas resoluções principais.

## Detalhes técnicos

- Manter o padrão **manifest-only** (sem mexer em cache offline) — o app continuará exigindo internet para abrir, conforme combinado.
- Novo arquivo: `src/routes/_authenticated/config.instalar.tsx` (ou nova aba dentro de `config.tsx`) com o guia + botão de instalação.
- Novo componente: `src/components/pwa/InstallPromoCard.tsx` para o CTA no dashboard, usando `localStorage` para lembrar dispensa.
- Ajustar `InstallPWAButton` para também detectar iOS/Safari e mostrar instruções (já que `beforeinstallprompt` não dispara lá).
- Ícone maskable: se preciso, gerar `/icon-maskable-512.png` com padding interno de ~10% e referenciar no manifesto.

## Fora do escopo
- Modo offline / cache de páginas.
- Publicação nas lojas Google Play / App Store (precisaria de Capacitor/TWA — caminho separado).
- Push notifications (já existem na aba PWA atual e não serão alteradas).
