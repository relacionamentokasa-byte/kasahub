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

    const { userId } = await req.json()
    if (!userId) throw new Error('userId is required')

    // 1. Get profile and preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 2. Insert into notifications table (Internal)
    await supabase.from('notifications').insert({
      user_id: userId,
      title: "Teste de Notificação KASA HUB",
      description: "Este é um disparo de teste para validar seus canais de comunicação.",
      type: "info",
      category: "general"
    })

    // 3. Logic for External Channels (Simulated for Demo)
    const channels = []
    if (prefs?.email_enabled) channels.push('Email')
    if (prefs?.whatsapp_enabled && profile?.phone) channels.push('WhatsApp')
    if (prefs?.push_enabled) channels.push('Push Mobile')

    console.log(`Sending test notification to ${userId} via: ${channels.join(', ')}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notifications triggered",
        activeChannels: channels 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})