import { supabase } from "@/integrations/supabase/client";

export async function checkDailyNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10);
  
  // 1. Jobs vencendo hoje
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, assignee_id')
    .eq('due_date', today)
    .is('done_at', null);

  if (jobs) {
    for (const job of jobs) {
      if (job.assignee_id) {
        await supabase.rpc('notify_user', {
          p_user_id: job.assignee_id,
          p_title: "Job vence hoje",
          p_description: `Entrega pendente: ${job.title}`,
          p_category: 'job',
          p_origin_type: 'jobs',
          p_origin_id: job.id,
          p_link: '/jobs'
        } as any);
      }
    }
  }

  // 2. Cobranças vencendo hoje
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, description, amount')
    .eq('due_date', today)
    .eq('kind', 'income')
    .eq('status', 'pending');

  if (txs) {
    // Notificar administradores? 
    // Para simplificar, vamos assumir que o owner_id da transação deve ser notificado
    const { data: admins } = await supabase.from('user_roles').select('user_id').in('role', ['admin', 'ceo', 'gestor']);
    
    if (admins) {
      for (const tx of txs) {
        for (const admin of admins) {
          await supabase.rpc('notify_user', {
            p_user_id: admin.user_id,
            p_title: "Cobrança vence hoje",
            p_description: `Valor: R$ ${tx.amount} - ${tx.description}`,
            p_category: 'finance',
            p_origin_type: 'transactions',
            p_origin_id: tx.id,
            p_link: '/financeiro'
          } as any);
        }
      }
    }
  }
}
