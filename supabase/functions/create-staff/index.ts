// supabase/functions/create-staff/index.ts
// Edge Function : Création d'un soignant par un administrateur
//
// POST /create-staff
// Body: { email, full_name, role, phone }
//
// Flow :
// 1. Vérifie que l'appelant est un clinic_admin ou super_admin
// 2. Crée un compte soignant dans auth.users générant un mot de passe temporaire ou en envoyant une invitation
// 3. Insère le profil dans la table `users` avec le clinic_id de l'admin
// 4. Retourne le succès

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ─── 1. Auth check: extract JWT and verify caller is admin ───
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

    // Verify the caller is authenticated
    const { data: { user: authUser }, error: authError } = await userClient.auth.getUser()
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check staff profile and role
    const { data: staffProfile, error: profileError } = await userClient
      .from('users')
      .select('id, clinic_id, role, full_name, is_active')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !staffProfile) {
      return new Response(
        JSON.stringify({ error: 'Accès réservé aux soignants' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['clinic_admin', 'super_admin'].includes(staffProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Droits d\'administration requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── 2. Parse request body ───
    const { email, full_name, role, phone } = await req.json()

    if (!email || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Champs requis manquants: email, full_name, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Valider le rôle
    if (!['clinic_admin', 'surgeon', 'nurse'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Rôle invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ─── 3. Generate invitation via admin client (service_role) ───
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Ensure clinic exists and we use the admin's clinic_id unless it's super_admin specifying another clinic
    const clinicId = staffProfile.clinic_id;

    // Use inviteUserByEmail instead of generating a password
    // This sends an email allowing the user to set their password
    const siteUrl = Deno.env.get('SITE_URL') || 'https://postoptracker.netlify.app'
    const redirectTo = `${siteUrl}/dashboard`

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        name: full_name
      },
      redirectTo
    })

    if (inviteError) {
      console.error('[create-staff] inviteUserByEmail error:', inviteError)
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création du compte : ${inviteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newAuthUserId = inviteData.user.id

    // ─── 4. Insert profile in users table ───
    const { error: insertError } = await adminClient
      .from('users')
      .insert({
        auth_user_id: newAuthUserId,
        clinic_id: clinicId,
        full_name,
        role,
        email,
        phone: phone || null,
        is_active: true
      })

    if (insertError) {
      console.error('[create-staff] Error inserting user profile:', insertError)
      
      // Cleanup the auth user since profile creation failed
      await adminClient.auth.admin.deleteUser(newAuthUserId)
      
      return new Response(
        JSON.stringify({ error: `Erreur lors de l'enregistrement du profil: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation envoyée à ${email}`,
        user: {
          id: newAuthUserId,
          email,
          full_name,
          role
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[create-staff] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
