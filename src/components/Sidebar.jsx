import NavItem from './NavItem';
import { LayoutDashboard, Users, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlertContext } from '../context/AlertContext';

export default function Sidebar({ 
  activeView, setActiveView, currentPatient,
  setSelectedPatientId, setSidebarOpen
}) {
  const { user, logout } = useAuth();
  const { alerts } = useAlertContext();

  return (
    <div className="sidebar">
      <div className="mb-8 px-2">
        <div className="text-[22px] font-black font-serif text-primary flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-lg shadow-sm">
            +
          </div>
          PostOp
        </div>
        <div className="text-[11px] text-text-muted mt-1 ml-[46px] font-semibold tracking-wide uppercase">
          Clinique Churchill
        </div>
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        <NavItem icon={<LayoutDashboard size={20} />} label="Tableau de bord" active={activeView === 'dashboard' && !currentPatient} onClick={() => { setSelectedPatientId(null); setActiveView('dashboard'); setSidebarOpen(false); }} />
        <NavItem icon={<Users size={20} />} label="Dossiers Patients" active={!!currentPatient} onClick={() => {}} />
        
        <div className="relative">
          <NavItem icon={<Bell size={20} />} label="Centre d'Alertes" active={activeView === 'alerts'} onClick={() => {
            setSelectedPatientId(null);
            setActiveView('alerts');
            setSidebarOpen(false);
          }} />
          {alerts.length > 0 && (
            <div className="absolute right-4 top-3 bg-status-complication text-white min-w-[20px] h-5 rounded-full text-[11px] font-bold flex items-center justify-center px-1.5 shadow-sm">
              {alerts.length}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-primary-light border border-primary-hover flex items-center gap-3 transition-colors hover:bg-primary-hover">
        <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm">
          {(user?.name || 'K').split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1">
          <div className="font-bold text-[13px] text-primary-dark">{user?.name || "Infirmière"}</div>
          <div className="text-[11px] text-primary/80 font-medium">Infirmier(e) Coord.</div>
        </div>
        <LogOut size={16} className="text-primary cursor-pointer hover:text-primary-dark transition-colors" onClick={logout} title="Déconnexion" />
      </div>
    </div>
  );
}
