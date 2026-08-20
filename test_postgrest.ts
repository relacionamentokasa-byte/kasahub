import { supabase } from "./src/integrations/supabase/client";

async function test() {
  try {
    // 1. Verificar se a query base sem filtros retorna dados
    const { count: totalCount, error: errTotal } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true });
    
    console.log("Total transactions in DB:", totalCount, errTotal || "");

    // 2. Simular o filtro de exclusão
    // Usamos um UUID falso para garantir que o array não esteja vazio no teste
    const suspendedIds = ["00000000-0000-0000-0000-000000000000"]; 
    const idsString = suspendedIds.map(id => `"${id}"`).join(',');
    
    const { data, count, error } = await supabase
      .from("transactions")
      .select("id, status, client_id", { count: "exact" })
      .or(`client_id.is.null,client_id.not.in.(${idsString}),status.eq.paid`)
      .range(0, 4);

    if (error) {
      console.error("PostgREST Error:", error.message, error.details, error.hint);
    } else {
      console.log("Success!");
      console.log("Count with filter:", count);
      console.log("Returned rows:", data?.length);
    }
  } catch (e) {
    console.error("Script failed:", e);
  }
}

test();
