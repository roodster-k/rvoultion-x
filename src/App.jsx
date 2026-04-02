import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NurseDashboard from './pages/NurseDashboard.jsx';
import PatientPortal from './pages/PatientPortal.jsx';
import LoginPage from './pages/LoginPage.jsx';
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
  const { user, loading } = useAuth();

  // Show loading screen while Supabase restores session
  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        {/* L'application Patient est toujours accessible (via token) */}
        <Route path="/patient/:token" element={<PatientPortal />} />

        {/* Côté Infirmier : Redirection via Auth */}
        {!user ? (
          <Route path="*" element={<LoginPage />} />
        ) : (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard/*" element={<NurseDashboard />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
