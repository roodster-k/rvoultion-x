import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const STAFF_EMAIL = 'affolter.kb@gmail.com';

const TYPE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  message: { emoji: '💬', label: 'Nouveau message patient',  color: '#3b82f6' },
  photo:   { emoji: '📷', label: 'Nouvelle photo patient',   color: '#8b5cf6' },
  action:  { emoji: '✅', label: 'Action patient',           color: '#10b981' },
  delay:   { emoji: '⚠️', label: 'Délai détecté',           color: '#ef4444' },
};

serve(async (req) => {
  try {
    // Supabase Database Webhook sends { type, table, record, old_record, schema }
    const payload = await req.json();
    const record = payload.record ?? payload;

    if (!record?.id) {
      return new Response('No record', { status: 200 });
    }

    const cfg = TYPE_CONFIG[record.type] ?? { emoji: '📋', label: 'Activité', color: '#0f5f54' };
    const when = new Date(record.created_at).toLocaleString('fr-BE', {
      timeZone: 'Europe/Brussels',
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f8fafb;">
  <div style="background: white; border-radius: 16px; padding: 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.07);">

    <!-- Header -->
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #0f5f54;">
      <div style="width: 42px; height: 42px; background: linear-gradient(135deg, #0f5f54, #0d9488); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; color: white; flex-shrink: 0;">+</div>
      <div>
        <div style="font-family: Georgia, serif; color: #0f5f54; font-size: 18px; font-weight: 900; line-height: 1;">PostOp Tracker</div>
        <div style="color: #6b7280; font-size: 11px; margin-top: 2px;">Notification automatique</div>
      </div>
    </div>

    <!-- Alert badge -->
    <div style="display: inline-block; background: ${cfg.color}18; color: ${cfg.color}; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; margin-bottom: 14px;">
      ${cfg.emoji} ${cfg.label}
    </div>

    <!-- Title -->
    <h2 style="color: #111827; font-size: 18px; font-weight: 800; margin: 0 0 8px;">${record.title}</h2>

    ${record.message ? `
    <!-- Message -->
    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px; padding: 12px 16px; background: #f9fafb; border-left: 3px solid ${cfg.color}; border-radius: 6px;">
      ${record.message}
    </p>` : ''}

    <!-- Meta -->
    <div style="font-size: 12px; color: #9ca3af; margin-bottom: 20px;">
      🕐 ${when}
    </div>

    <!-- CTA -->
    <div style="text-align: center;">
      <a href="https://rvoultion-x.pages.dev" style="background: #0f5f54; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
        Voir dans PostOp Tracker →
      </a>
    </div>

    <!-- Footer -->
    <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0 14px;" />
    <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
      PostOp Tracker · Données hébergées en Europe · TLS 1.3
    </p>
  </div>
</div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PostOp Tracker <onboarding@resend.dev>',
        to: [STAFF_EMAIL],
        subject: `${cfg.emoji} ${record.title}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[notify-staff] Resend error:', err);
      return new Response(JSON.stringify({ error: err }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('[notify-staff] Exception:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
