
import { supabase } from './src/integrations/supabase/client';
async function check() {
  const { data, error } = await supabase.from('clients').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data && data.length > 0 ? Object.keys(data[0]) : "No data"));
  }
}
check();
