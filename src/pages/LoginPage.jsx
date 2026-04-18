import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const { login } = useAuth();

  // ─── Mode: 'staff' | 'patient' ───
  const [mode, setMode] = useState('staff');

  // Staff state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Patient state
  const [patientEmail, setPatientEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Shared state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ─── Staff login ───
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      // AuthContext + App.jsx routing gère la redirection
    } catch (err) {
      if (err.message?.includes('Invalid login')) {
        setError('Email ou mot de passe incorrect.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Veuillez confirmer votre email avant de vous connecter.');
      } else {
        setError(err.message || 'Erreur de connexion. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Patient magic link ───
  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    if (!patientEmail.trim()) {
      setError('Veuillez entrer votre adresse email.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const redirectTo = `${window.location.origin}/patient/portal`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: patientEmail.trim().toLowerCase(),
        options: { emailRedirectTo: redirectTo },
      });
      if (otpError) throw otpError;
      setOtpSent(true);
    } catch (err) {
      setError(err.message || 'Impossible d\'envoyer le lien. Vérifiez votre adresse email.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setOtpSent(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f5f54] via-[#0a4038] to-[#083830] p-5">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white px-[40px] py-[48px] rounded-[28px] w-full max-w-[420px] shadow-[0_25px_60px_rgba(0,0,0,0.3)]"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0f5f54] to-[#10b981] inline-flex items-center justify-center text-white text-2xl font-extrabold mb-4 shadow-sm">
            +
          </div>
          <h1 className="font-serif text-[#0f5f54] text-[28px] mb-1 font-bold tracking-tight">PostOp Tracker</h1>
          <p className="text-slate-500 text-sm font-medium italic">Suivi post-opératoire sécurisé</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6 gap-1">
          <button
            type="button"
            onClick={() => switchMode('staff')}
            className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer border-none
              ${mode === 'staff'
                ? 'bg-white text-[#0f5f54] shadow-sm'
                : 'text-slate-500 bg-transparent hover:text-slate-700'}`}
          >
            Espace médical
          </button>
          <button
            type="button"
            onClick={() => switchMode('patient')}
            className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer border-none
              ${mode === 'patient'
                ? 'bg-white text-[#0f5f54] shadow-sm'
                : 'text-slate-500 bg-transparent hover:text-slate-700'}`}
          >
            Espace patient
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ─── Staff Form ─── */}
          {mode === 'staff' && (
            <motion.form
              key="staff"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleStaffSubmit}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-[13px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Adresse e-mail professionnelle
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="nom@clinique.be"
                  disabled={isLoading}
                  className="w-full px-4 py-3.5 rounded-xl border border-border text-[15px] outline-none transition-colors duration-200 focus:border-[#0f5f54] focus:ring-1 focus:ring-[#0f5f54]/20 bg-white disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-border text-[15px] outline-none transition-colors duration-200 focus:border-[#0f5f54] focus:ring-1 focus:ring-[#0f5f54]/20 bg-white disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-red-50 text-red-700 py-2.5 px-3.5 rounded-lg text-[13px] font-bold"
                >{error}</motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full py-4 bg-[#0f5f54] hover:bg-[#0a4038] text-white border-none rounded-xl text-[16px] font-bold cursor-pointer transition-colors duration-200 shadow-button disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 size={18} className="animate-spin" /> Connexion en cours...</>
                ) : (
                  'Me connecter'
                )}
              </button>
            </motion.form>
          )}

          {/* ─── Patient Form ─── */}
          {mode === 'patient' && (
            <motion.div
              key="patient"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {otpSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                  <h2 className="font-serif text-[20px] font-bold text-text-dark mb-2">Lien envoyé !</h2>
                  <p className="text-text-muted text-[14px] font-medium leading-relaxed mb-4">
                    Un lien de connexion a été envoyé à<br />
                    <strong className="text-text-dark">{patientEmail}</strong>
                  </p>
                  <p className="text-[12px] text-text-muted font-medium mb-6">
                    Vérifiez votre boîte de réception et cliquez sur le lien pour accéder à votre portail.
                  </p>
                  <button
                    onClick={() => { setOtpSent(false); setPatientEmail(''); setError(''); }}
                    className="text-[#0f5f54] text-[13px] font-bold bg-transparent border-none cursor-pointer hover:text-[#0a4038] transition-colors"
                  >
                    Renvoyer avec une autre adresse
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handlePatientSubmit} className="flex flex-col gap-4">
                  <p className="text-[13px] text-text-muted font-medium leading-relaxed -mt-1">
                    Entrez l'adresse email utilisée lors de votre inscription. Vous recevrez un lien sécurisé pour accéder à votre suivi.
                  </p>
                  <div>
                    <label className="block text-[13px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Votre adresse email
                    </label>
                    <input
                      type="email"
                      value={patientEmail}
                      onChange={(e) => { setPatientEmail(e.target.value); setError(''); }}
                      placeholder="votre@email.com"
                      disabled={isLoading}
                      className="w-full px-4 py-3.5 rounded-xl border border-border text-[15px] outline-none transition-colors duration-200 focus:border-[#0f5f54] focus:ring-1 focus:ring-[#0f5f54]/20 bg-white disabled:opacity-60"
                    />
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-red-50 text-red-700 py-2.5 px-3.5 rounded-lg text-[13px] font-bold"
                    >{error}</motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 w-full py-4 bg-[#0f5f54] hover:bg-[#0a4038] text-white border-none rounded-xl text-[16px] font-bold cursor-pointer transition-colors duration-200 shadow-button disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <><Loader2 size={18} className="animate-spin" /> Envoi en cours...</>
                    ) : (
                      <><Mail size={18} /> Recevoir mon lien de connexion</>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        <div className="flex items-center justify-center gap-1.5 mt-8 text-[11px] text-slate-400 font-semibold tracking-wide uppercase text-center flex-wrap">
          <ShieldCheck size={14} />
          Données HDS · Supabase Auth · TLS 1.3
        </div>
      </motion.div>
    </div>
  );
}
