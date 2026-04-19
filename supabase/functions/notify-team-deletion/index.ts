import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { patient_name, deleted_by_name, deleted_by_email, clinic_id } = await req.json()

    if (!patient_name || !clinic_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch all active staff in the clinic except the deleter
    const { data: staffMembers, error } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('clinic_id', clinic_id)
      .neq('email', deleted_by_email ?? '')

    if (error) throw error
    if (!staffMembers?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const deletedByLabel = deleted_by_name && deleted_by_email
      ? `${deleted_by_name} (${deleted_by_email})`
      : deleted_by_email ?? 'Un membre de l\'équipe'

    const emailPromises = staffMembers.map(staff =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PostOp Tracker <onboarding@resend.dev>',
          to: [staff.email],
          subject: `Dossier patient supprimé — ${patient_name}`,
          html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <div style="background:#0f5f54;color:white;padding:20px 24px;border-radius:12px 12px 0 0">
    <h2 style="margin:0;font-size:18px;font-weight:700">🗑️ Dossier patient supprimé</h2>
  </div>
  <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
    <p style="margin:0 0 16px;font-size:15px">Bonjour ${staff.full_name},</p>
    <p style="margin:0 0 20px;font-size:15px">
      Le dossier du patient <strong>${patient_name}</strong> a été définitivement supprimé de la plateforme PostOp Tracker.
    </p>
    <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Supprimé par</p>
      <p style="margin:0;font-size:15px;font-weight:600">${deletedByLabel}</p>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin:0">
      Cet email a été envoyé automatiquement par PostOp Tracker suite à la suppression d'un dossier patient.
    </p>
  </div>
</div>`,
        }),
      }).then(r => r.json())
    )

    const results = await Promise.allSettled(emailPromises)
    const sent = results.filter(r => r.status === 'fulfilled').length

    return new Response(JSON.stringify({ ok: true, sent, total: staffMembers.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[notify-team-deletion]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
