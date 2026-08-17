import { supabase } from './src/integrations/supabase/client';

async function test() {
  const startOfMonth = '2026-08-01T00:00:00Z';
  const endOfMonth = '2026-08-31T23:59:59Z';
  
  console.log('Testando query com JOIN em extra_demands...');
  const { data, error, count } = await supabase
    .from('transactions')
    .select('id, description, extra_demand_id, extra_demands(id, number_display, title)', { count: 'exact' })
    .gte('due_date', startOfMonth)
    .lte('due_date', endOfMonth);

  if (error) {
    console.error('Erro na query:', error);
  } else {
    console.log('Total de registros encontrados:', count);
    console.log('Primeiros 5 registros:', data?.slice(0, 5));
    
    const withDme = data?.filter(t => t.extra_demand_id).length;
    const withoutDme = data?.filter(t => !t.extra_demand_id).length;
    console.log('Com DME:', withDme);
    console.log('Sem DME:', withoutDme);
  }
}

test();
