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

  // Show loading screen while Supabase restores session
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
