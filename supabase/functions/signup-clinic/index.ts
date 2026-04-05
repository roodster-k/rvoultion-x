// supabase/functions/signup-clinic/index.ts
// Edge Function : Inscription Autonome d'une clinique (Phase 4 SaaS)
//
// POST /signup-clinic
// Body: { clinic_name, admin_name, email, password }
//

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper CORS Headers since Edge Functions require them explicitly
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { clinic_name, admin_name, email, password } = await req.json();

    if (!clinic_name || !email || !password || !admin_name) {
      return new Response(JSON.stringify({ error: 'Champs manquants. Tous les champs sont requis.' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 1. Initialise le client admin avec le Service Role de Supabase (Bypass RLS)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 2. Création de l'utilisateur Supabase Auth
    // NOTE: email_confirm: true outrepasse la confirmation par email (bien pour une démo/MVP)
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      // Possible "User already registered" error
      return new Response(JSON.stringify({ error: authError.message }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const authUid = authUser.user.id;

    // 3. Insertion du tenant dans 'clinics'
    const slug = clinic_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    // Pour s'assurer de l'unicité du slug très basiquement:
    const randomSuffix = Math.floor(Math.random() * 1000).toString();
    const finalSlug = `${slug}-${randomSuffix}`;

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
      // Rollback Auth user manually if clinic fails
      await adminClient.auth.admin.deleteUser(authUid);
      console.error('[signup-clinic] Clinic insert error:', clinicError);
      return new Response(JSON.stringify({ 
        error: 'Erreur lors de la création de la clinique en BDD.',
        details: clinicError.message,
        hint: clinicError.hint
      }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const clinicId = clinicInsert.id;

    // 4. Insertion de l'utilisateur soignant Admin dans 'users'
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
      
      console.error('[signup-clinic] Admin user profile insert error:', userProfileError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la création du profil administrateur.' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 5. Seeding the standard protocol templates for this new clinic (optional but great!)
    // For MVP we can just duplicate the global templates or just insert basic ones.
    // Let's insert a basic Mammaire template to help them start.
    const defaultTemplate = {
      clinic_id: clinicId,
      intervention_type: 'Augmentation Mammaire',
      name: 'Protocole Mammaire Standard',
      is_global: false,
      tasks: [
        { label: 'Retirer pansement', patient_can_check: true, jour_post_op_ref: 3 },
        { label: 'Envoyer photo cicatrice', patient_can_check: true, jour_post_op_ref: 7 },
        { label: 'Premier rdv de contrôle', patient_can_check: false, jour_post_op_ref: 14 }
      ]
    };

    await adminClient.from('protocol_templates').insert(defaultTemplate);

    return new Response(JSON.stringify({ success: true, clinic_id: clinicId }), { 
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('[signup-clinic] Unexpected error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne au serveur' }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})
