# Plano: Controle Interno de Nota Fiscal e Boleto no Financeiro

Este plano descreve a implementação de um sistema de controle administrativo interno para a emissão de Notas Fiscais (NF) e Boletos dentro do módulo financeiro, sem alterar a lógica financeira atual.

## Alterações Sugeridas

### Backend (Database)
- Adicionar colunas na tabela `public.transactions`:
    - `nf_status` (TEXT): Status da Nota Fiscal (`pendente`, `emitida`, `nao_necessaria`). Default: `pendente`.
    - `boleto_internal_status` (TEXT): Status interno do Boleto (`pendente`, `emitido`, `nao_se_aplica`). Default: `nao_se_aplica`.
- Criar migração SQL para adicionar estas colunas e configurar os grants necessários.

### Frontend

#### Componentes de UI
- **TransactionFormDialog**: Adicionar campos para definir o status de NF e Boleto na criação e edição de lançamentos.
- **Relatórios (Página Financeira)**: 
    - Exibir indicadores compactos (ícones ou badges) para NF e Boleto em cada linha da tabela.
    - Implementar menus dropdown/popover em cada linha para alteração rápida destes status sem abrir o modal de edição completo.
    - Adicionar filtros na barra lateral/topo para filtrar por status de NF e Boleto.

#### Lógica e Estilo
- **Sinalização Visual**: Lançamentos com status `pendente` terão alertas visuais claros. Status resolvidos (`emitida`/`emitido`) ou que não se aplicam não gerarão alertas.
- **Independência**: Estes status serão tratados como controles administrativos, não interferindo nos status financeiros (`pago`, `pendente`, `atrasado`).

## Detalhes Técnicos
- Utilizar `DropdownMenu` ou `Popover` do Shadcn/UI para a edição rápida na lista.
- Atualizar a interface `Transaction` em `src/lib/finance-api.ts` e garantir que o `updateTransaction` suporte as novas colunas.
- Persistência garantida via Supabase.

---
### Relatório de Execução (Prévia)
- **UI Architect** — [X]
- **Supabase Engineer** — [X]
- **API Integrator** — [-]
- **Code Auditor** — [X]
