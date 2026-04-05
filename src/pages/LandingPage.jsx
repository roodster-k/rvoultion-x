import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Zap, 
  Smartphone, 
  BarChart3, 
  ChevronRight, 
  CheckCircle2, 
  ArrowRight,
  MessageSquare,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-surface-main text-text-dark selection:bg-primary/20">
      {/* --- Navbar --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-extrabold shadow-sm font-serif">
              +
            </div>
            <span className="text-xl font-black font-serif text-primary tracking-tight">PostOp Tracker</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10 text-sm font-bold text-text-muted">
            <a href="#features" className="hover:text-primary transition-colors">Fonctionnalités</a>
            <a href="#solutions" className="hover:text-primary transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Tarifs</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/signup" className="hidden sm:block text-sm font-bold text-primary hover:text-primary-dark transition-colors">
              Connexion
            </Link>
            <Link to="/signup" className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-button transition-all">
              Démo Gratuite
            </Link>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="pt-40 pb-24 px-6 overflow-hidden relative">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-7xl mx-auto text-center md:text-left flex flex-col md:flex-row items-center gap-16">
          <motion.div 
            className="flex-1"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-light text-primary rounded-lg text-xs font-black uppercase tracking-widest mb-6">
              <Zap size={14} className="fill-primary" /> Nouvelle ère du suivi post-op
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-serif font-black leading-[1.1] text-text-dark mb-8">
              Sécurisez vos patients, <span className="text-primary italic">gagnez du temps.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-text-muted font-medium mb-10 max-w-2xl leading-relaxed">
              Le premier SaaS de suivi médical à distance conçu pour la chirurgie esthétique. 
              Automatisez vos rappels, visualisez les constantes en temps réel et offrez une expérience premium.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 items-center">
              <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl text-lg font-bold shadow-button transition-all flex items-center justify-center gap-2">
                Démarrer maintenant <ChevronRight size={20} />
              </Link>
              <div className="text-sm font-medium text-text-light">
                <span className="font-bold text-text-dark">14 jours d'essai</span> . Sans carte de crédit
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="flex-1 relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <div className="relative z-10 glass-card bg-white p-4 rounded-[32px] shadow-modal border border-white/40 ring-1 ring-black/5 overflow-hidden">
               <img 
                 src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1200" 
                 alt="Dashboard Preview" 
                 className="rounded-2xl w-full h-auto object-cover aspect-video shadow-sm"
               />
               <div className="mt-4 flex gap-3">
                 <div className="w-2 h-2 rounded-full bg-red-400"></div>
                 <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                 <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
               </div>
            </div>
            {/* Floating metrics */}
            <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-card border border-border flex items-center gap-3 z-20"
            >
              <div className="w-10 h-10 rounded-xl bg-status-normal-bg flex items-center justify-center text-status-normal">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="text-xs text-text-muted font-bold uppercase tracking-wider">Compliance</div>
                <div className="text-xl font-black text-primary">98.4%</div>
              </div>
            </motion.div>

            <motion.div 
               animate={{ y: [0, 10, 0] }}
               transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-card border border-border flex items-center gap-3 z-20"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Activity size={20} />
              </div>
              <div>
                <div className="text-xs text-text-muted font-bold uppercase tracking-wider">Réactivité</div>
                <div className="text-xl font-black text-blue-600">&lt; 15 min</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- Partners --- */}
      <section className="bg-white py-12 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[11px] font-black uppercase tracking-[3px] text-text-light mb-8">Ils nous font confiance</p>
          <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8 opacity-40 grayscale contrast-125">
            <span className="text-2xl font-serif font-bold italic">Clinique Churchill</span>
            <span className="text-2xl font-serif font-bold italic">Dr. Horn Plastic Surgery</span>
            <span className="text-2xl font-serif font-bold italic">Brussels Aesthetics</span>
            <span className="text-2xl font-serif font-bold italic">Gent Surgery</span>
          </div>
        </div>
      </section>

      {/* --- Features --- */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-serif font-black mb-6">Tout ce dont votre clinique a besoin</h2>
            <p className="text-text-muted font-medium max-w-2xl mx-auto text-lg leading-relaxed">
              Une plateforme unique pour gérer l'expérience patient de l'opération jusqu'à la guérison complète.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[32px] shadow-card border border-border group hover:bg-primary transition-all duration-500">
              <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mb-8 group-hover:bg-white group-hover:scale-110 transition-all duration-500">
                <Zap size={28} />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-4 text-text-dark group-hover:text-white transition-colors">Protocoles Intelligents</h3>
              <p className="text-text-muted font-medium group-hover:text-white/80 transition-colors">
                Générez des checklists post-opératoires automatiques selon le type d'intervention (Mammaire, Rhinoplastie...).
              </p>
            </div>

            <div className="bg-white p-10 rounded-[32px] shadow-card border border-border group hover:bg-primary transition-all duration-500">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-8 group-hover:bg-white group-hover:scale-110 transition-all duration-500">
                <BarChart3 size={28} />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-4 text-text-dark group-hover:text-white transition-colors">Dashboard Alertes</h3>
              <p className="text-text-muted font-medium group-hover:text-white/80 transition-colors">
                Triage automatique des patients en "Normal", "Attention" ou "Complication" basé sur leurs données réelles.
              </p>
            </div>

            <div className="bg-white p-10 rounded-[32px] shadow-card border border-border group hover:bg-primary transition-all duration-500">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-8 group-hover:bg-white group-hover:scale-110 transition-all duration-500">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-4 text-text-dark group-hover:text-white transition-colors">Messagerie Patients</h3>
              <p className="text-text-muted font-medium group-hover:text-white/80 transition-colors">
                Une alternative sécurisée à WhatsApp pour échanger messages et photos avec votre équipe soignante.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Value Proposition --- */}
      <section className="py-24 bg-primary text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1">
                <h2 className="text-4xl md:text-5xl font-serif font-black mb-8 leading-tight">Marque blanche. <br/>Votre clinique, votre app.</h2>
                <p className="text-white/80 text-lg mb-10 leading-relaxed max-w-xl">
                    Personnalisez l'intégralité du portail patient avec votre logo et vos couleurs. 
                    Offrez un service haut de gamme qui renforce votre image de marque à chaque étape du suivi.
                </p>
                <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3 font-bold text-white uppercase text-xs tracking-widest">
                        <CheckCircle2 size={18} className="text-accent" /> Logo personnalisé
                    </li>
                    <li className="flex items-center gap-3 font-bold text-white uppercase text-xs tracking-widest">
                        <CheckCircle2 size={18} className="text-accent" /> Thème graphique dynamique
                    </li>
                    <li className="flex items-center gap-3 font-bold text-white uppercase text-xs tracking-widest">
                        <CheckCircle2 size={18} className="text-accent" /> Domaine personnalisé (Enterprise)
                    </li>
                </ul>
            </div>
            <div className="flex-1 bg-white/10 p-8 rounded-[40px] backdrop-blur-xl border border-white/20">
                <div className="bg-white rounded-3xl p-6 shadow-2xl">
                    <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-serif font-black">+</div>
                        <div>
                            <div className="text-xs text-text-muted font-bold">Votre Patient</div>
                            <div className="text-sm font-black text-text-dark">Jean Dupont</div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="h-4 bg-slate-100 rounded-full w-full"></div>
                        <div className="h-4 bg-slate-100 rounded-full w-2/3"></div>
                        <div className="h-24 bg-primary/5 rounded-2xl w-full border border-primary/10 flex items-center justify-center text-primary/40 font-black">PREVIEW APP</div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- Pricing --- */}
      <section id="pricing" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-black mb-6">Un tarif clair pour chaque clinique</h2>
            <p className="text-text-muted font-medium">Commencez gratuitement, payez à la croissance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
            {/* Starter */}
            <div className="bg-white p-10 rounded-[32px] border border-border relative">
              <h4 className="text-lg font-black font-serif text-primary mb-2">Starter</h4>
              <div className="text-4xl font-black mb-6 text-text-dark">Gratuit</div>
              <p className="text-sm text-text-muted mb-8">Idéal pour tester ou pour une petite pratique.</p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 size={16} className="text-primary" /> Jusqu'à 10 patients</li>
                <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 size={16} className="text-primary" /> Protocoles Standards</li>
                <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 size={16} className="text-primary" /> Dashboard de base</li>
              </ul>
              <Link to="/signup" className="block w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-text-dark text-center rounded-xl font-bold transition-all">
                Démarrer
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-white p-12 rounded-[40px] border-2 border-primary relative shadow-card transform scale-105 z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Le plus populaire</div>
              <h4 className="text-lg font-black font-serif text-primary mb-2">Pro Plan</h4>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black text-text-dark">149€</span>
                <span className="text-text-muted font-bold">/mois</span>
              </div>
              <p className="text-sm text-text-muted mb-8 text-balance">Le standard pour les cliniques performantes.</p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 size={16} className="text-primary" /> Patients Illimités</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 size={16} className="text-primary" /> White-Label Complet</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 size={16} className="text-primary" /> Rappels SMS & Email</li>
                <li className="flex items-center gap-3 text-sm font-bold"><CheckCircle2 size={16} className="text-primary" /> Multi-Chirurgiens</li>
              </ul>
              <Link to="/signup" className="block w-full py-4 bg-primary hover:bg-primary-dark text-white text-center rounded-2xl font-bold shadow-button transition-all">
                Choisir Pro
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-white p-10 rounded-[32px] border border-border relative">
              <h4 className="text-lg font-black font-serif text-primary mb-2">Enterprise</h4>
              <div className="text-4xl font-black mb-6 text-text-dark">Sur mesure</div>
              <p className="text-sm text-text-muted mb-8">Pour les réseaux de cliniques et hôpitaux.</p>
              <ul className="space-y-4 mb-10 text-balance">
                <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 size={16} className="text-primary" /> SSO & Sécurité avancée</li>
                <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 size={16} className="text-primary" /> Intégration ERP / DPI</li>
                <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 size={16} className="text-primary" /> Accompagnement dédié</li>
              </ul>
              <button className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-text-dark rounded-xl font-bold transition-all">
                Nous contacter
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-white border-t border-border pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between gap-16 mb-24">
                <div className="max-w-xs">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-lg font-black font-serif">+</div>
                        <span className="text-lg font-black font-serif text-primary tracking-tight">PostOp Tracker</span>
                    </div>
                    <p className="text-text-muted text-sm leading-relaxed mb-6">
                        Plateforme HDS (Hébergement Données de Santé) pour le suivi chirurgical à distance.
                    </p>
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                        <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                        <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 flex-1">
                    <div>
                        <h5 className="font-bold text-text-dark mb-6">Produit</h5>
                        <ul className="space-y-4 text-sm text-text-muted font-medium">
                            <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Intégrations</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Sécurité</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold text-text-dark mb-6">Société</h5>
                        <ul className="space-y-4 text-sm text-text-muted font-medium">
                            <li><a href="#" className="hover:text-primary transition-colors">À propos</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold text-text-dark mb-6">Légal</h5>
                        <ul className="space-y-4 text-sm text-text-muted font-medium">
                            <li><a href="#" className="hover:text-primary transition-colors">Confidentialité</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">CGV / CGU</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">RGPD</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-border gap-6">
                <div className="text-text-light text-xs font-medium">
                    © 2026 Roots / RvolutionX. Tous droits réservés.
                </div>
                <div className="flex items-center gap-6">
                    <ShieldCheck size={20} className="text-text-light" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-text-light">Certifié Données Santé</span>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}
