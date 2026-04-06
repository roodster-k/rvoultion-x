import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NurseDashboard from './pages/NurseDashboard.jsx';
import PatientPortal from './pages/PatientPortal.jsx';
import PatientPortalAuth from './pages/PatientPortalAuth.jsx';
import PatientActivation from './pages/PatientActivation.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupClinic from './pages/SignupClinic.jsx';
import LandingPage from './pages/LandingPage.jsx';
import { useAuth } from './context/AuthContext';

function ConnectionErrorScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-[32px] shadow-modal border border-red-100 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-text-dark font-serif mb-3">Erreur de Connexion</h2>
        <p className="text-text-muted text-sm mb-8 leading-relaxed">
          Impossible de se connecter aux serveurs de santé. Veuillez vérifier votre connexion internet ou les variables d'environnement (VITE_SUPABASE_URL).
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all shadow-button"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f5f54] via-[#0a4038] to-[#083830]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent inline-flex items-center justify-center text-white text-2xl font-extrabold mb-4 shadow-lg">
          +
        </div>
        <div className="text-white/80 text-sm font-medium tracking-wide">Chargement…</div>
      </motion.div>
    </div>
  );
}

function App() {
  const { user, isStaff, isPatient, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        {/* ─── Public routes ─── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupClinic />} />
        <Route path="/login" element={<LoginPage />} />

        {/* ─── Patient routes (accessible if token or auth) ─── */}
        <Route path="/patient/:token" element={<PatientPortal />} />
        <Route path="/patient/activate" element={<PatientActivation />} />
        <Route path="/patient/portal" element={<PatientPortalAuth />} />

        {/* ─── Protected routes (Auth Required) ─── */}
        {user ? (
          isPatient ? (
            <>
              <Route path="/dashboard" element={<Navigate to="/patient/portal" replace />} />
              <Route path="*" element={<Navigate to="/patient/portal" replace />} />
            </>
          ) : (
            <>
              <Route path="/dashboard/*" element={<NurseDashboard />} />
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          )
        ) : (
          <Route path="/dashboard/*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
