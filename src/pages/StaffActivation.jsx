import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * StaffActivation — Page after staff member clicks their invitation email link.
 *
 * Flow (OTP magic link):
 * 1. Admin calls supabase.auth.signInWithOtp({ email, options: { data: { is_pending_staff, clinic_id, ... } } })
 * 2. Staff receives magic link → /staff/activate
 * 3. Supabase processes the token, session is established
 * 4. We read user_metadata to get pending staff info, insert into users table
 * 5. Staff sets a permanent password
 * 6. Redirect to /dashboard
 */
export default function StaffActivation() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [staffName, setStaffName] = useState('');

  useEffect(() => {
    let mounted = true;

    async function waitForSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          if (mounted) await handleSessionReady(session.user);
          return;
        }

        // Wait for auth state change (token processing in URL)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!mounted) return;
            if (newSession?.user) {
              subscription.unsubscribe();
              await handleSessionReady(newSession.user);
            }
          }
        );

        setTimeout(() => {
          subscription.unsubscribe();
          if (mounted && status === 'loading') {
            setStatus('error');
            setErrorMessage('Le lien a expiré. Demandez un nouvel accès à votre administrateur.');
          }
        }, 20000);
      } catch (err) {
        if (mounted) {
          setStatus('error');
          setErrorMessage(err.message || 'Erreur lors de la vérification du lien.');
        }
      }
    }

    async function handleSessionReady(authUser) {
      if (!mounted) return;

      // Check if staff profile already exists (e.g. second click on same link)
      const { data: existing } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (existing) {
        setStaffName(existing.full_name || '');
        setStatus('already_active');
        setTimeout(() => navigate('/dashboard', { replace: true }), 2500);
        return;
      }

      // Read pending staff data from user metadata (set by admin during invite)
      const meta = authUser.user_metadata || {};
      if (meta.is_pending_staff && meta.clinic_id) {
        // Insert the staff record using the new user's own session
        // (allowed by v9_users_insert_onboarding: auth_user_id = auth.uid())
        const { error: insertError } = await supabase.from('users').insert({
          auth_user_id: authUser.id,
          clinic_id: meta.clinic_id,
          full_name: meta.full_name || authUser.email,
          email: authUser.email,
          role: meta.role || 'nurse',
          phone: meta.phone || null,
          is_active: true,
        });

        if (insertError && insertError.code !== '23505') {
          console.error('[StaffActivation] Insert error:', insertError);
          // Non-fatal — staff can still set password and login, admin can fix later
        }

        setStaffName(meta.full_name || authUser.email);
      }

      if (mounted) setStatus('set_password');
    }

    waitForSession();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (password.length < 8) {
      setValidationError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setValidationError(error.message || 'Erreur lors de la mise à jour du mot de passe.');
      return;
    }

    setStatus('success');
    setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f5f54] via-[#0a4038] to-[#083830] p-5">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white px-10 py-12 rounded-[28px] w-full max-w-[440px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0f5f54] to-[#10b981] inline-flex items-center justify-center text-white text-2xl font-extrabold mb-6 shadow-sm">
          +
        </div>

        {status === 'loading' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 size={40} className="animate-spin text-[#0f5f54] mx-auto mb-4" />
            <h2 className="font-serif text-[22px] text-slate-800 mb-2 font-bold">Vérification en cours…</h2>
            <p className="text-slate-500 text-sm">Nous vérifions votre lien d'invitation.</p>
          </motion.div>
        )}

        {status === 'set_password' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ShieldCheck size={40} className="text-[#0f5f54] mx-auto mb-4" />
            <h2 className="font-serif text-[22px] text-slate-800 mb-1 font-bold">Bienvenue{staffName ? `, ${staffName.split(' ')[0]}` : ''} !</h2>
            <p className="text-slate-500 text-sm mb-6">Définissez un mot de passe pour accéder à votre tableau de bord PostOp.</p>

            {validationError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-4 flex items-center gap-2 text-left">
                <AlertCircle size={15} className="shrink-0" /> {validationError}
              </div>
            )}

            <form onSubmit={handleSetPassword} className="text-left space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm outline-none focus:border-[#0f5f54] focus:ring-1 focus:ring-[#0f5f54]/20"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-0">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirmer le mot de passe</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f5f54] focus:ring-1 focus:ring-[#0f5f54]/20"
                  required
                />
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-[#0f5f54] hover:bg-[#0a4038] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</> : 'Créer mon compte'}
              </button>
            </form>
          </motion.div>
        )}

        {status === 'already_active' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CheckCircle size={40} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="font-serif text-[22px] text-slate-800 mb-2 font-bold">Compte actif</h2>
            <p className="text-slate-500 text-sm">Votre compte est déjà activé. Redirection…</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CheckCircle size={40} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="font-serif text-[22px] text-slate-800 mb-2 font-bold">Compte créé !</h2>
            <p className="text-slate-500 text-sm">Redirection vers votre tableau de bord…</p>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
            <h2 className="font-serif text-[22px] text-slate-800 mb-2 font-bold">Lien invalide</h2>
            <p className="text-slate-500 text-sm mb-6">{errorMessage}</p>
            <a href="/login" className="block bg-[#0f5f54] hover:bg-[#0a4038] text-white font-bold py-3 rounded-xl text-center no-underline text-sm">
              Retour à la connexion
            </a>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
