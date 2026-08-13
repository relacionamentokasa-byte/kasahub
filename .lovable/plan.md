# Plano de Ajuste: Flexibilidade de Parcelamento em Propostas

Este plano visa restaurar a funcionalidade de parcelamento padrão (pílulas de parcelas) nas propostas, mantendo a opção de "Negociação Especial" disponível para casos específicos, garantindo que o usuário possa escolher a melhor forma de pagamento para cada situação.

## Alterações

### Frontend

1.  **Restaurar Seletor de Parcelas Padrão**
    - No `ProposalEditorContent.tsx`, vamos re-adicionar o componente de `RadioGroup` que permite selecionar 1x, 2x, 3x, etc., para o **Investimento Único (Setup)**.
    - Este seletor ficará visível quando "Negociação Especial" estiver desmarcada.
    - O padrão será 2 parcelas (30/70), mas o usuário poderá escolher outras opções (ex: 1x, 3x, 4x) que seguirão a lógica de parcelamento uniforme ou regras pré-definidas.

2.  **Lógica de Persistência**
    - Garantir que o campo `installments` no banco de dados seja atualizado corretamente ao selecionar as pílulas.
    - Manter a persistência de `is_special_negotiation` e `payment_installments_config` apenas quando a negociação especial for ativada.

### Backend

1.  **Aprovação de Proposta (`proposal-approval.ts`)**
    - Ajustar a função `approveProposal` para que:
        - Se `is_special_negotiation` for falso, use o número de parcelas definido em `installments` para gerar as transações de setup.
        - Se `installments` for maior que 1 e não for especial, aplicar a regra 30/70 para a 1ª e 2ª parcela, ou dividir o restante uniformemente caso haja mais parcelas (ou manter a regra solicitada anteriormente de 30/70 sendo o padrão).
        - Se `is_special_negotiation` for verdadeiro, continuar usando o `payment_installments_config`.

## Detalhes Técnicos

- **Componente**: `src/components/proposals/ProposalEditorContent.tsx`
- **Lógica de Aprovação**: `src/lib/proposal-approval.ts`
- **Validação**: Garantir que a troca entre os modos de negociação limpe os estados conflitantes para evitar dados inconsistentes no banco.
