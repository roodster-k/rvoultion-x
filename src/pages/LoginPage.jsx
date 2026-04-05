import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err) {
      console.error('[Login] Error:', err);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f5f54] via-[#0a4038] to-[#083830] p-5">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white px-[40px] py-[48px] rounded-[28px] w-full max-w-[420px] shadow-[0_25px_60px_rgba(0,0,0,0.3)]"
      >
        {/* Logo */}
        <div className="text-center mb-8 relative">
          <Link to="/" className="absolute -top-12 -left-6 text-slate-400 hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest p-2">
            <ArrowLeft size={14} /> Accueil
          </Link>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent inline-flex items-center justify-center text-white text-2xl font-extrabold mb-4 shadow-sm">
            +
          </div>
          <h1 className="font-serif text-primary text-[28px] mb-2 font-bold tracking-tight">PostOp Tracker</h1>
          <p className="text-slate-500 text-sm font-medium italic">Accès sécurisé pour les établissements de santé</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Adresse e-mail professionnelle</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="nom@clinique.be"
              disabled={isLoading}
              className="w-full px-4 py-3.5 rounded-xl border border-border text-[15px] outline-none transition-colors duration-200 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-border text-[15px] outline-none transition-colors duration-200 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white disabled:opacity-60"
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
            className="mt-2 w-full py-4 bg-primary hover:bg-primary-dark text-white border-none rounded-xl text-[16px] font-bold cursor-pointer transition-colors duration-200 shadow-button disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Connexion en cours...
              </>
            ) : (
              'Me connecter'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center uppercase tracking-widest">
            <p className="text-[10px] text-slate-400 font-black mb-3">Nouvel établissement ?</p>
            <Link to="/signup" className="text-primary hover:text-primary-dark font-black text-[12px]">
                Créer un compte clinique
            </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-8 text-[11px] text-slate-400 font-semibold tracking-widest uppercase">
          <ShieldCheck size={14} />
          Données HDS · Supabase Auth · TLS 1.3
        </div>
      </motion.div>
    </div>
  );
}
