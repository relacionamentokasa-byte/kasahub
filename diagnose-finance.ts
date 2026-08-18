import { supabase } from './src/integrations/supabase/client';

async function diagnose() {
  const { data, error } = await supabase
    .from('transactions')
    .select('number_display, description, amount, valor_previsto, valor_real, status')
    .gt('amount', 0)
    .or('valor_previsto.is.null,valor_previsto.eq.0');

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  const totalCount = data.length;
  const totalAmount = data.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const countNull = data.filter(t => t.valor_previsto === null).length;
  const countZero = data.filter(t => t.valor_previsto === 0 || t.valor_previsto === '0').length;

  console.log('--- DIAGNÓSTICO FINANCEIRO ---');
  console.log(`Total de registros elegíveis: ${totalCount}`);
  console.log(`Soma total de amount: R$ ${totalAmount.toFixed(2)}`);
  console.log(`Quantidade com valor_previsto NULL: ${countNull}`);
  console.log(`Quantidade com valor_previsto = 0: ${countZero}`);
  console.log('\n--- EXEMPLOS (Top 10) ---');
  console.table(data.slice(0, 10));
}

diagnose();
