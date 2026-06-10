
import { supabase } from "@/integrations/supabase/client";
import { notify } from "./notifications-api";
import { brl } from "./finance-api";

/**
 * Checks for overdue and upcoming transactions and notifies administrators.
 * This should be called from a background process or a scheduled task.
 * For this implementation, we provide it as a function that can be triggered.
 */
export async function checkDailyNotifications() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  
  const in3Days = new Date();
  in3Days.setDate(now.getDate() + 3);
  const in3DaysStr = in3Days.toISOString().slice(0, 10);

  // 1. Get upcoming in 3 days
  const { data: upcoming } = await supabase
    .from('transactions')
    .select('*')
    .eq('status', 'pending')
    .eq('due_date', in3DaysStr);

  // 2. Get overdue (exactly 1 day overdue to avoid spamming every day, or implement a last_notified logic)
  // For simplicity here, we'll notify for those due yesterday.
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  
  const { data: overdue } = await supabase
    .from('transactions')
    .select('*')
    .eq('status', 'pending')
    .eq('due_date', yesterdayStr);

  if ((upcoming && upcoming.length > 0) || (overdue && overdue.length > 0)) {
    const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    const adminIds = adminRoles?.map(r => r.user_id).filter(Boolean) || [];

    if (adminIds.length > 0) {
      // Upcoming
      for (const tx of (upcoming || [])) {
        for (const adminId of adminIds) {
          await notify({
            userId: adminId!,
            title: "Lançamento Vencendo",
            description: `Lançamento ${tx.description} vence em 3 dias`,
            category: 'finance',
            originType: 'transactions',
            originId: tx.id,
            link: '/financeiro'
          });
        }
      }

      // Overdue
      for (const tx of (overdue || [])) {
        for (const adminId of adminIds) {
          await notify({
            userId: adminId!,
            title: "Lançamento Vencido",
            description: `Lançamento ${tx.description} está vencido`,
            category: 'finance',
            originType: 'transactions',
            originId: tx.id,
            link: '/financeiro'
          });
        }
      }
    }
  }
}
