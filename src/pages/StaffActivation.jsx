import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * StaffActivation — Page after staff member clicks their invitation email link.
 *
 * Flow:
 * 1. Staff clicks the magic link / confirmation email
 * 2. Supabase redirects to /staff/activate (with session tokens in URL)
 * 3. Supabase Auth processes the tokens automatically
 * 4. We prompt the user to set a permanent password
 * 5. Redirect to /dashboard
 */
export default function StaffActivation() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | set_password | success | error | already_active
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        // Wait for Supabase to process URL tokens
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          if (mounted) handleSessionReady(session.user);
          return;
        }

        // Wait for auth state change (token processing)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (!mounted) return;
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.user) {
              subscription.unsubscribe();
              handleSessionReady(newSession.user);
            }
          }
        );

        setTimeout(() => {
          subscription.unsubscribe();
          if (mounted && status === 'loading') {
            setStatus('error');
            setErrorMessage('Le lien a expiré ou est invalide. Demandez un nouvel accès à votre administrateur.');
          }
        }, 15000);
      } catch (err) {
        if (mounted) {
          setStatus('error');
          setErrorMessage(err.message || 'Une erreur est survenue.');
        }
      }
    }

    function handleSessionReady(authUser) {
      // Check if user already has a profile in users table
      supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!mounted) return;
          if (data) {
            // Profile already linked — just go to dashboard
            setStatus('already_active');
            setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
          } else {
            // Ask them to set their password
            setStatus('set_password');
          }
        });
    }

    checkSession();
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
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0f5f54] to-[#10b981] inline-flex items-center justify-center text-white text-2xl font-extrabold mb-6 shadow-sm">
          +
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 size={40} className="animate-spin text-[#0f5f54] mx-auto mb-4" />
            <h2 className="font-serif text-[22px] text-text-dark mb-2 font-bold">Vérification en cours…</h2>
            <p className="text-text-muted text-sm font-medium">Nous vérifions votre lien d'invitation.</p>
          </motion.div>
        )}

        {/* Set password form */}
        {status === 'set_password' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ShieldCheck size={40} className="text-[#0f5f54] mx-auto mb-4" />
            <h2 className="font-serif text-[22px] text-text-dark mb-2 font-bold">Créez votre mot de passe</h2>
            <p className="text-text-muted text-sm font-medium mb-6">
              Bienvenue dans PostOp ! Définissez un mot de passe sécurisé pour accéder à votre tableau de bord.
            </p>

            {validationError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium p-3 rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {validationError}
              </div>
            )}

            <form onSubmit={handleSetPassword} className="text-left space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-dark mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    className="w-full border border-border rounded-xl px-4 py-3 pr-10 text-sm outline-none focus:border-[#0f5f54] focus:ring-1 focus:ring-[#0f5f54]/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-dark bg-transparent border-none cursor-pointer p-0"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-dark mb-1.5">Confirmer le mot de passe</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0f5f54] focus:ring-1 focus:ring-[#0f5f54]/20"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#0f5f54] hover:bg-[#0a4038] text-white font-bold py-3 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</> : 'Définir mon mot de passe'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Already active */}
        {status === 'already_active' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CheckCircle size={40} className="text-[#10b981] mx-auto mb-4" />
            <h2 className="font-serif text-[22px] text-text-dark mb-2 font-bold">Compte actif</h2>
            <p className="text-text-muted text-sm font-medium">Votre compte est déjà activé. Redirection vers le tableau de bord…</p>
          </motion.div>
        )}

        {/* Success */}
        {status === 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CheckCircle size={40} className="text-[#10b981] mx-auto mb-4" />
            <h2 className="font-serif text-[22px] text-text-dark mb-2 font-bold">Compte activé !</h2>
            <p className="text-text-muted text-sm font-medium">Votre mot de passe a été défini. Redirection vers le tableau de bord…</p>
          </motion.div>
        )}

        {/* Error */}
        {status === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
            <h2 className="font-serif text-[22px] text-text-dark mb-2 font-bold">Lien invalide</h2>
            <p className="text-text-muted text-sm font-medium mb-6">{errorMessage}</p>
            <a
              href="/login"
              className="block bg-[#0f5f54] hover:bg-[#0a4038] text-white font-bold py-3 rounded-xl text-center no-underline transition-colors text-sm"
            >
              Retour à la connexion
            </a>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
