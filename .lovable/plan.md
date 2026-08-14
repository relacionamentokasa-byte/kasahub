# Plano de Implementação: Edição de Demandas Extras (DME) Aprovadas

Este plano visa permitir que demandas extras já aprovadas possam ser editadas sem alterar seu status ou ID, garantindo a persistência dos dados e a integridade do fluxo financeiro.

## Alterações

### 1. Interface de Usuário (Frontend)

- **Ações na Listagem:**
    - Modificar o componente de listagem em `src/routes/_authenticated/dmes.tsx` para garantir que o botão "Editar" esteja visível mesmo quando o status for `approved`.
    - Adicionar um estado para gerenciar a DME selecionada para edição (`editingDme`).
- **Modal de Edição:**
    - Reutilizar a lógica de formulário existente no `NewDmeDialog` ou criar um novo dialog específico para edição (`EditDmeDialog`) que receba os dados de uma DME existente.
    - Garantir que o formulário de edição carregue todos os campos: Título, Descrição, Cliente, Valor e Data de Vencimento.

### 2. Lógica de Persistência (Backend/API)

- **Função de Atualização:**
    - Utilizar a função `updateExtraDemand` em `src/lib/ops-api.ts` (que já existe e realiza o `PATCH` no Supabase).
    - Assegurar que o payload enviado para o banco de dados contenha apenas os campos alterados e que o status `approved` seja mantido explicitamente se a DME já estiver aprovada.
- **Histórico e Auditoria:**
    - A função `updateExtraDemand` já chama `logAudit`, o que garantirá o registro da alteração sem apagar o histórico de aprovação.

## Detalhes Técnicos

- **Mapeamento de Status:** O status `approved` será preservado durante o `update`. A edição não acionará o fluxo de `approveExtraDemand` novamente, evitando a criação duplicada de lançamentos financeiros (caso já existam).
- **Validação:** Implementar validação no formulário para garantir que o valor seja positivo e os campos obrigatórios estejam preenchidos.
- **Feedback:** Utilizar `sonner` para exibir a mensagem "Demanda atualizada com sucesso." após a persistência.

## Plano de Teste

1. **Teste de Edição Aprovada:**
    - Identificar uma DME com status `APROVADA`.
    - Clicar em "Editar" e alterar o valor.
    - Salvar e verificar se o status permanece `APROVADA` e o valor foi atualizado no banco.
2. **Teste de Persistência:**
    - Atualizar a página após a edição e confirmar se os novos dados são exibidos.
3. **Teste de DME Pendente:**
    - Confirmar que a edição de DMEs não aprovadas continua funcionando normalmente.
4. **Verificação de ID:**
    - Confirmar que o `number_display` (ex: DME-056) permanece idêntico após a edição.
