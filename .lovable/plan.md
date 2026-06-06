## Reestruturar Seção "Escopo" das Propostas

### 1. Banco de dados
- Adicionar coluna `scope_text TEXT` em `proposals` (mantém `scope text[]` existente por retrocompatibilidade — será preenchido como fallback a partir do texto quando vazio).
- Criar tabela `scope_templates` (id, name, content text, category, owner_id, created_at, updated_at) com RLS para `is_team_member` e GRANTs.
- Em `services`, garantir uso do campo já existente `default_scope`; opcionalmente adicionar `default_scope_text TEXT` para escopo livre por serviço.

### 2. Editor de Escopo (proposta — `propostas.$proposalId.tsx`)
- Substituir o bloco atual "Escopo" (lista de inputs + botão "+ Item") por:
  - Toggle: **Texto Livre** ⇄ **Estruturado (lista de itens)**.
  - Modo texto: `Textarea` expandido (min-h 280px) com suporte a Markdown leve (negrito `**`, itálico `*`, listas `-`, títulos `#`, parágrafos). Toolbar simples com botões: Negrito, Itálico, Lista, Título.
  - Modo estruturado: comportamento atual (compatibilidade).
- Botão **"Carregar Modelo"** abre Popover/Sheet com lista de `scope_templates` filtráveis. Ao selecionar, insere conteúdo no textarea (append ou substituir).
- Botão **"Salvar como Modelo"** abre dialog (nome + categoria) e grava em `scope_templates`.
- Ao adicionar um serviço com `default_scope_text`, sugerir append automático ao `scope_text` (preservando texto já digitado).

### 3. Renderização
Renderizar markdown via `react-markdown` (já leve) nas telas:
- Sheet de visualização da proposta (`ProposalDetailSheet.tsx`).
- Link público `p.$token.tsx` — substituir bloco atual `proposal.scope.join(" · ")` por render markdown de `scope_text` (com fallback para lista).
- Página de aprovação `approve.$token.tsx`.
- PDF / impressão — usar mesmo componente.
- Contrato gerado — substituir placeholder `{services_list}` por `scope_text` formatado.

### 4. Configurações
Adicionar aba/menu em `config` para CRUD de **Modelos de Escopo** (lista, criar, editar, excluir).

### 5. Detalhes técnicos
- Persistência: `scope_text` salvo em `updateProposal`/`createProposal`.
- Migração de dados existentes: array → texto (`scope.map(i => '- '+i).join('\n')`) feita on-the-fly no carregamento se `scope_text` vazio e `scope[]` tem itens.
- Instalar: `bun add react-markdown remark-gfm` (suporta GFM listas/tabelas).

### Arquivos afetados
- migração SQL (nova)
- `src/lib/scope-templates-api.ts` (novo)
- `src/components/proposals/ScopeEditor.tsx` (novo)
- `src/components/proposals/ScopeRenderer.tsx` (novo)
- `src/components/config/ScopeTemplatesManager.tsx` (novo)
- `src/routes/_authenticated/propostas.$proposalId.tsx` (editar bloco Escopo)
- `src/components/proposals/ProposalDetailSheet.tsx` (render)
- `src/routes/p.$token.tsx`, `src/routes/approve.$token.tsx` (render)
- `src/lib/crm-api.ts` (incluir `scope_text` em create/update)
- `src/routes/_authenticated/config.tsx` (nova aba)

Confirma para eu seguir com a implementação completa?
