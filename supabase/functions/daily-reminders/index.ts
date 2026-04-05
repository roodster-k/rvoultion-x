// supabase/functions/daily-reminders/index.ts
// Edge Function : Envoi des rappels quotidiens aux patients
//
// Appelé par un Cron (pg_cron) tous les matins.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    // 1. Initialise le client admin
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Today in YYYY-MM-DD format (UTC but can be fine-tuned to Brussels via offset)
    const todayStr = new Date().toISOString().split('T')[0];

    // 2. Fetch all tasks due today that are not done, and join their patient details
    // Only tasks that patient can check!
    const { data: tasks, error } = await adminClient
      .from('tasks')
      .select(`
        id, label, due_date, done, patient_can_check,
        patients!inner(id, full_name, email, clinic_id)
      `)
      .eq('due_date', todayStr)
      .eq('done', false)
      .eq('patient_can_check', true);

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: "Aucune tâche due pour les patients aujourd'hui." }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // 3. Group by patient
    const patientsMap = new Map();
    for (const task of tasks) {
      const p = task.patients;
      // patients is an array? No, relation is singular for a task since it references a patient_id
      if (!p.email) continue;
      
      if (!patientsMap.has(p.id)) {
        patientsMap.set(p.id, {
          email: p.email,
          fullName: p.full_name,
          tasks: []
        });
      }
      patientsMap.get(p.id).tasks.push(task.label);
    }

    // 4. Send emails via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let emailsSent = 0;

    for (const [patientId, patientData] of patientsMap) {
      const siteUrl = Deno.env.get('SITE_URL') || 'https://postoptracker.netlify.app';
      
      const emailHtml = `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0d5f54;">Bonjour ${patientData.fullName.split(' ')[0]},</h2>
          <p>Vous avez des actions à réaliser aujourd'hui dans le cadre de votre suivi post-opératoire :</p>
          <ul style="background: #f8fafc; padding: 20px; border-radius: 8px; list-style-position: inside;">
            ${patientData.tasks.map((t: string) => `<li><strong>${t}</strong></li>`).join('')}
          </ul>
          <p>N'oubliez pas d'évaluer également votre niveau de douleur du jour.</p>
          <div style="margin: 30px 0;">
            <a href="${siteUrl}/patient/activate" style="background-color: #0d5f54; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Accéder à mon espace</a>
          </div>
        </div>
      `;

      if (resendApiKey) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
              from: 'PostOp Tracker <reminders@resend.dev>', // Should be a verified domain in prod
              to: [patientData.email],
              subject: 'Action requise : Votre suivi post-opératoire aujourd\'hui',
              html: emailHtml
            })
          });

          if (res.ok) {
            emailsSent++;
          } else {
            console.error(`Failed to send to ${patientData.email}:`, await res.text());
          }
        } catch (e) {
          console.error(`Error sending email to ${patientData.email}:`, e);
        }
      } else {
        console.warn(`[daily-reminders] No RESEND_API_KEY. Would have mailed ${patientData.email} with ${patientData.tasks.length} tasks.`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      patientsProcessed: patientsMap.size,
      emailsSent
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[daily-reminders] Error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
