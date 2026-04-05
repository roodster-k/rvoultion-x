import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function SignupClinic() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
      // Create user via Edge Function which will:
      // 1. Create Supabase Auth user
      // 2. Insert into clinics
      // 3. Insert into users (role: clinic_admin)
      // 4. Seed basic protocol templates
      const { data, error: functionError } = await supabase.functions.invoke('signup-clinic', {
        body: formData
      });

      if (functionError) {
        throw new Error(functionError.message || 'Erreur lors de l\'invocation de la fonction d\'inscription.');
      }
      
      if (data.error) {
         // Si on a des détails (ex: SQL error), on les affiche pour le debug
         const fullError = data.details ? `${data.error} (${data.details})` : data.error;
         throw new Error(fullError);
      }

      // --- AUTO LOGIN ---
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        console.error('Auto-login failed:', signInError);
        // On ne bloque pas tout, on montre juste le succès et ils devront se connecter manuellement
        setStep(3);
        setSuccess(true);
      } else {
        // Succès total : La redirection sera gérée par AuthContext + App.jsx
        setSuccess(true);
        setStep(3);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'inscription de votre clinique. Les fonctions Edge ne sont peut-être pas déployées.');
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
          <Link to="/" className="text-white font-bold hover:underline">Se connecter</Link>
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
            <div className="bg-status-complication-bg text-status-complication p-4 rounded-xl text-sm font-bold mb-6 border border-red-200">
              {error}
            </div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
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
                  onClick={() => formData.clinic_name.length > 2 ? setStep(2) : setError('Veuillez entrer un nom valide.')}
                  className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 shadow-button transition-all mt-8"
                >
                  Continuer <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
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
                  <button type="button" onClick={() => setStep(1)} className="px-6 py-3.5 border border-border rounded-xl font-bold text-text-muted hover:text-text-dark transition-colors">
                    Retour
                  </button>
                  <button 
                    type="submit" disabled={loading}
                    className="flex-1 bg-primary hover:bg-primary-dark text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 shadow-button transition-all disabled:opacity-70"
                  >
                    {loading ? 'Création en cours...' : 'Créer l\'espace'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 3 && success && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black text-text-dark font-serif mb-3">Clinique créée !</h2>
              <p className="text-text-muted mb-8 leading-relaxed">
                Félicitations, l'espace de votre clinique est prêt. 
                <br/><strong>Redirection automatique vers votre tableau de bord...</strong>
              </p>
              <div className="flex flex-col gap-3">
                <Link to="/login" className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 shadow-button transition-all">
                  Continuer vers le Dashboard
                </Link>
                <p className="text-[11px] text-text-muted">Si la redirection ne fonctionne pas, cliquez sur le bouton ci-dessus.</p>
              </div>
            </motion.div>
          )}
          
        </div>
      </div>
    </div>
  );
}
