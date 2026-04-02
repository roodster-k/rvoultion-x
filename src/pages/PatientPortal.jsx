import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Camera, Info, ShieldCheck, AlertCircle, Loader2, MessageCircle, Send } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { usePatientContext } from '../context/PatientContext';
import { useData } from '../context/DataContext';

export default function PatientPortal() {
  const { token } = useParams();
  const { patients, loading } = usePatientContext();
  const { toggleTask, addPhoto, sendMessage } = useData();

  const patient = patients.find(p => p.token === token);
  const [activeTab, setActiveTab] = useState('tasks');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [messageInput, setMessageInput] = useState('');

  // Loading state while Supabase fetches data
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-main">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-text-muted text-sm font-medium">Chargement de votre dossier…</p>
        </motion.div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-main p-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-10 bg-white rounded-[20px] text-center max-w-[400px] shadow-card w-full">
          <div className="text-status-complication mb-4 flex justify-center">
             <AlertCircle size={48} />
          </div>
          <h2 className="font-serif text-[22px] mb-2 font-bold text-text-dark">Lien expiré ou invalide</h2>
          <p className="text-text-muted text-[14px] font-medium leading-relaxed">Pour des raisons de sécurité, ce lien d'accès a expiré. Veuillez contacter la clinique pour en recevoir un nouveau.</p>
        </motion.div>
      </div>
    );
  }

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setUploadSuccess(false);
    setTimeout(() => {
      addPhoto(patient.id, `Photo J+${patient.jourPostOp} (${new Date().toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' })})`);
      setIsUploading(false);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }, 1500);
  };

  const progressDone = patient.checklist.filter(c => c.done).length;
  const progressTotal = patient.checklist.length;
  const progressPct = progressTotal === 0 ? 0 : Math.round((progressDone / progressTotal) * 100);

  return (
    <div className="min-h-screen bg-surface-main pb-[60px]">
      {/* Header Mobile / Patient */}
      <header className="bg-white px-5 py-4 border-b border-border flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-primary to-accent w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">+</div>
          <span className="font-extrabold text-primary font-serif text-[18px]">PostOp</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-primary bg-primary-light px-3 py-1.5 rounded-full font-bold shadow-sm">
          <ShieldCheck size={14} /> Données Sécurisées
        </div>
      </header>

      <main className="max-w-[600px] mx-auto p-5 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Bienvenue */}
          <div className="mb-6">
            <h1 className="font-serif text-[26px] text-text-dark mb-1 font-bold">Bonjour {patient.name.split(' ')[0]}</h1>
            <p className="text-text-muted text-[15px] font-medium tracking-wide">Suivi de votre {patient.intervention.toLowerCase()}</p>
          </div>

          <div className="card p-6 mb-6 shadow-sm">
            <div className="flex justify-between mb-4">
              <span className="text-[13px] font-bold text-text-muted uppercase tracking-wide">Progression globale</span>
              <span className="text-[13px] font-extrabold text-primary">{progressPct}%</span>
            </div>
            <div className="h-2.5 bg-primary-light rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              />
            </div>
            <div className="flex justify-between mt-4.5 pt-4.5 border-t border-border">
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider font-bold mb-1">Pratiqué par</div>
                <div className="text-[14px] font-extrabold text-text-dark">{patient.chirurgien}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-text-muted uppercase tracking-wider font-bold mb-1">Dernier statut</div>
                <StatusBadge status={patient.status} />
              </div>
            </div>
          </div>

          {/* Navigation inter-tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { id: 'tasks', icon: <Check size={20} />, label: 'Tâches' },
              { id: 'photos', icon: <Camera size={20} />, label: 'Photos' },
              { id: 'messages', icon: <MessageCircle size={20} />, label: 'Messages' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`
                flex-1 min-w-[30%] py-3 px-1.5 rounded-[14px] border-none font-bold text-[13px] transition-all cursor-pointer flex flex-col items-center gap-1.5
                ${activeTab === tab.id ? 'bg-primary text-white shadow-button' : 'bg-white text-text-muted shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:text-text-dark hover:bg-slate-50'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'tasks' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h3 className="text-[16px] mb-4 font-bold text-text-dark flex items-center gap-2">
                <Check size={18} className="text-primary" /> À faire par vous
              </h3>
              
              <div className="flex flex-col gap-2.5 mb-8">
                {patient.checklist.filter(c => c.patientCanCheck).length === 0 ? (
                  <div className="p-5 text-center text-text-muted text-[14px] bg-white rounded-2xl border border-border font-medium shadow-sm">Aucune action requise de votre part pour le moment.</div>
                ) : patient.checklist.filter(c => c.patientCanCheck).map((c, i) => (
                  <motion.div key={c.id} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}>
                    <label className={`flex items-center gap-3.5 py-4 px-5 rounded-2xl cursor-pointer transition-all border
                      ${c.done ? 'bg-status-normal-bg border-emerald-200 hover:bg-emerald-100' : 'bg-white border-border shadow-sm hover:border-primary/30'}`}>
                      <input type="checkbox" checked={c.done} onChange={() => toggleTask(patient.id, c.id)} className="w-[24px] h-[24px] accent-primary cursor-pointer shrink-0 rounded" />
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-[15px] transition-all
                          ${c.done ? 'text-primary line-through opacity-70' : 'text-text-dark'}`}>
                          {c.label}
                        </div>
                        <div className="text-[12px] text-text-muted mt-0.5 font-semibold tracking-wide">{c.jour}</div>
                      </div>
                    </label>
                  </motion.div>
                ))}
              </div>

              <h3 className="text-[16px] mb-4 font-bold text-text-muted flex items-center gap-2">
                <Info size={18} /> Suivi médical (Votre équipe)
              </h3>
              
              <div className="flex flex-col gap-2">
                {patient.checklist.filter(c => !c.patientCanCheck).map((c) => (
                  <div key={c.id} className={`flex items-center gap-3.5 py-3.5 px-4 rounded-[12px] border border-border transition-all
                    ${c.done ? 'bg-slate-50 opacity-60' : 'bg-white shadow-sm'}`}>
                    <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[10px] shrink-0 font-bold
                      ${c.done ? 'bg-status-normal-text' : 'bg-slate-200'}`}>
                      {c.done && '✓'}
                    </div>
                    <div className={`flex-1 font-semibold text-[14px] ${c.done ? 'line-through text-text-dark' : 'text-text-dark'}`}>
                      {c.label}
                      <div className="text-[11px] text-text-muted mt-0.5 font-medium">{c.jour}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'photos' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="bg-white rounded-[20px] p-8 text-center border-2 border-dashed border-primary-light mb-6 shadow-sm">
                <div className={`w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300
                  ${uploadSuccess ? 'bg-status-normal-bg text-status-normal' : 'bg-primary-light text-primary'}`}>
                  {isUploading ? <Loader2 size={28} className="animate-spin-slow" /> : (uploadSuccess ? <Check size={28} /> : <Camera size={28} />)}
                </div>
                <h3 className="text-[16px] mb-2 font-bold text-text-dark">
                  {uploadSuccess ? 'Photo envoyée avec succès !' : 'Envoyer une nouvelle photo'}
                </h3>
                <p className="text-[13px] text-text-muted mb-5 leading-relaxed font-medium">Photographiez la zone concernée pour permettre à votre chirurgien de contrôler l'évolution locale de manière sécurisée.</p>
                <button 
                  onClick={handleSimulateUpload} disabled={isUploading}
                  className={`w-full py-3 px-6 text-white border-none rounded-xl font-bold text-[14px] transition-all shadow-sm
                    ${isUploading ? 'bg-slate-400 cursor-not-allowed hidden-shadow' : 'bg-primary hover:bg-primary-dark cursor-pointer shadow-button'}`}
                >
                  {isUploading ? 'Analyse et chiffrement...' : 'Prendre ou sélectionner une photo'}
                </button>
              </div>

              <h3 className="text-[16px] mb-4 font-bold text-text-dark">Historique des envois</h3>
              {patient.photos.length === 0 ? (
                <div className="text-center p-5 text-text-muted font-medium bg-white rounded-xl shadow-sm border border-slate-100">Aucune photo envoyée.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {patient.photos.map((photo, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} 
                      className="aspect-[3/4] rounded-[14px] bg-gradient-to-br from-primary-light to-primary-hover relative overflow-hidden shadow-sm border border-primary/20">
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-8 pb-2.5 px-3 text-white text-[12px] font-bold text-center">
                        {photo.label}
                      </div>
                    </motion.div>
                  )).reverse()}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-[60vh] max-h-[600px]">
              <div className="flex-1 overflow-y-auto bg-slate-50 p-5 rounded-[20px] mb-4 border border-border flex flex-col gap-3 shadow-inner">
                <div className="self-center bg-primary-light text-primary-dark py-1.5 px-3 rounded-full text-[11px] font-bold mb-2 shadow-sm">
                  Début de la conversation sécurisée (HDS)
                </div>
                {patient.messages.length === 0 ? <p className="text-center text-text-muted font-medium mt-4">Aucun message. Vous pouvez poser une question à l'équipe médicale ci-dessous.</p> :
                  patient.messages.map((m, i) => (
                    <div key={i} className={`max-w-[80%] ${m.from === 'patient' ? 'self-end' : 'self-start'}`}>
                      <div className={`py-3 px-4 rounded-[18px] shadow-sm text-[14px] leading-relaxed font-medium
                        ${m.from === 'patient' ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-text-dark border border-slate-200 rounded-bl-sm'}`}>
                        {m.text}
                      </div>
                      <div className={`text-[11px] text-text-muted mt-1 font-semibold ${m.from === 'patient' ? 'text-right' : 'text-left'}`}>
                        {new Date(m.timestamp).toLocaleTimeString('fr-BE', {hour: '2-digit', minute:'2-digit', timeZone: 'Europe/Brussels'})}
                      </div>
                    </div>
                ))}
              </div>
              <div className="flex gap-2.5 bg-white p-2.5 rounded-[20px] border border-border shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
                <input type="text" value={messageInput} onChange={e=>setMessageInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter' && messageInput.trim()){sendMessage(patient.id, messageInput, 'patient'); setMessageInput('');}}} placeholder="Votre message..." className="flex-1 py-2.5 px-3.5 rounded-xl border-none text-[15px] bg-transparent outline-none font-medium" />
                <button onClick={()=>{if(messageInput.trim()){sendMessage(patient.id, messageInput, 'patient'); setMessageInput('');}}} className="bg-primary hover:bg-primary-dark text-white border-none w-11 h-11 rounded-xl cursor-pointer flex items-center justify-center transition-colors shadow-sm shrink-0">
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          )}

        </motion.div>
      </main>
      
      {/* Simulation Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a4038] text-white/80 text-[11px] font-bold tracking-wide p-1.5 text-center z-[100] shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
        Vue Patient • SSL/TLS Actif • {new Date().toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' })}
      </div>
    </div>
  );
}
