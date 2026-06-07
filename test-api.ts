
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function test() {
  try {
    console.log("Testing supabaseAdmin...");
    const { data, error } = await supabaseAdmin.from('proposals').select('*').limit(1);
    if (error) {
      console.error("Supabase error:", error);
    } else {
      console.log("Success! Found", data?.length, "proposals");
    }
  } catch (e) {
    console.error("Catastrophic error:", e);
  }
}

test();
