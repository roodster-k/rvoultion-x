import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NurseDashboard from './pages/NurseDashboard.jsx';
import PatientPortal from './pages/PatientPortal.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { initialPatients } from './data/mockData.js';

function App() {
  const [patients, setPatients] = useState(initialPatients);
  const [alerts, setAlerts] = useState([]);
  const [user, setUser] = useState(null);
  const alertsInitialized = useRef(false);

  // --- ENGINE: Lateness Alerts (> 3 Days) ---
  useEffect(() => {
    const latenessAlerts = [];
    patients.forEach(p => {
      p.checklist.forEach(c => {
        if (!c.done && c.jourPostOpRef !== null) {
          const delay = p.jourPostOp - c.jourPostOpRef;
          if (delay > 3) {
            latenessAlerts.push({
              id: `late_${p.id}_${c.id}`,
              type: 'danger',
              title: 'Retard de Protocole',
              message: `[${p.name}] "${c.label}" — retard de ${delay} jours (Prévu J+${c.jourPostOpRef}, Actuel J+${p.jourPostOp}).`,
              patientId: p.id,
              date: new Date().toISOString(),
              silent: !alertsInitialized.current // Mark initial lateness alerts as silent (no email toast)
            });
          }
        }
      });
    });
    
    setAlerts(prev => {
      const nonLatenessAlerts = prev.filter(a => !a.id.toString().startsWith('late_'));
      return [...latenessAlerts, ...nonLatenessAlerts];
    });
    alertsInitialized.current = true;
  }, [patients]);
  
  // --- MUTATION: Toggle Task ---
  const toggleTask = (patientId, taskId, isPatientAction = false) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      const task = p.checklist.find(c => c.id === taskId);
      if (!task) return p;
      const isNowDone = !task.done;
      
      if (isPatientAction && isNowDone) {
        setAlerts(a => [{
          id: `action_${Date.now()}`,
          type: 'info',
          title: 'Action Patient',
          message: `${p.name} a complété : "${task.label}"`,
          patientId: p.id,
          date: new Date().toISOString()
        }, ...a]);
      }
      return {
        ...p,
        checklist: p.checklist.map(c => c.id === taskId ? { ...c, done: isNowDone } : c)
      };
    }));
  };

  // --- MUTATION: Add Custom Task ---
  const addCustomTask = (patientId, label, isForPatient, targetJourNumber) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return { 
        ...p, 
        checklist: [...p.checklist, {
          id: `c_custom_${Date.now()}`,
          label,
          done: false,
          jourPostOpRef: targetJourNumber,
          jour: `J+${targetJourNumber}`,
          patientCanCheck: isForPatient
        }]
      };
    }));
  };

  // --- MUTATION: Messages ---
  const sendMessage = (patientId, text, sender = 'nurse') => {
    const newMsg = { from: sender, text, timestamp: new Date().toISOString() };
    
    // Generate alert separately to avoid setState-in-setState issues
    if (sender === 'patient') {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setAlerts(a => [{
          id: `msg_${Date.now()}`,
          type: 'warning',
          title: 'Nouveau Message Patient',
          message: `${patient.name} vous a envoyé un message.`,
          patientId: patient.id,
          date: new Date().toISOString()
        }, ...a]);
      }
    }
    
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return { ...p, messages: [...p.messages, newMsg] };
    }));
  };

  // --- MUTATION: Add Photo ---
  const addPhoto = (patientId, photoLabel) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setAlerts(a => [{
        id: `photo_${Date.now()}`,
        type: 'success',
        title: 'Photo reçue',
        message: `${patient.name} a envoyé une nouvelle photo.`,
        patientId: patient.id,
        date: new Date().toISOString()
      }, ...a]);
    }
    
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return { ...p, photos: [...p.photos, { jour: p.jourPostOp, label: photoLabel }] };
    }));
  };

  // --- MUTATION: Add Note ---
  const addNote = (patientId, noteText) => {
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, notes: noteText } : p));
  };

  // --- MUTATION: Add Patient ---
  const addPatient = (newPatient) => {
    const id = patients.length ? Math.max(...patients.map(p => p.id)) + 1 : 1;
    const fullPatient = {
      id,
      name: newPatient.name,
      intervention: newPatient.intervention,
      chirurgien: newPatient.chirurgien || 'Dr. Renaud',
      assignedTo: user?.name || 'Kevin M.',
      date: new Date().toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' }),
      jourPostOp: 0,
      status: 'normal',
      email: newPatient.email || '',
      phone: newPatient.phone || '',
      whatsapp: newPatient.whatsapp || '',
      notes: 'Nouveau patient enregistré. En attente de suivi.',
      photos: [],
      messages: [],
      checklist: [
        { id: `c_${id}_1`, label: "Vérification des constantes", done: false, jourPostOpRef: 1, jour: "J+1", patientCanCheck: false },
        { id: `c_${id}_2`, label: "Prise d'antalgique si douleur", done: false, jourPostOpRef: null, jour: "Si besoin", patientCanCheck: true },
      ],
      token: `token_${newPatient.name.replace(/\s+/g, '_').toLowerCase()}_${id}`,
    };
    setPatients(prev => [...prev, fullPatient]);
  };

  // --- ROUTING ---
  return (
    <BrowserRouter>
      <Routes>
        {/* Patient portal routes are always accessible — no login needed */}
        <Route 
          path="/patient/:token" 
          element={<PatientPortal 
            patients={patients} 
            toggleTask={(pid, tid) => toggleTask(pid, tid, true)}
            addPhoto={addPhoto}
            sendMessage={sendMessage}
          />} 
        />

        {/* Nurse routes require authentication */}
        {!user ? (
          <>
            <Route path="*" element={<LoginPage onLogin={(userData) => setUser(userData)} />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard/*" 
              element={<NurseDashboard 
                patients={patients} 
                alerts={alerts}
                setAlerts={setAlerts}
                toggleTask={toggleTask}
                addCustomTask={addCustomTask}
                addNote={addNote}
                addPatient={addPatient}
                sendMessage={sendMessage}
                user={user}
                logout={() => setUser(null)}
              />} 
            />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
