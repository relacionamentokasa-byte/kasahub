## Problema

Hoje, ao clicar na proposta na listagem (`/propostas`), o link navega para `/propostas/$proposalId` (página inteira). O usuário espera o mesmo padrão de Clientes/Projetos: **drawer lateral** abrindo sobre a lista, sem trocar de página.

## Solução

Criar `ProposalDetailSheet.tsx` que reaproveita o editor existente (`propostas.$proposalId.tsx`) dentro de um `Sheet` lateral, e disparar esse drawer ao clicar na linha/card da proposta.

### Passos

1. **Extrair conteúdo do editor** em `src/routes/_authenticated/propostas.$proposalId.tsx`:
   - Mover o corpo do componente para um `ProposalEditorContent({ proposalId })` exportável.
   - A rota continua existindo (fallback para URL direta / compartilhar link interno) e apenas renderiza `<ProposalEditorContent proposalId={...} />`.

2. **Criar `src/components/proposals/ProposalDetailSheet.tsx`**:
   - `<Sheet open onOpenChange>` com `SheetContent side="right"` largo (`w-full sm:max-w-3xl lg:max-w-5xl`), scroll interno.
   - Renderiza `<ProposalEditorContent proposalId={id} />`.
   - Header com título da proposta + botão "Abrir em página inteira" (link para `/propostas/$id`).

3. **Ajustar `src/routes/_authenticated/propostas.tsx`**:
   - Estado `selectedId: string | null`.
   - Tabela desktop: trocar `<Link>` do título por `<button onClick={() => setSelectedId(p.id)}>` (mantém visual).
   - Linha inteira clicável (`onClick` no `<tr>`), exceto na coluna de ações.
   - Cards mobile: idem.
   - `ActionsMenu → onEdit` passa a abrir o drawer (`setSelectedId(p.id)`) em vez de `navigate(...)`.
   - Renderizar `<ProposalDetailSheet id={selectedId} onClose={() => setSelectedId(null)} />`.
   - `createMut.onSuccess` e `dupMut.onSuccess`: trocar `navigate` por `setSelectedId(p.id)` para abrir já no drawer.

4. **Invalidação**: garantir que ao fechar o drawer a query `["proposals"]` esteja invalidada para refletir mudanças (totais, status) na listagem — já feito pelas mutations internas do editor.

### Arquivos

- **Criar**: `src/components/proposals/ProposalDetailSheet.tsx`
- **Editar**:
  - `src/routes/_authenticated/propostas.$proposalId.tsx` (extrair `ProposalEditorContent`)
  - `src/routes/_authenticated/propostas.tsx` (trocar navegação por drawer)

### Fora de escopo

- Mudanças na lógica de salvamento / itens / e-mail / status — o editor é reaproveitado tal como está.
