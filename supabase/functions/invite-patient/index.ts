// supabase/functions/invite-patient/index.ts
// Edge Function : Invitation d'un patient via magic link
//
// POST /invite-patient
// Body: { patient_id: uuid }
//
// Flow :
// 1. Vérifie que l'appelant est un soignant (JWT)
// 2. Récupère le patient et vérifie qu'il n'a pas encore de compte Auth
// 3. Génère un magic link via admin.auth.generateLink()
// 4. Met à jour patients.invited_at
// 5. Retourne le succès (l'email est envoyé par Supabase nativement)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ─── 1. Auth check: extract JWT and verify caller is staff ───
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header manquant' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a client with the user's JWT (respects RLS)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify the caller is a staff member
    const { data: { user: authUser }, error: authError } = await userClient.auth.getUser()
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check staff profile
    const { data: staffProfile, error: profileError } = await userClient
      .from('users')
      .select('id, clinic_id, role, full_name')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !staffProfile) {
      return new Response(
        JSON.stringify({ error: 'Accès réservé aux soignants' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── 2. Parse request body ───
    const { patient_id } = await req.json()

    if (!patient_id) {
      return new Response(
        JSON.stringify({ error: 'patient_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── 3. Fetch patient (via user client — RLS ensures same clinic) ───
    const { data: patient, error: patientError } = await userClient
      .from('patients')
      .select('id, full_name, email, auth_user_id, invited_at, clinic_id')
      .eq('id', patient_id)
      .single()

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ error: 'Patient introuvable ou accès refusé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!patient.email) {
      return new Response(
        JSON.stringify({ error: 'Le patient n\'a pas d\'adresse email configurée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (patient.auth_user_id) {
      return new Response(
        JSON.stringify({ error: 'Le patient a déjà un compte activé' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── 4. Generate magic link via admin client (service_role) ───
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Determine redirect URL
    const siteUrl = Deno.env.get('SITE_URL') || 'https://postoptracker.netlify.app'
    const redirectTo = `${siteUrl}/patient/activate`

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: patient.email,
      options: {
        redirectTo,
      },
    })

    if (linkError) {
      console.error('[invite-patient] generateLink error:', linkError)
      return new Response(
        JSON.stringify({ error: `Erreur lors de la génération du lien : ${linkError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const actionLink = linkData.properties?.action_link;

    // ─── 5. Call Resend API to send the email ───
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      const emailHtml = `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0d5f54;">Bonjour ${patient.full_name},</h2>
          <p>L'équipe médicale de votre clinique a activé votre suivi post-opératoire.</p>
          <p>Cliquez sur le bouton ci-dessous pour accéder à votre espace sécurisé :</p>
          <div style="margin: 30px 0;">
            <a href="${actionLink}" style="background-color: #0d5f54; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Activer mon espace</a>
          </div>
          <p style="color: #666; font-size: 12px;">Ou copiez ce lien : ${actionLink}</p>
        </div>
      `;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'PostOp Tracker <onboarding@resend.dev>', // Should be a verified domain in prod
            to: [patient.email],
            subject: 'Votre suivi post-opératoire',
            html: emailHtml
          })
        });

        if (!res.ok) {
          const resendError = await res.text();
          console.error('[invite-patient] Resend error:', resendError);
        }
      } catch (err) {
        console.error('[invite-patient] Fail to send with Resend:', err);
      }
    } else {
      console.warn('[invite-patient] No RESEND_API_KEY provided. Skipping actual email send. Link generated:', actionLink);
    }

    // ─── 6. Update patient invited_at ───
    const { error: updateError } = await adminClient
      .from('patients')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', patient_id)

    if (updateError) {
      console.error('[invite-patient] Update invited_at error:', updateError)
    }

    // ─── 7. Return success ───
    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation envoyée à ${patient.email}`,
        patient_name: patient.full_name,
        invited_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[invite-patient] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
