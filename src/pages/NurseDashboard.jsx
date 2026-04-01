import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { statusConfig, countryCodes, interventionLabels, chirurgienLabels } from '../data/mockData';
import StatusBadge from '../components/StatusBadge';
import NavItem from '../components/NavItem';
import AlertCenter from '../components/AlertCenter';
import { Search, Bell, LogOut, CheckSquare, Image as ImageIcon, LayoutDashboard, Users, Plus, X, MessageCircle, AlertTriangle, Send, Mail, Phone, AtSign } from 'lucide-react';

export default function NurseDashboard({ patients, alerts, setAlerts, toggleTask, addNote, addPatient, addCustomTask, sendMessage, user, logout }) {
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('checklist');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('mes_patients');
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'alerts'
  
  // Forms
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    name: '', intervention: '', chirurgien: '', email: '',
    phoneCode: '+32', phoneNumber: '', whatsapp: ''
  });
  const [noteInput, setNoteInput] = useState('');
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [customTaskDay, setCustomTaskDay] = useState(7);
  const [customTaskWho, setCustomTaskWho] = useState('patient');
  const [messageInput, setMessageInput] = useState('');

  // Email toast
  const [emailToasts, setEmailToasts] = useState([]);
  const prevAlertCount = useRef(alerts.length);

  // Always derive currentPatient from the live patients array
  const currentPatient = selectedPatientId ? patients.find(p => p.id === selectedPatientId) : null;

  // Team Filtering (FIXED: proper parentheses)
  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.intervention.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = viewMode === 'equipe' || (p.assignedTo === (user?.name || 'Kevin M.'));
    return matchesSearch && matchesTeam;
  });

  const STATS = {
    total: filteredPatients.length,
    complication: filteredPatients.filter(p => p.status === "complication").length,
    attention: filteredPatients.filter(p => p.status === "attention").length,
  };

  // Email toast only for NEW alerts (not initial batch)
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
    setNoteInput('');
    setActiveTab('checklist');
    setSidebarOpen(false);
  };

  const handleAddPatientSubmit = (e) => {
    e.preventDefault();
    if (newPatientForm.name && newPatientForm.intervention) {
      const phone = `${newPatientForm.phoneCode} ${newPatientForm.phoneNumber}`;
      addPatient({
        ...newPatientForm,
        phone,
        whatsapp: newPatientForm.whatsapp || phone.replace(/\s/g, ''),
      });
      setIsAddPatientOpen(false);
      setNewPatientForm({ name: '', intervention: '', chirurgien: '', email: '', phoneCode: '+32', phoneNumber: '', whatsapp: '' });
    }
  };

  const handleAddNote = () => {
    if (noteInput.trim() && currentPatient) {
      addNote(currentPatient.id, noteInput);
      setNoteInput('');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background-main)', position: 'relative' }}>
      
      {/* Email Toasts */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence>
          {emailToasts.map(toast => (
            <motion.div key={toast.id} initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
              style={{ background: '#1e293b', color: 'white', padding: '12px 20px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
              <Mail size={16} /> {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40, backdropFilter: 'blur(2px)' }} />}

      {/* Sidebar */}
      <div className="sidebar" style={{
        width: 250, background: 'white', borderRight: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column', padding: '24px 16px',
        position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 45
      }}>
        <div style={{ marginBottom: 32, padding: '0 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-primary), #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18 }}>+</div>
            PostOp
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, marginLeft: 46, fontWeight: 600, letterSpacing: 0.5 }}>CLINIQUE CHURCHILL</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          <NavItem icon={<LayoutDashboard size={20} />} label="Tableau de bord" active={activeView === 'dashboard' && !currentPatient} onClick={() => { setSelectedPatientId(null); setActiveView('dashboard'); setSidebarOpen(false); }} />
          <NavItem icon={<Users size={20} />} label="Dossiers Patients" active={!!currentPatient} onClick={() => {}} />
          
          <div style={{ position: 'relative' }}>
            <NavItem icon={<Bell size={20} />} label="Centre d'Alertes" active={activeView === 'alerts'} onClick={() => {
              setSelectedPatientId(null);
              setActiveView('alerts');
              setSidebarOpen(false);
            }} />
            {alerts.length > 0 && (
              <div style={{ position: 'absolute', right: 16, top: 12, background: '#ef4444', color: 'white', minWidth: 20, height: 20, borderRadius: 10, fontSize: 11, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                {alerts.length}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: 16, background: 'var(--color-primary-light)', border: '1px solid #d0ece8', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14 }}>
            {(user?.name || 'K').split(' ').map(n => n[0]).join('')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-primary-dark)' }}>{user?.name || "Infirmière"}</div>
            <div style={{ fontSize: 11, color: 'var(--color-primary)', opacity: 0.8 }}>Infirmier(e) Coord.</div>
          </div>
          <LogOut size={16} color="var(--color-primary)" style={{ cursor: 'pointer' }} onClick={logout} title="Déconnexion" />
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '32px 40px', marginLeft: 250, maxWidth: 1100 }} className="main-content">
        {/* ALERT CENTER VIEW */}
        {activeView === 'alerts' && !currentPatient ? (
          <AlertCenter alerts={alerts} setAlerts={setAlerts} patients={patients} onSelectPatient={handleSelectPatient} />
        ) : !currentPatient ? (
          /* ========== DASHBOARD VIEW ========== */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, marginBottom: 8 }}>Tableau de bord</h1>
                <p style={{ color: 'var(--text-muted)' }}>Bienvenue {user?.name?.split(' ')[0] || ''}. Voici vos priorités.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 12, padding: 3 }}>
                  <button onClick={() => setViewMode('mes_patients')} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: viewMode === 'mes_patients' ? 'white' : 'transparent', fontWeight: 600, fontSize: 13, color: viewMode === 'mes_patients' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer', boxShadow: viewMode === 'mes_patients' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s' }}>Mes Patients</button>
                  <button onClick={() => setViewMode('equipe')} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: viewMode === 'equipe' ? 'white' : 'transparent', fontWeight: 600, fontSize: 13, color: viewMode === 'equipe' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer', boxShadow: viewMode === 'equipe' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s' }}>Vue Équipe</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border-color)', borderRadius: 12, padding: '8px 16px', width: 240 }} className="card-shadow">
                  <Search size={18} color="var(--color-primary)" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher patient..." style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: 10, width: '100%', fontFamily: 'var(--font-sans)', fontSize: 14 }} />
                </div>
              </div>
            </header>

            {/* Top Priority Alerts */}
            {alerts.filter(a => !a.silent || a.type === 'danger').length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 16, padding: 20, marginBottom: 24 }}>
                <h3 style={{ color: '#b91c1c', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><AlertTriangle size={18} /> Alertes Prioritaires</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alerts.filter(a => !a.silent || a.type === 'danger').slice(0, 5).map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: "10px 16px", borderRadius: 10, borderLeft: `4px solid ${a.type === 'danger' ? '#ef4444' : (a.type==='warning'?'#f59e0b':'#10b981')}`, gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{a.message}</span>
                      {a.patientId && (
                        <button onClick={() => {
                          const p = patients.find(pat => pat.id === a.patientId);
                          if(p) handleSelectPatient(p);
                        }} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, padding: '6px 12px', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap' }}>Voir</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
              <div style={{ background: 'var(--color-primary-light)', borderRadius: 20, padding: 24 }} className="card-shadow">
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-primary)' }}>{STATS.total}</div>
                <div style={{ fontSize: 14, color: 'var(--color-primary)', fontWeight: 600, marginTop: 4 }}>Patients suivis</div>
              </div>
              <div style={{ background: 'var(--status-attention-bg)', borderRadius: 20, padding: 24 }} className="card-shadow">
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--status-attention-text)' }}>{STATS.complication + STATS.attention}</div>
                <div style={{ fontSize: 14, color: 'var(--status-attention-text)', fontWeight: 600, marginTop: 4 }}>Action requise</div>
              </div>
            </div>

            {/* Patient List */}
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid var(--border-color)', overflow: 'hidden' }} className="card-shadow">
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Liste de suivi {searchTerm && `— "${searchTerm}"`}</h2>
                <button onClick={() => setIsAddPatientOpen(true)} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}><Plus size={16} /> Nouveau Patient</button>
              </div>
              
              {filteredPatients.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Aucun patient trouvé.</div>
              ) : (
                [...filteredPatients].sort((a, b) => {
                  const order = { complication: 0, attention: 1, normal: 2 };
                  return order[a.status] - order[b.status];
                }).map((p) => (
                  <motion.div key={p.id} whileHover={{ backgroundColor: '#f8fffe' }} onClick={() => handleSelectPatient(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: statusConfig[p.status].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: statusConfig[p.status].color, flexShrink: 0 }}>
                      {p.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {p.name}
                        {viewMode === 'equipe' && <span style={{ fontSize: 11, background: '#e2e8f0', padding: '2px 8px', borderRadius: 6 }}>{p.assignedTo}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{p.intervention} · J+{p.jourPostOp} · {p.date}</div>
                    </div>
                    {p.messages.length > 0 && <MessageCircle size={16} color="var(--color-primary)" style={{ opacity: 0.4 }} />}
                    <StatusBadge status={p.status} />
                    <span style={{ color: '#cbd5e1', fontSize: 20 }}>›</span>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          /* ========== PATIENT DETAIL VIEW ========== */
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* TopBar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
              <button onClick={() => setSelectedPatientId(null)} style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10 }}>
                ‹ Retour
              </button>
              <Link to={`/patient/${currentPatient.token}`} target="_blank" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'white', background: 'var(--color-primary)', padding: '8px 16px', borderRadius: 10, textDecoration: 'none' }}>
                Simuler App Patient ↗
              </Link>
            </div>

            {/* Patient Info Card */}
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid var(--border-color)', padding: 28, marginBottom: 20 }} className="card-shadow">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: 4 }}>{currentPatient.name}</h1>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    {currentPatient.intervention} · {currentPatient.chirurgien} · Opéré(e) le {currentPatient.date}
                  </div>
                </div>
                <StatusBadge status={currentPatient.status} />
              </div>
              
              {/* Contact Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                {currentPatient.phone && (
                  <a href={`tel:${currentPatient.phone.replace(/\s/g, '')}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                    <Phone size={16} /> {currentPatient.phone}
                  </a>
                )}
                {currentPatient.whatsapp && (
                  <a href={`https://wa.me/${currentPatient.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    💬 WhatsApp
                  </a>
                )}
                {currentPatient.email && (
                  <a href={`mailto:${currentPatient.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    <AtSign size={16} /> {currentPatient.email}
                  </a>
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--color-primary-light)', padding: '16px 20px', borderRadius: 12, border: '1px solid #d0ece8', minWidth: 130 }}>
                  <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Jour Post-Op</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-primary-dark)' }}>J+{currentPatient.jourPostOp}</div>
                </div>
                <div style={{ flex: 1, minWidth: 250, background: '#f8fafc', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Notes cliniques</div>
                  <div style={{ fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.5, background: 'white', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 10 }}>"{currentPatient.notes}"</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={noteInput} onChange={(e)=>setNoteInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }} placeholder="Nouvelle observation..." style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                    <button onClick={handleAddNote} disabled={!noteInput.trim()} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 600, cursor: noteInput.trim()?'pointer':'not-allowed', opacity: noteInput.trim()?1:0.4, fontSize: 13 }}>Ajouter</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[
                { key: 'checklist', icon: <CheckSquare size={16} />, label: 'Protocole' },
                { key: 'photos', icon: <ImageIcon size={16} />, label: `Photos (${currentPatient.photos.length})` },
                { key: 'messages', icon: <MessageCircle size={16} />, label: `Messages (${currentPatient.messages.length})` },
              ].map(tab => (
                <button key={tab.key} onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key === 'messages') setAlerts(a => a.filter(al => al.patientId !== currentPatient.id || al.id.toString().startsWith('late_')));
                }} style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: activeTab===tab.key?'var(--color-primary)':'white', color: activeTab===tab.key?'white':'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, transition: 'all 0.2s', boxShadow: activeTab !== tab.key ? '0 1px 3px rgba(0,0,0,0.04)' : 'none' }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ background: 'white', borderRadius: 20, border: '1px solid var(--border-color)', padding: 28 }} className="card-shadow">
              
              {/* CHECKLIST TAB */}
              {activeTab === 'checklist' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 style={{ fontSize: 17, marginBottom: 16 }}>Validation Clinique & Patient</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                    {currentPatient.checklist.map(c => {
                      const late = !c.done && c.jourPostOpRef !== null && (currentPatient.jourPostOp - c.jourPostOpRef > 3);
                      return (
                        <div key={c.id} onClick={() => toggleTask(currentPatient.id, c.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, background: c.done ? 'var(--status-normal-bg)' : (late ? '#fef2f2' : '#f8fafc'), border: c.done ? '1px solid #d1fae5' : (late ? '1px solid #fca5a5' : '1px solid var(--border-color)'), cursor: 'pointer', transition: 'all 0.15s' }}>
                          <input type="checkbox" checked={c.done} readOnly style={{ width: 20, height: 20, accentColor: 'var(--status-normal-text)', cursor: 'pointer', pointerEvents: 'none' }} />
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: c.done ? 'var(--status-normal-text)' : (late ? '#b91c1c' : 'var(--text-dark)'), textDecoration: c.done ? 'line-through' : 'none' }}>
                              {c.label}
                              {c.patientCanCheck && <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: 8, color: 'var(--color-primary)', fontWeight: 600 }}>Patient</span>}
                              {late && <span style={{ marginLeft: 8, fontSize: 11, background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>RETARD +3J</span>}
                            </span>
                            <span style={{ fontSize: 12, color: late ? '#b91c1c' : 'var(--text-muted)', fontWeight: 600 }}>{c.jour}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Custom Task Programming */}
                  <div style={{ padding: 20, border: '2px dashed var(--color-primary)', borderRadius: 16, background: 'var(--color-primary-light)' }}>
                    <h4 style={{ fontSize: 14, color: 'var(--color-primary-dark)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={16}/> Programmation Supplémentaire</h4>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <input type="text" value={customTaskInput} onChange={e=>setCustomTaskInput(e.target.value)} placeholder="Ex : Retirer fils suture" style={{ flex: 1, minWidth: 180, padding: '10px 14px', borderRadius: 10, border: '1px solid #d0ece8', fontSize: 13, outline: 'none' }} />
                      <select value={customTaskDay} onChange={e=>setCustomTaskDay(Number(e.target.value))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d0ece8', fontSize: 13 }}>
                        {[1,3,5,7,10,14,21,30].map(d => <option key={d} value={d}>J+{d}</option>)}
                      </select>
                      <select value={customTaskWho} onChange={e=>setCustomTaskWho(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d0ece8', fontSize: 13 }}>
                        <option value="patient">Par le patient</option>
                        <option value="nurse">Par l'équipe</option>
                      </select>
                      <button onClick={() => {
                        if(customTaskInput.trim()) { addCustomTask(currentPatient.id, customTaskInput, customTaskWho === 'patient', customTaskDay); setCustomTaskInput(''); }
                      }} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Programmer</button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* MESSAGES TAB */}
              {activeTab === 'messages' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', height: 420 }}>
                  <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', padding: 20, borderRadius: 16, marginBottom: 14, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {currentPatient.messages.length === 0 ? (
                      <p style={{textAlign:'center', color:'var(--text-muted)', marginTop: 40}}>Aucun message échangé avec {currentPatient.name.split(' ')[0]}.</p>
                    ) : currentPatient.messages.map((m, i) => (
                      <div key={i} style={{ alignSelf: m.from === 'nurse' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                        <div style={{ background: m.from === 'nurse' ? 'var(--color-primary)' : 'white', color: m.from === 'nurse' ? 'white' : 'var(--text-dark)', padding: '12px 16px', borderRadius: 16, borderBottomRightRadius: m.from === 'nurse' ? 4 : 16, borderBottomLeftRadius: m.from === 'nurse' ? 16 : 4, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: m.from === 'patient' ? '1px solid #e2e8f0' : 'none', fontSize: 14, lineHeight: 1.5 }}>
                          {m.text}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: m.from === 'nurse' ? 'right' : 'left' }}>
                          {m.from === 'nurse' ? 'Vous' : currentPatient.name.split(' ')[0]} · {new Date(m.timestamp).toLocaleTimeString('fr-BE', {hour: '2-digit', minute:'2-digit', timeZone: 'Europe/Brussels'})}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="text" value={messageInput} onChange={e=>setMessageInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter' && messageInput.trim()){sendMessage(currentPatient.id, messageInput, 'nurse'); setMessageInput('');}}} placeholder="Envoyer un message sécurisé..." style={{ flex: 1, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 14, outline: 'none' }} />
                    <button onClick={()=>{if(messageInput.trim()){sendMessage(currentPatient.id, messageInput, 'nurse'); setMessageInput('');}}} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '0 20px', borderRadius: 12, cursor: 'pointer' }}><Send size={18}/></button>
                  </div>
                </motion.div>
              )}
              
              {/* PHOTOS TAB */}
              {activeTab === 'photos' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 style={{ fontSize: 17, marginBottom: 16 }}>Suivi photographique</h3>
                  {currentPatient.photos.length === 0 ? (
                    <div style={{ padding: 40, background: '#f8fafc', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Le patient n'a pas encore partagé de photos.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                      {currentPatient.photos.map((photo, i) => (
                        <div key={i} style={{ aspectRatio: '3/4', borderRadius: 14, background: 'linear-gradient(135deg, var(--color-primary-light), #b8e0da)', position: 'relative', overflow: 'hidden', border: '1px solid #d0ece8' }}>
                          <div style={{ fontSize: 40, opacity: 0.15, position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>📷</div>
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(15,95,84,0.85))', padding: '30px 12px 14px', color: 'white' }}>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{photo.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {isAddPatientOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setIsAddPatientOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              style={{ background: 'white', padding: 32, borderRadius: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}
              className="card-shadow"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--text-dark)' }}>Créer Dossier Patient</h2>
                <button onClick={() => setIsAddPatientOpen(false)} style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <form onSubmit={handleAddPatientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Nom complet *</label>
                  <input required value={newPatientForm.name} onChange={e=>setNewPatientForm({...newPatientForm, name: e.target.value})} type="text" placeholder="Ex: Jean Dupont" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Intervention(s) * <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>— séparer par virgule si plusieurs</span></label>
                  <input required list="intervention-list" value={newPatientForm.intervention} onChange={e=>setNewPatientForm({...newPatientForm, intervention: e.target.value})} type="text" placeholder="Ex: Rhinoplastie, Blépharoplastie" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 14, outline: 'none' }} />
                  <datalist id="intervention-list">{interventionLabels.map(l=><option key={l} value={l} />)}</datalist>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Chirurgien</label>
                  <input list="chirurgien-list" value={newPatientForm.chirurgien} onChange={e=>setNewPatientForm({...newPatientForm, chirurgien: e.target.value})} type="text" placeholder="Ex: Dr. Renaud" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 14, outline: 'none' }} />
                  <datalist id="chirurgien-list">{chirurgienLabels.map(l=><option key={l} value={l} />)}</datalist>
                </div>
                
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Coordonnées Patient</p>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>E-mail</label>
                  <input value={newPatientForm.email} onChange={e=>setNewPatientForm({...newPatientForm, email: e.target.value})} type="email" placeholder="patient@email.com" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Téléphone</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={newPatientForm.phoneCode} onChange={e=>setNewPatientForm({...newPatientForm, phoneCode: e.target.value})} style={{ padding: '12px 10px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 13, minWidth: 130 }}>
                      {countryCodes.map(cc => <option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>)}
                    </select>
                    <input value={newPatientForm.phoneNumber} onChange={e=>setNewPatientForm({...newPatientForm, phoneNumber: e.target.value})} type="tel" placeholder="475 12 34 56" style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 14, outline: 'none' }} />
                  </div>
                </div>
                
                <button type="submit" style={{ marginTop: 8, width: '100%', padding: 16, background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 4px 12px rgba(15,95,84,0.3)' }}>Créer le dossier</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); width: 260px !important; }
          .main-content { padding: 20px 16px !important; margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
