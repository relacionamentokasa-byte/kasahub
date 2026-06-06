import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`Sync function triggered: ${req.method}`);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Initializing Supabase client...");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    console.log("Getting user from token...");
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      console.error("User error:", userError);
      throw new Error('Invalid token');
    }
    console.log(`User authenticated: ${user.id}`);

    const body = await req.json()
    console.log("Request body:", JSON.stringify(body));
    const { action, eventData, googleEventId } = body

    const googleApiKey = Deno.env.get('GOOGLE_CALENDAR_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!googleApiKey || !lovableApiKey) {
      throw new Error("Conexão Google Calendar não configurada (faltando GOOGLE_CALENDAR_API_KEY ou LOVABLE_API_KEY).");
    }

    const gatewayHeaders = {
      "Authorization": `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": googleApiKey,
    };

    let resultCount = 0;

    // 1. PULL: Google -> KASA
    if (action === "sync-all" || action === "pull") {
      console.log("Action: Pulling from Google...");
      const response = await fetch("https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events", {
        headers: gatewayHeaders,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google API Error: ${errorText}`);
        throw new Error(`Erro Google: ${errorText}`);
      }

      const googleData = await response.json();
      const googleEvents = googleData.items || [];
      console.log(`Found ${googleEvents.length} events in Google Calendar`);

      for (const gEvent of googleEvents) {
        if (gEvent.status === 'cancelled') continue;

        const startsAt = gEvent.start.dateTime || gEvent.start.date;
        const endsAt = gEvent.end.dateTime || gEvent.end.date;

        const { data: existing } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('google_event_id', gEvent.id)
          .maybeSingle();

        const payload = {
          title: gEvent.summary || "(Sem título)",
          description: gEvent.description || null,
          starts_at: startsAt,
          ends_at: endsAt,
          google_event_id: gEvent.id,
          source: "google",
          created_by: user.id,
          kind: "meeting",
          all_day: !gEvent.start.dateTime
        };

        if (existing) {
          console.log(`Updating existing event: ${existing.id}`);
          const { error: updateError } = await supabase.from('calendar_events').update(payload).eq('id', existing.id);
          if (updateError) console.error("Update error:", updateError);
          else resultCount++;
        } else {
          console.log(`Inserting new event from Google: ${gEvent.id}`);
          const { error: insertError } = await supabase.from('calendar_events').insert(payload);
          if (insertError) console.error("Insert error:", insertError);
          else resultCount++;
        }
      }

      // Update last_pulled_at
      await supabase.from('google_calendar_connections')
        .update({ last_pulled_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }

    // 2. PUSH: KASA -> Google (Create or Update)
    if (action === "push-event" && eventData) {
      console.log(`Action: Pushing event to Google: ${eventData.id}`);
      const gPayload = {
        summary: eventData.title,
        description: eventData.description,
        start: { dateTime: eventData.starts_at },
        end: { dateTime: eventData.ends_at || new Date(new Date(eventData.starts_at).getTime() + 3600000).toISOString() }
      };

      const method = eventData.google_event_id ? "PUT" : "POST";
      const url = eventData.google_event_id 
        ? `https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events/${eventData.google_event_id}`
        : `https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events`;

      const response = await fetch(url, {
        method,
        headers: {
          ...gatewayHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gPayload)
      });

      if (response.ok) {
        const created = await response.json();
        await supabase.from('calendar_events')
          .update({ google_event_id: created.id, last_synced_at: new Date().toISOString() })
          .eq('id', eventData.id);
        resultCount = 1;
      } else {
        const errorText = await response.text();
        console.error(`Push error: ${errorText}`);
        throw new Error(`Erro ao enviar para Google: ${errorText}`);
      }
    }

    // 3. DELETE: KASA -> Google
    if (action === "delete-event" && googleEventId) {
      console.log(`Action: Deleting event from Google: ${googleEventId}`);
      const response = await fetch(`https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: "DELETE",
        headers: gatewayHeaders,
      });
      if (response.ok) resultCount = 1;
    }

    return new Response(JSON.stringify({ success: true, count: resultCount }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})