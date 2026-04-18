import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, User, Mail, Palette, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const COLORS = [
  { hex: '#0f5f54', label: 'Vert PostOp' },
  { hex: '#185FA5', label: 'Bleu médical' },
  { hex: '#6D28D9', label: 'Violet' },
  { hex: '#B45309', label: 'Ambre' },
  { hex: '#0F766E', label: 'Teal' },
  { hex: '#BE185D', label: 'Rose' },
  { hex: '#1D4ED8', label: 'Bleu royal' },
  { hex: '#065F46', label: 'Vert foncé' },
];

export default function CreateClinicModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1); // 1=form, 2=success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    clinic_name: '',
    admin_name: '',
    admin_email: '',
    primary_color: '#0f5f54',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.clinic_name.trim() || !form.admin_name.trim() || !form.admin_email.trim()) {
      setError('Tous les champs sont requis.');
      return;
    }

    setLoading(true);
    try {
      // ─── 1. Créer la clinique ───
      const slug = form.clinic_name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'clinique';
      const finalSlug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: form.clinic_name.trim(),
          slug: finalSlug,
          primary_color: form.primary_color,
          email: form.admin_email.trim().toLowerCase(),
        })
        .select('id')
        .single();

      if (clinicError) throw new Error(`Clinique : ${clinicError.message}`);
      const clinicId = clinicData.id;

      // ─── 2. Envoyer magic link à l'admin via signInWithOtp ───
      // Les métadonnées sont lues par StaffActivation.jsx (URL params + fallback metadata)
      const redirectTo = `${window.location.origin}/staff/activate`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: form.admin_email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: form.admin_name.trim(),
            role: 'clinic_admin',
            clinic_id: clinicId,
          },
        },
      });

      if (otpError) {
        // Rollback clinique si OTP échoue
        await supabase.from('clinics').delete().eq('id', clinicId);
        throw new Error(`Email : ${otpError.message}`);
      }

      setStep(2);
      onCreated?.();

    } catch (err) {
      console.error('[CreateClinicModal]', err);
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-[24px] shadow-2xl w-full max-w-[480px] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center">
              <Building2 size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-text-dark text-[16px]">Nouvelle clinique</h2>
              <p className="text-[12px] text-text-muted font-medium">Accès opéré — Option B</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-dark bg-transparent border-none cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">

            {/* ─── Step 1: Formulaire ─── */}
            {step === 1 && (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
              >
                {/* Nom de la clinique */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Nom de la clinique
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.clinic_name}
                      onChange={e => set('clinic_name', e.target.value)}
                      placeholder="Ex: Clinique Esthétique Churchill"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Nom de l'admin */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Nom de l'administrateur
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.admin_name}
                      onChange={e => set('admin_name', e.target.value)}
                      placeholder="Ex: Dr. Sarah Martin"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Email de l'admin */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Email de l'administrateur
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={form.admin_email}
                      onChange={e => set('admin_email', e.target.value)}
                      placeholder="admin@clinique.be"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[11px] text-text-muted mt-1 font-medium">
                    Un lien d'activation sera envoyé à cette adresse.
                  </p>
                </div>

                {/* Couleur primaire */}
                <div>
                  <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <Palette size={13} /> Couleur de la clinique
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.label}
                        onClick={() => set('primary_color', c.hex)}
                        className="w-8 h-8 rounded-lg border-2 transition-all cursor-pointer"
                        style={{
                          background: c.hex,
                          borderColor: form.primary_color === c.hex ? '#111' : 'transparent',
                          transform: form.primary_color === c.hex ? 'scale(1.15)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-6 h-6 rounded-md border border-border" style={{ background: form.primary_color }} />
                    <input
                      type="text"
                      value={form.primary_color}
                      onChange={e => set('primary_color', e.target.value)}
                      placeholder="#0f5f54"
                      className="text-[12px] font-mono border border-border rounded-lg px-2 py-1 w-24 outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-[13px] font-semibold p-3 rounded-xl">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm text-text-muted hover:text-text-dark border border-border bg-white cursor-pointer transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white border-none rounded-xl font-bold text-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-button transition-colors"
                  >
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Création en cours…</>
                    ) : (
                      'Créer la clinique'
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {/* ─── Step 2: Succès ─── */}
            {step === 2 && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-emerald-600" />
                </div>
                <h3 className="font-serif text-[20px] font-bold text-text-dark mb-2">Clinique créée !</h3>
                <p className="text-text-muted text-[14px] font-medium leading-relaxed mb-1">
                  <strong className="text-text-dark">{form.clinic_name}</strong> est enregistrée.
                </p>
                <p className="text-text-muted text-[13px] mb-6">
                  Un lien d'activation a été envoyé à <strong className="text-text-dark">{form.admin_email}</strong>.<br />
                  L'admin recevra son accès dans quelques instants.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-primary hover:bg-primary-dark text-white border-none rounded-xl font-bold cursor-pointer transition-colors shadow-button"
                >
                  Fermer
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
