import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notify, handleMentions } from "@/lib/notifications-api";

export async function runFullNotificationTest() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error("Você precisa estar logado para rodar os testes.");
    return;
  }

  const results: { name: string, status: 'success' | 'failure', error?: string }[] = [];
  const addResult = (name: string, status: 'success' | 'failure', error?: string) => {
    results.push({ name, status, error });
    console.log(`[NotificationTest] ${name}: ${status}${error ? ' - ' + error : ''}`);
  };

  try {
    toast.info("Iniciando bateria de testes de notificações...");

    // 1. Teste de Inserção Direta (RPC)
    try {
      await notify({
        userId: user.id,
        title: "Teste: Inserção Direta",
        description: "Validando se o novo sistema de notificações está gravando corretamente.",
        category: "general"
      });
      addResult("RPC notify_user", "success");
    } catch (e: any) {
      addResult("RPC notify_user", "failure", e.message);
    }

    // 2. Teste de Menção
    try {
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
      if (profile?.display_name) {
        await handleMentions(`Olá @${profile.display_name}, este é um teste de menção.`, {
          title: "Teste de Menção Automatizado",
          link: "/dashboard",
          originType: "test",
          originId: "test-id"
        });
        addResult("Gatilho de Menção", "success");
      } else {
        addResult("Gatilho de Menção", "failure", "Perfil não possui display_name para teste.");
      }
    } catch (e: any) {
      addResult("Gatilho de Menção", "failure", e.message);
    }

    // 3. Teste de Comentário (Simulando o que o app faz)
    try {
      await notify({
        userId: user.id,
        title: "Novo comentário em Job",
        description: "Alguém comentou no Job #123",
        category: "comment",
        originType: "comment",
        originId: "test-comment-id"
      });
      addResult("Gatilho de Comentário", "success");
    } catch (e: any) {
      addResult("Gatilho de Comentário", "failure", e.message);
    }

    // 4. Teste de Atribuição
    try {
      await notify({
        userId: user.id,
        title: "Novo Job atribuído",
        description: "Você foi designado para o Job: Campanha Verão",
        category: "job",
        originType: "job",
        originId: "test-job-id"
      });
      addResult("Gatilho de Atribuição", "success");
    } catch (e: any) {
      addResult("Gatilho de Atribuição", "failure", e.message);
    }

    // 5. Teste de Status
    try {
      await notify({
        userId: user.id,
        title: "Status Alterado",
        description: "O Job #456 mudou para 'Em Aprovação'",
        category: "approval",
        originType: "job",
        originId: "test-job-id"
      });
      addResult("Gatilho de Mudança de Status", "success");
    } catch (e: any) {
      addResult("Gatilho de Mudança de Status", "failure", e.message);
    }

    // 6. Teste de Vencimento (Agenda)
    try {
      await notify({
        userId: user.id,
        title: "Prazo Próximo",
        description: "O Job #789 vence em 3 dias.",
        category: "agenda",
        originType: "job",
        originId: "test-job-id"
      });
      addResult("Gatilho de Vencimento", "success");
    } catch (e: any) {
      addResult("Gatilho de Vencimento", "failure", e.message);
    }

    // 7. Teste de Pagamento (Financeiro)
    try {
      await notify({
        userId: user.id,
        title: "Pagamento Confirmado",
        description: "Recebemos o pagamento da fatura #001",
        category: "finance",
        originType: "finance",
        originId: "test-fin-id"
      });
      addResult("Gatilho de Pagamento", "success");
    } catch (e: any) {
      addResult("Gatilho de Pagamento", "failure", e.message);
    }

    const failures = results.filter(r => r.status === 'failure');
    if (failures.length === 0) {
      toast.success("Todos os gatilhos de notificação foram acionados com sucesso! Verifique o sininho.");
    } else {
      toast.error(`${failures.length} testes falharam. Verifique o console.`);
    }

    return results;
  } catch (error: any) {
    console.error("Erro crítico no teste de notificações:", error);
    toast.error("Erro ao executar bateria de testes.");
  }
}
