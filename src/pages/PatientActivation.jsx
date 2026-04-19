import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * PatientActivation — Page callback après clic sur le magic link.
 * 
 * Flow :
 * 1. Le patient clique le magic link dans son email
 * 2. Supabase redirige vers /patient/activate avec les tokens dans le hash
 * 3. Supabase Auth restaure la session automatiquement
 * 4. On lie auth_user_id au dossier patient (via email match)
 * 5. Redirection vers /patient/portal
 */
export default function PatientActivation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | activating | success | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    async function handleActivation() {
      try {
        // 1. Wait for Supabase Auth to process the magic link tokens from URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(`Erreur d'authentification : ${sessionError.message}`);
        }

        if (!session?.user) {
          // The session might not be ready yet — wait for auth state change
          return new Promise((resolve) => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
              async (event, newSession) => {
                if (!mounted) return;
                if (event === 'SIGNED_IN' && newSession?.user) {
                  subscription.unsubscribe();
                  await linkPatientAccount(newSession.user);
                  resolve();
                }
              }
            );

            // Timeout after 15 seconds
            setTimeout(() => {
              subscription.unsubscribe();
              if (mounted) {
                setStatus('error');
                setErrorMessage('Le lien a expiré ou est invalide. Veuillez contacter la clinique pour en recevoir un nouveau.');
              }
              resolve();
            }, 15000);
          });
        } else {
          await linkPatientAccount(session.user);
        }
      } catch (err) {
        console.error('[PatientActivation] Error:', err);
        if (mounted) {
          setStatus('error');
          setErrorMessage(err.message || 'Une erreur est survenue lors de l\'activation.');
        }
      }
    }

    async function linkPatientAccount(authUser) {
      if (!mounted) return;
      setStatus('activating');

      // 1. Check if already activated (AuthContext may have linked it already via email fallback)
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id, full_name')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (existingPatient) {
        if (mounted) {
          setStatus('success');
          setTimeout(() => navigate('/patient/portal', { replace: true }), 1500);
        }
        return;
      }

      // 2. Find patient by email (case-insensitive) where not yet linked.
      //    Use .limit(1) instead of .maybeSingle() to safely handle duplicate emails.
      const { data: patients, error: patientError } = await supabase
        .from('patients')
        .select('id, full_name')
        .ilike('email', authUser.email)
        .is('auth_user_id', null)
        .limit(1);

      if (patientError) {
        throw new Error(`Erreur de recherche du dossier : ${patientError.message}`);
      }

      const patient = patients?.[0] ?? null;

      if (!patient) {
        throw new Error('Aucun dossier patient trouvé pour cette adresse email. Veuillez contacter la clinique.');
      }

      // 3. Link
      const { error: updateError } = await supabase
        .from('patients')
        .update({ auth_user_id: authUser.id, activated_at: new Date().toISOString() })
        .eq('id', patient.id);

      if (updateError) {
        throw new Error(`Erreur d'activation : ${updateError.message}`);
      }

      if (mounted) {
        setStatus('success');
        setTimeout(() => navigate('/patient/portal', { replace: true }), 2000);
      }
    }

    handleActivation();

    return () => { mounted = false; };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f5f54] via-[#0a4038] to-[#083830] p-5">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white px-10 py-12 rounded-[28px] w-full max-w-[440px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] text-center"
      >
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent inline-flex items-center justify-center text-white text-2xl font-extrabold mb-6 shadow-sm">
          +
        </div>

        {/* Loading */}
        {(status === 'loading' || status === 'activating') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
            <h2 className="font-serif text-[22px] text-text-dark mb-2 font-bold">
              {status === 'loading' ? 'Vérification en cours…' : 'Activation de votre compte…'}
            </h2>
            <p className="text-text-muted text-sm font-medium">
              {status === 'loading'
                ? 'Nous vérifions votre lien d\'accès sécurisé.'
                : 'Liaison de votre compte avec votre dossier médical.'}
            </p>
          </motion.div>
        )}

        {/* Success */}
        {status === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-16 h-16 rounded-full bg-status-normal-bg flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={36} className="text-status-normal" />
            </div>
            <h2 className="font-serif text-[22px] text-text-dark mb-2 font-bold">
              Compte activé !
            </h2>
            <p className="text-text-muted text-sm font-medium">
              Redirection vers votre portail patient…
            </p>
          </motion.div>
        )}

        {/* Error */}
        {status === 'error' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={36} className="text-status-complication" />
            </div>
            <h2 className="font-serif text-[22px] text-text-dark mb-2 font-bold">
              Activation impossible
            </h2>
            <p className="text-text-muted text-sm font-medium leading-relaxed mb-6">
              {errorMessage}
            </p>
            <a
              href="/"
              className="inline-block py-3 px-6 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-sm transition-colors shadow-button"
            >
              Retour à l'accueil
            </a>
          </motion.div>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-8 text-[12px] text-slate-400 font-semibold tracking-wide">
          <ShieldCheck size={14} />
          Connexion sécurisée · HDS · PostOp Tracker
        </div>
      </motion.div>
    </div>
  );
}
