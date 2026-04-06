import NavItem from './NavItem';
import { LayoutDashboard, Users, Bell, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlertContext } from '../context/AlertContext';

export default function Sidebar({ 
  activeView, setActiveView, currentPatient,
  setSelectedPatientId, setSidebarOpen, sidebarOpen
}) {
  const { user, profile, clinicSettings, logout } = useAuth();
  const { alerts } = useAlertContext();

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'clinic_admin';

  return (
    <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="mb-8 px-2 flex items-center gap-3">
        {clinicSettings?.logo_url ? (
          <img src={clinicSettings.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-xl" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex flex-shrink-0 items-center justify-center text-white text-lg shadow-sm font-serif">
            +
          </div>
        )}
        <div className="overflow-hidden">
          <div className="text-[20px] font-black font-serif text-primary truncate leading-none mb-1">
            PostOp
          </div>
          <div className="text-[11px] text-text-muted font-semibold tracking-wide uppercase truncate leading-none">
            {clinicSettings?.name || 'Ma Clinique'}
          </div>
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

        {isAdmin && (
          <NavItem icon={<Settings size={20} />} label="Paramètres Clinique" active={activeView === 'settings'} onClick={() => {
            setSelectedPatientId(null);
            setActiveView('settings');
            setSidebarOpen(false);
          }} />
        )}
      </div>

      <div className="p-4 rounded-2xl bg-primary-light border border-primary-hover flex items-center gap-3 transition-colors hover:bg-primary-hover mt-4">
        <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
          {(user?.name || 'K').split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="font-bold text-[13px] text-primary-dark truncate">{user?.name || "Soignant"}</div>
          <div className="text-[11px] text-primary/80 font-medium truncate">
            {profile?.role === 'clinic_admin' ? 'Admin' : profile?.role === 'surgeon' ? 'Chirurgien' : 'Infirmier(e)'}
          </div>
        </div>
        <LogOut size={18} className="text-primary cursor-pointer hover:text-primary-dark transition-colors flex-shrink-0 ml-1" onClick={logout} title="Déconnexion" />
      </div>
    </div>
  );
}
