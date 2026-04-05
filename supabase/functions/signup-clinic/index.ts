// supabase/functions/signup-clinic/index.ts
// Edge Function : Inscription Autonome d'une clinique (Phase 4 SaaS)
//
// POST /signup-clinic
// Body: { clinic_name, admin_name, email, password }
//

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('[Edge Function] Missing Supabase environment variables on server.');
    }

    const { clinic_name, admin_name, email, password } = await req.json();

    if (!clinic_name || !email || !password || !admin_name) {
      return new Response(JSON.stringify({ error: 'Champs manquants. Tous les champs sont requis.' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 2. Initialise le client admin avec le Service Role (Bypass RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log(`[signup-clinic] Processing signup for ${email} / Clinic: ${clinic_name}`);

    // 3. Création de l'utilisateur Supabase Auth
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: admin_name }
    });

    if (authError) {
      console.error('[signup-clinic] Auth error:', authError.message);
      return new Response(JSON.stringify({ error: `Erreur d'authentification : ${authError.message}` }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const authUid = authUser.user.id;

    // 4. Insertion du tenant dans 'clinics'
    const slug = clinic_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'clinique';
    const finalSlug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: clinicInsert, error: clinicError } = await adminClient
      .from('clinics')
      .insert({
        name: clinic_name,
        slug: finalSlug,
        primary_color: '#0f5f54', // default theme
        email: email
      })
      .select('id')
      .single();

    if (clinicError) {
      // Rollback Auth user
      await adminClient.auth.admin.deleteUser(authUid);
      console.error('[signup-clinic] Database clinic error:', clinicError.message, clinicError.details);
      return new Response(JSON.stringify({ 
        error: 'Échec de création de la clinique en base de données.', 
        details: clinicError.message,
        hint: clinicError.hint 
      }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const clinicId = clinicInsert.id;

    // 5. Insertion de l'utilisateur soignant Admin dans 'users'
    const { error: userProfileError } = await adminClient
      .from('users')
      .insert({
        auth_user_id: authUid,
        clinic_id: clinicId,
        full_name: admin_name,
        email: email,
        role: 'clinic_admin'
      });

    if (userProfileError) {
      // Rollbacks
      await adminClient.from('clinics').delete().eq('id', clinicId);
      await adminClient.auth.admin.deleteUser(authUid);
      
      console.error('[signup-clinic] Database profile error:', userProfileError.message);
      return new Response(JSON.stringify({ 
        error: 'Échec de création du profil administrateur.',
        details: userProfileError.message 
      }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 6. Seeding d'un protocole par défaut
    try {
      await adminClient.from('protocol_templates').insert({
        clinic_id: clinicId,
        intervention_type: 'Augmentation Mammaire',
        name: 'Protocole Post-Op Standard',
        is_global: false,
        tasks: [
          { label: 'Repos strict', patient_can_check: true, jour_post_op_ref: 1 },
          { label: 'Surveillance température', patient_can_check: true, jour_post_op_ref: 2 },
          { label: 'Retrait des pansements', patient_can_check: false, jour_post_op_ref: 5 }
        ]
      });
    } catch (seedErr) {
      console.warn('[signup-clinic] Seed protocol failed, skipping silently:', seedErr);
    }

    return new Response(JSON.stringify({ success: true, clinic_id: clinicId }), { 
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('[signup-clinic] Unexpected internal error:', err)
    return new Response(JSON.stringify({ error: `Erreur interne : ${err.message}` }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})
