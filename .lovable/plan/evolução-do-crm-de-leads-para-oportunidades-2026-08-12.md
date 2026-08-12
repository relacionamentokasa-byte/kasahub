# Evolução do CRM: De Leads para Oportunidades

O objetivo é transformar o CRM focado em "Nomes de Contatos" (Leads) para um focado em "Oportunidades", onde o título do card reflete o negócio ou serviço sendo negociado, mantendo a referência à empresa e ao contato.

## Mudanças sugeridas e plano de ação:

### 1. Semântica da Interface
- Alterar títulos e labels de "Lead" para "Oportunidade".
- Ajustar placeholders de "Nome do contato" para "Título da oportunidade (ex: Projeto de Branding)".

### 2. Componentes de UI (Frontend)
- **CrmBoard.tsx**: Atualizar títulos (ex: "Funil Comercial" -> "Gestão de Oportunidades"), botões ("Novo Lead" -> "Nova Oportunidade") e mensagens de feedback.
- **NewLeadDialog.tsx**: Priorizar o campo "Título/Oportunidade" como o primeiro campo obrigatório.
- **LeadCard.tsx**: Alterar a hierarquia visual. O título do card será o nome da oportunidade/empresa em destaque, e o contato em sub-texto.
- **LeadSheet.tsx**: Renomear para refletir a gestão da oportunidade.

### 3. Lógica de Dados e API
- Atualizar a função `createLead` e `updateLead` no `crm-api.ts` para garantir que o campo `name` seja tratado como o título da oportunidade.
- Adicionar suporte a um campo `title` (ou reutilizar o `name` com nova semântica) para descrever o negócio.

### Detalhes técnicos
- Modificar `src/components/crm/CrmBoard.tsx` para atualizar a nomenclatura.
- Modificar `src/components/crm/NewLeadDialog.tsx` para destacar o título da oportunidade.
- Modificar `src/lib/crm-api.ts` para alinhar as mensagens de timeline e feedbacks de sucesso.
- Reutilizar a estrutura de banco de dados atual (`leads`) para evitar migrações complexas, apenas re-significando o uso do campo `name`.

---

**Você concorda com essa abordagem de "Oportunidades"? Deseja que eu execute essas alterações agora?**