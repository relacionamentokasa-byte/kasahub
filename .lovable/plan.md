# Plano de Correção: Fluxo de Conversão Calendário → Job

O objetivo é garantir que os dados de **Título**, **Briefing** (Descrição) e **Prazo Final** sejam transferidos corretamente do Calendário Editorial para o formulário de Novo Job, mantendo o funcionamento da criação manual de jobs.

## Análise Técnica
O problema reside na sincronização entre os parâmetros da URL e o estado interno do formulário no componente `NewJobDialog`. Embora o `clientId` funcione (provavelmente por ser reativado pelo `useEffect` de cascata de projetos), o Título, Briefing e Prazo estão sendo perdidos ou resetados durante o ciclo de vida do modal.

### Diagnóstico de Causa
1. **Conflito de useEffect**: O `useEffect` de inicialização no `NewJobDialog` pode estar sendo sobrescrito ou executado antes/depois do reset de formulário.
2. **Prop Drilling Ambíguo**: O `JobsBoard` recebe os dados mas a passagem para o `NewJobDialog` pode estar sofrendo com re-renders que limpam o `initializationRef`.
3. **Formato de Data**: O `scheduled_at` do calendário precisa ser convertido rigorosamente para o formato `datetime-local` (YYYY-MM-DDTHH:mm) para que o input HTML o reconheça.

## Ações Propostas

### 1. Robustez na Inicialização (NewJobDialog.tsx)
- Reformular o `initializationRef` para ser mais rígido: se `open` é true e temos `defaultTitle`, forçar o estado mesmo que outros efeitos tentem resetar.
- Adicionar logs de depuração em cada etapa do `setForm` para rastrear onde o dado é perdido.
- Garantir que o `initializationRef` só seja resetado quando o modal for explicitamente fechado.

### 2. Conversão de Data Precisa
- No `EditorialPostDialog.tsx`, garantir que o `searchParams.set("dueDate", form.scheduled_at)` esteja enviando a string no formato ISO ou local correto.
- No `NewJobDialog.tsx`, garantir que `defaultDueDate` seja tratado para preencher o input `datetime-local`.

### 3. Persistência no JobsBoard.tsx
- Verificar se o `JobsBoard` está mantendo as props `initialTitle`, etc., estáveis durante a abertura do modal.
- Garantir que o `onCloseNew` limpe a URL apenas **após** a confirmação de fechamento total do modal, para evitar que os dados sumam da URL enquanto o componente ainda tenta ler.

## Plano de Testes (Pós-Correção)

### Teste 1: Conversão Real
1. Acessar Calendário Editorial.
2. Editar um post com: Título "Teste Automação", Descrição "Briefing Detalhado", Data "25/08/2026 14:00".
3. Clicar em "Converter em Job".
4. **Validar**: Modal abre com Título, Briefing e Prazo (2026-08-25T14:00) preenchidos.

### Teste 2: Criação Manual
1. Acessar Módulo de Jobs.
2. Clicar em "Novo Job".
3. **Validar**: Formulário abre totalmente vazio.

### Teste 3: Troca de Post
1. Converter Post A.
2. Fechar modal.
3. Converter Post B (dados diferentes).
4. **Validar**: Modal abre com dados do Post B, sem resquícios do Post A.

## Detalhes Técnicos
- **Formatos**: `datetime-local` exige `YYYY-MM-DDTHH:mm`.
- **Hooks**: `useMemo` para estabilizar os parâmetros de busca no `JobsRoute`.
- **States**: Manter a lógica de `initializationRef` para evitar loops de `useEffect`.
