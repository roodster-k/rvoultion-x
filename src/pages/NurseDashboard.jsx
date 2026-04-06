import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mail, Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import StatsCards from '../components/StatsCards';
import PatientList from '../components/PatientList';
import PatientDetail from '../components/PatientDetail';
import AddPatientModal from '../components/AddPatientModal';
import AlertCenter from '../components/AlertCenter';
import Settings from './Settings';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { useAuth } from '../context/AuthContext';
import { usePatientContext } from '../context/PatientContext';
import { useAlertContext } from '../context/AlertContext';

export default function NurseDashboard() {
  const { user } = useAuth();
  const { loading, getFilteredPatients, getPatientById, getStats } = usePatientContext();
  const { alerts } = useAlertContext();

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('mes_patients');
  const [activeView, setActiveView] = useState('dashboard');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  const [emailToasts, setEmailToasts] = useState([]);
  const prevAlertCount = useRef(alerts.length);

  const currentPatient = selectedPatientId ? getPatientById(selectedPatientId) : null;
  const filteredPatients = getFilteredPatients(searchTerm, viewMode, user?.name);
  const STATS = getStats(filteredPatients);

  useEffect(() => {
    if (alerts.length > prevAlertCount.current) {
      const newAlert = alerts[0];
      if (newAlert && !newAlert.silent) {
        const toastId = Date.now();
        setEmailToasts(prev => [...prev, { id: toastId, text: `📧 Notification : ${newAlert.title}` }]);
        setTimeout(() => setEmailToasts(prev => prev.filter(t => t.id !== toastId)), 4000);
      }
    }
    prevAlertCount.current = alerts.length;
  }, [alerts]);

  const handleSelectPatient = (p) => {
    setSelectedPatientId(p.id);
    setActiveView('dashboard');
    setSearchTerm('');
    setSidebarOpen(false);
  };

  return (
    <div className="flex relative min-h-screen bg-surface-main">
      
      {/* Email Toasts */}
      <div className="fixed top-5 right-5 z-[1000] flex flex-col gap-2.5">
        <AnimatePresence>
          {emailToasts.map(toast => (
            <motion.div key={toast.id} initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
              className="bg-slate-800 text-white py-3 px-5 rounded-xl flex items-center gap-2.5 text-[13px] font-medium shadow-toast">
              <Mail size={16} /> {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 md:hidden" />}

      {/* FIX: Now passing sidebarOpen prop to Sidebar */}
      <Sidebar 
        activeView={activeView} setActiveView={setActiveView}
        currentPatient={currentPatient}
        setSelectedPatientId={setSelectedPatientId}
        setSidebarOpen={setSidebarOpen}
        sidebarOpen={sidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 p-5 md:p-8 md:ml-[250px] max-w-[1100px] w-full min-w-0">
        
        {activeView === 'settings' && !currentPatient ? (
          <Settings />
        ) : activeView === 'alerts' && !currentPatient ? (
          <AlertCenter onSelectPatient={handleSelectPatient} />
        ) : activeView === 'analytics' && !currentPatient ? (
          <AnalyticsDashboard />
        ) : !currentPatient ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <header className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 -ml-2 text-text-muted hover:text-primary transition-colors"
                >
                  <Menu size={24} />
                </button>
                <div>
                  <h1 className="font-serif text-3xl mb-2 font-bold text-text-dark">Tableau de bord</h1>
                  <p className="text-text-muted font-medium text-sm">Bienvenue {user?.name?.split(' ')[0] || ''}. Voici vos priorités.</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-center flex-wrap">
                <div className="flex bg-slate-200 rounded-xl p-1 shadow-inner">
                  <button onClick={() => setViewMode('mes_patients')} className={`py-2 px-3.5 rounded-lg border-none font-bold text-[13px] cursor-pointer transition-all ${viewMode === 'mes_patients' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-text-muted hover:text-text-dark'}`}>Mes Patients</button>
                  <button onClick={() => setViewMode('equipe')} className={`py-2 px-3.5 rounded-lg border-none font-bold text-[13px] cursor-pointer transition-all ${viewMode === 'equipe' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-text-muted hover:text-text-dark'}`}>Vue Équipe</button>
                </div>
                <div className="flex items-center bg-white border border-border rounded-xl py-2 px-4 min-w-[240px] shadow-sm focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <Search size={18} className="text-primary" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher patient..." className="border-none bg-transparent outline-none ml-2.5 w-full font-sans text-sm text-text-dark" />
                </div>
              </div>
            </header>

            <StatsCards stats={STATS} onSelectPatient={handleSelectPatient} />
            
            {filteredPatients.length === 0 && !searchTerm ? (
              <div className="mt-12 text-center p-12 bg-white rounded-[40px] border-2 border-dashed border-slate-100 max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Search size={40} className="opacity-20" />
                </div>
                <h3 className="text-2xl font-serif font-black text-text-dark mb-4">Bienvenue dans votre espace clinique</h3>
                <p className="text-text-muted mb-8 leading-relaxed">
                  Votre espace est prêt ! Commencez par ajouter votre premier patient pour activer le suivi post-opératoire intelligent.
                </p>
                <button 
                  onClick={() => setIsAddPatientOpen(true)}
                  className="px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 mx-auto shadow-button transition-all"
                >
                  + Ajouter un patient
                </button>
              </div>
            ) : (
              <PatientList 
                patients={filteredPatients} 
                searchTerm={searchTerm} 
                onSelectPatient={handleSelectPatient} 
                onAddPatient={() => setIsAddPatientOpen(true)} 
                viewMode={viewMode} 
              />
            )}
          </motion.div>
        ) : (
          /* PATIENT DETAIL VIEW */
          <PatientDetail 
            currentPatient={currentPatient} 
            onBack={() => setSelectedPatientId(null)}
          />
        )}
      </div>

      <AddPatientModal isOpen={isAddPatientOpen} onClose={() => setIsAddPatientOpen(false)} />
    </div>
  );
}
