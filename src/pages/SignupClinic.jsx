import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Mail, Lock, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * SignupClinic — Self-service clinic onboarding.
 * 
 * Flow (client-side, no Edge Function required):
 * 1. supabase.auth.signUp() — creates auth user
 * 2. If session returned (email confirm disabled) → proceed
 * 3. Insert clinic into `clinics` table
 * 4. Insert admin profile into `users` table
 * 5. Seed a default protocol template
 * 6. refreshProfile() → AuthContext picks up the new profile
 * 7. Auto-redirect to /dashboard via App.jsx routing
 * 
 * If email confirmation is enabled in Supabase settings,
 * the user sees a "check your email" message instead.
 */
export default function SignupClinic() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const [formData, setFormData] = useState({
    clinic_name: '',
    admin_name: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ─── Step 1: Create auth user via signUp ───
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.admin_name }
        }
      });

      if (signUpError) {
        // Common errors
        if (signUpError.message?.includes('already registered')) {
          throw new Error('Un compte existe déjà avec cette adresse email. Essayez de vous connecter.');
        }
        throw new Error(signUpError.message);
      }

      // ─── Step 2: Check if we have a session (email confirm disabled) ───
      if (!signUpData.session) {
        // Email confirmation is required by the Supabase project.
        // We can't proceed with clinic creation until the user confirms.
        // BUT — let's try signInWithPassword as a fallback (some configs auto-confirm)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError || !signInData.session) {
          // Email confirmation is truly required
          setNeedsEmailConfirm(true);
          setSuccess(true);
          setStep(3);
          return;
        }
        // If signIn worked, we have a session — continue
      }

      // ─── Step 3: Create the clinic ───
      const slug = formData.clinic_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || 'clinique';
      const finalSlug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: formData.clinic_name,
          slug: finalSlug,
          primary_color: '#0f5f54',
          email: formData.email
        })
        .select('id')
        .single();

      if (clinicError) {
        console.error('[Signup] Clinic creation error:', clinicError);
        throw new Error(
          `Erreur lors de la création de la clinique: ${clinicError.message}` +
          (clinicError.hint ? ` (${clinicError.hint})` : '')
        );
      }

      const clinicId = clinicData.id;
      const authUserId = signUpData.user.id;

      // ─── Step 4: Create admin user profile ───
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUserId,
          clinic_id: clinicId,
          full_name: formData.admin_name,
          email: formData.email,
          role: 'clinic_admin',
          is_active: true
        });

      if (profileError) {
        console.error('[Signup] Profile creation error:', profileError);
        // Try to clean up the clinic we just created
        await supabase.from('clinics').delete().eq('id', clinicId);
        throw new Error(`Erreur lors de la création du profil: ${profileError.message}`);
      }

      // ─── Step 5: Seed a default protocol template (non-blocking) ───
      try {
        await supabase.from('protocol_templates').insert({
          clinic_id: clinicId,
          intervention_type: 'Augmentation Mammaire',
          name: 'Protocole Post-Op Standard',
          is_global: false,
          tasks: [
            { label: 'Repos strict — éviter les efforts', patient_can_check: true, jour_post_op_ref: 1, sort_order: 1 },
            { label: 'Surveillance température (matin et soir)', patient_can_check: true, jour_post_op_ref: 1, sort_order: 2 },
            { label: 'Retrait du pansement compressif', patient_can_check: false, jour_post_op_ref: 2, sort_order: 3 },
            { label: 'Premier shampoing autorisé', patient_can_check: true, jour_post_op_ref: 3, sort_order: 4 },
            { label: 'Reprise de la conduite', patient_can_check: true, jour_post_op_ref: 7, sort_order: 5 },
            { label: 'Consultation de suivi — retrait fils', patient_can_check: false, jour_post_op_ref: 14, sort_order: 6 },
            { label: 'Reprise sport (bas du corps)', patient_can_check: true, jour_post_op_ref: 21, sort_order: 7 },
            { label: 'Reprise sport complète', patient_can_check: true, jour_post_op_ref: 45, sort_order: 8 }
          ]
        });
      } catch (seedErr) {
        console.warn('[Signup] Protocol seed failed (non-critical):', seedErr);
      }

      // ─── Step 6: Refresh AuthContext to pick up the new profile ───
      await refreshProfile();

      // ─── Step 7: Success! ───
      setSuccess(true);
      setStep(3);

      // Auto-redirect after a brief delay
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);

    } catch (err) {
      console.error('[Signup] Error:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-main flex flex-col md:flex-row">
      {/* Left side - Branding */}
      <div className="hidden md:flex w-full md:w-[45%] bg-primary p-12 text-white flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent"></div>
        
        <div className="relative z-10">
          <div className="text-[28px] font-black font-serif flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-[14px] bg-white text-primary flex items-center justify-center text-2xl shadow-lg">
              +
            </div>
            PostOp Tracker
          </div>
          
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-[1.15] mb-6">
            Digitalisez votre suivi médical.
          </h1>
          <p className="text-primary-light text-lg mb-12 max-w-md leading-relaxed">
            Offrez une expérience premium à vos patients. Automatisez vos rappels, réduisez vos appels téléphoniques et suivez leurs constants vitales en temps réel.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm font-medium text-primary-light">
          Déjà un compte ? 
          <Link to="/login" className="text-white font-bold hover:underline">Se connecter</Link>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-[440px]">
          
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-2xl font-black text-text-dark font-serif mb-2">Inscription Clinique</h2>
            <p className="text-text-muted font-medium text-sm">Créez votre espace clinique en moins de 2 minutes.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-status-complication-bg text-status-complication p-4 rounded-xl text-sm font-bold mb-6 border border-red-200"
            >
              {error}
            </motion.div>
          )}

          {/* ─── Step 1: Clinic Name ─── */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-text-dark mb-2">Nom de votre Clinique</label>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                    <input 
                      type="text" name="clinic_name" value={formData.clinic_name} onChange={handleChange}
                      placeholder="Ex: Clinique Esthétique Churchill"
                      className="w-full bg-white border border-border rounded-xl px-11 py-3.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-sans text-[15px]" 
                    />
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setError('');
                    if (formData.clinic_name.trim().length > 2) {
                      setStep(2);
                    } else {
                      setError('Veuillez entrer un nom valide (3 caractères minimum).');
                    }
                  }}
                  className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 shadow-button transition-all mt-8 cursor-pointer border-none"
                >
                  Continuer <ArrowRight size={18} />
                </button>
              </div>

              {/* Mobile login link */}
              <div className="mt-6 text-center md:hidden">
                <p className="text-text-muted text-sm">
                  Déjà un compte ?{' '}
                  <Link to="/login" className="text-primary font-bold hover:text-primary-dark">
                    Se connecter
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Admin Details ─── */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-text-dark mb-2">Administrateur (Nom Complet)</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                    <input 
                      type="text" name="admin_name" value={formData.admin_name} onChange={handleChange} required
                      placeholder="Ex: Dr. Martin"
                      className="w-full bg-white border border-border rounded-xl px-11 py-3.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-text-dark mb-2">Email Professionnel</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                    <input 
                      type="email" name="email" value={formData.email} onChange={handleChange} required
                      placeholder="contact@clinique.com"
                      className="w-full bg-white border border-border rounded-xl px-11 py-3.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-text-dark mb-2">Mot de passe</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                    <input 
                      type="password" name="password" value={formData.password} onChange={handleChange} required minLength={8}
                      placeholder="8 caractères minimum"
                      className="w-full bg-white border border-border rounded-xl px-11 py-3.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" 
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    type="button" 
                    onClick={() => { setStep(1); setError(''); }}
                    className="px-6 py-3.5 border border-border rounded-xl font-bold text-text-muted hover:text-text-dark transition-colors cursor-pointer bg-white"
                  >
                    Retour
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-primary hover:bg-primary-dark text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 shadow-button transition-all disabled:opacity-70 cursor-pointer border-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      "Créer l'espace"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ─── Step 3: Success ─── */}
          {step === 3 && success && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              
              {needsEmailConfirm ? (
                <>
                  <h2 className="text-2xl font-black text-text-dark font-serif mb-3">Vérifiez votre email</h2>
                  <p className="text-text-muted mb-8 leading-relaxed">
                    Un email de confirmation a été envoyé à <strong>{formData.email}</strong>.
                    <br/>Cliquez sur le lien dans l'email, puis connectez-vous.
                  </p>
                  <Link to="/login" className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 shadow-button transition-all">
                    Aller à la page de connexion
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-text-dark font-serif mb-3">Clinique créée !</h2>
                  <p className="text-text-muted mb-8 leading-relaxed">
                    Félicitations, l'espace de votre clinique est prêt.
                    <br/><strong>Redirection automatique vers votre tableau de bord...</strong>
                  </p>
                  <div className="flex flex-col gap-3">
                    <Link to="/dashboard" className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 shadow-button transition-all no-underline">
                      Continuer vers le Dashboard
                    </Link>
                    <p className="text-[11px] text-text-muted">Si la redirection ne fonctionne pas, cliquez sur le bouton ci-dessus.</p>
                  </div>
                </>
              )}
            </motion.div>
          )}
          
        </div>
      </div>
    </div>
  );
}
