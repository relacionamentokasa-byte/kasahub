import { supabase } from "./src/integrations/supabase/client";

async function test() {
  const { data: suspendedClients, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("financial_collection_status", "suspended");
  
  if (error) {
    console.error("Error fetching suspended clients:", error);
    return;
  }
  
  console.log("Suspended clients count:", suspendedClients?.length);
  const suspendedIds = suspendedClients?.map(c => c.id) || [];
  console.log("Suspended IDs:", suspendedIds);

  if (suspendedIds.length > 0) {
    const idsString = suspendedIds.map(id => `"${id}"`).join(',');
    const filter = `client_id.is.null,client_id.not.in.(${idsString}),status.eq.paid`;
    console.log("Constructed filter:", filter);
    
    const { count, error: qError } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .or(filter);
    
    if (qError) {
      console.error("Query error:", qError);
    } else {
      console.log("Total eligible records count:", count);
    }
  } else {
    console.log("No suspended clients, no filter needed.");
  }
}

test();
