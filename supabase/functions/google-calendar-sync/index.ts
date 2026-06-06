import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) throw new Error('Invalid token')

    const body = await req.json()
    const { action, eventData } = body

    const googleApiKey = Deno.env.get('GOOGLE_CALENDAR_API_KEY');
    const isConfigured = !!googleApiKey;

    // 1. Sincronizar do Google para o KASA (Pull)
    if (action === "sync-all" || action === "pull") {
      if (!isConfigured) {
        throw new Error("GOOGLE_CALENDAR_API_KEY não configurada no Lovable Gateway.");
      }

      // Buscar eventos do Google via Gateway
      const response = await fetch("https://gateway.lovable.app/google-calendar/v3/calendars/primary/events", {
        headers: {
          "Authorization": `Bearer ${googleApiKey}`
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro ao buscar eventos do Google: ${errText}`);
      }

      const googleData = await response.json();
      const googleEvents = googleData.items || [];

      for (const gEvent of googleEvents) {
        if (gEvent.status === 'cancelled') continue;

        const startsAt = gEvent.start.dateTime || gEvent.start.date;
        const endsAt = gEvent.end.dateTime || gEvent.end.date;

        // Upsert no calendar_events
        const { data: existing } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('google_event_id', gEvent.id)
          .maybeSingle();

        const eventPayload = {
          title: gEvent.summary || "(Sem título)",
          description: gEvent.description || null,
          starts_at: startsAt,
          ends_at: endsAt,
          google_event_id: gEvent.id,
          source: "google",
          user_id: user.id,
          kind: "meeting",
          all_day: !gEvent.start.dateTime
        };

        if (existing) {
          await supabase.from('calendar_events').update(eventPayload).eq('id', existing.id);
        } else {
          await supabase.from('calendar_events').insert(eventPayload);
        }
      }

      await supabase
        .from('google_calendar_connections')
        .update({ last_pulled_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }

    // 2. Sincronizar do KASA para o Google (Push)
    if (action === "push-event" && eventData) {
      if (!isConfigured) return new Response(JSON.stringify({ success: true, warning: "Offline mode" }), { headers: corsHeaders });

      const gPayload = {
        summary: eventData.title,
        description: eventData.description,
        start: { dateTime: eventData.starts_at },
        end: { dateTime: eventData.ends_at || new Date(new Date(eventData.starts_at).getTime() + 3600000).toISOString() }
      };

      const method = eventData.google_event_id ? "PUT" : "POST";
      const url = eventData.google_event_id 
        ? `https://gateway.lovable.app/google-calendar/v3/calendars/primary/events/${eventData.google_event_id}`
        : `https://gateway.lovable.app/google-calendar/v3/calendars/primary/events`;

      const response = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${googleApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(gPayload)
      });

      if (response.ok) {
        const created = await response.json();
        await supabase.from('calendar_events')
          .update({ google_event_id: created.id, source: 'system', last_synced_at: new Date().toISOString() })
          .eq('id', eventData.id);
      }
    }

    return new Response(
      JSON.stringify({ message: "Operação concluída", success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})