import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Camera, Info, ShieldCheck, AlertCircle, Loader2, MessageCircle, Send } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function PatientPortal({ patients, toggleTask, addPhoto, sendMessage }) {
  const { token } = useParams();
  const patient = patients.find(p => p.token === token);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'photos' | 'messages'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [messageInput, setMessageInput] = useState('');

  if (!patient) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background-main)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: 40, background: 'white', borderRadius: 20, textAlign: 'center', maxWidth: 400 }}
          className="card-shadow"
        >
          <div style={{ color: 'var(--status-complication-text)', marginBottom: 16 }}>
             <AlertCircle size={48} style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>Lien expiré ou invalide</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Pour des raisons de sécurité, ce lien d'accès a expiré. Veuillez contacter la clinique pour en recevoir un nouveau.</p>
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
    <div style={{ minHeight: '100vh', background: 'var(--background-main)', paddingBottom: 60 }}>
      {/* Header Mobile / Patient */}
      <header style={{ background: 'white', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'linear-gradient(135deg, var(--color-primary), #10b981)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>+</div>
          <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>PostOp</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
          <ShieldCheck size={14} /> Données Sécurisées
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px' }}>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Bienvenue */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--text-dark)', marginBottom: 4 }}>Bonjour {patient.name.split(' ')[0]}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Suivi de votre {patient.intervention.toLowerCase()}</p>
          </div>

          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, marginBottom: 24 }} className="card-shadow">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Progression globale</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)' }}>{progressPct}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--color-primary-light)', borderRadius: 10, overflow: 'hidden' }}>
              <motion.div 
                initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 1, ease: "easeOut" }}
                style={{ height: '100%', background: 'linear-gradient(90deg, var(--color-primary), #10b981)', borderRadius: 10 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Pratiqué par</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', marginTop: 2 }}>{patient.chirurgien}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Dernier statut</div>
                <div style={{ marginTop: 2 }}><StatusBadge status={patient.status} /></div>
              </div>
            </div>
          </div>

          {/* Navigation inter-tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            <button onClick={() => setActiveTab('tasks')} style={{
              flex: 1, minWidth: '30%', padding: '12px 6px', borderRadius: 14, border: 'none', background: activeTab === 'tasks' ? 'var(--color-primary)' : 'white',
              color: activeTab === 'tasks' ? 'white' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
              boxShadow: activeTab === 'tasks' ? '0 4px 12px rgba(15,95,84,0.3)' : '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
            }}><Check size={20} /> Tâches</button>
            <button onClick={() => setActiveTab('photos')} style={{
              flex: 1, minWidth: '30%', padding: '12px 6px', borderRadius: 14, border: 'none', background: activeTab === 'photos' ? 'var(--color-primary)' : 'white',
              color: activeTab === 'photos' ? 'white' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
              boxShadow: activeTab === 'photos' ? '0 4px 12px rgba(15,95,84,0.3)' : '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
            }}><Camera size={20} /> Photos</button>
            <button onClick={() => setActiveTab('messages')} style={{
              flex: 1, minWidth: '30%', padding: '12px 6px', borderRadius: 14, border: 'none', background: activeTab === 'messages' ? 'var(--color-primary)' : 'white',
              color: activeTab === 'messages' ? 'white' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
              boxShadow: activeTab === 'messages' ? '0 4px 12px rgba(15,95,84,0.3)' : '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative'
            }}>
              <MessageCircle size={20} />
              Messages
            </button>
          </div>

          {activeTab === 'tasks' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h3 style={{ fontSize: 16, marginBottom: 16, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={18} color="var(--color-primary)" /> À faire par vous
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
                {patient.checklist.filter(c => c.patientCanCheck).length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, background: 'white', borderRadius: 16, border: '1px solid var(--border-color)' }}>Aucune action requise de votre part pour le moment.</div>
                ) : patient.checklist.filter(c => c.patientCanCheck).map((c, i) => (
                  <motion.div key={c.id} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 16,
                      background: c.done ? 'var(--status-normal-bg)' : 'white',
                      border: c.done ? '1px solid #d1fae5' : '1px solid var(--border-color)',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }} className={!c.done ? 'card-shadow' : ''}>
                      <input type="checkbox" checked={c.done} onChange={() => toggleTask(patient.id, c.id)} style={{ width: 24, height: 24, accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: c.done ? 'var(--color-primary)' : 'var(--text-dark)', textDecoration: c.done ? 'line-through' : 'none', opacity: c.done ? 0.7 : 1 }}>
                          {c.label}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.jour}</div>
                      </div>
                    </label>
                  </motion.div>
                ))}
              </div>

              <h3 style={{ fontSize: 16, marginBottom: 16, fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={18} /> Suivi médical (Votre équipe)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {patient.checklist.filter(c => !c.patientCanCheck).map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: c.done ? '#f8fafc' : 'white', border: '1px solid var(--border-color)', opacity: c.done ? 0.6 : 1 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: c.done ? 'var(--status-normal-text)' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10 }}>
                      {c.done && '✓'}
                    </div>
                    <div style={{ flex: 1, fontWeight: 500, fontSize: 14, color: 'var(--text-dark)', textDecoration: c.done ? 'line-through' : 'none' }}>
                      {c.label}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.jour}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'photos' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div style={{ background: 'white', borderRadius: 20, padding: 30, textAlign: 'center', border: '2px dashed var(--color-primary-light)', marginBottom: 24 }}>
                <div style={{ width: 60, height: 60, background: uploadSuccess ? 'var(--status-normal-bg)' : 'var(--color-primary-light)', color: uploadSuccess ? 'var(--status-normal-text)' : 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', transition: 'all 0.3s' }}>
                  {isUploading ? <Loader2 size={28} className="lucide-spin" style={{ animation: 'spin 2s linear infinite' }} /> : (uploadSuccess ? <Check size={28} /> : <Camera size={28} />)}
                  <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--text-dark)' }}>
                  {uploadSuccess ? 'Photo envoyée avec succès !' : 'Envoyer une nouvelle photo'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Photographiez la zone concernée pour permettre à votre chirurgien de contrôler l'évolution locale de manière sécurisée.</p>
                <button 
                  onClick={handleSimulateUpload} disabled={isUploading}
                  style={{ background: isUploading ? 'var(--text-muted)' : 'var(--color-primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: isUploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', width: '100%' }}
                >
                  {isUploading ? 'Analyse et chiffrement...' : 'Prendre ou sélectionner une photo'}
                </button>
              </div>

              <h3 style={{ fontSize: 16, marginBottom: 16, fontFamily: 'var(--font-sans)' }}>Historique des envois</h3>
              {patient.photos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Aucune photo envoyée.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {patient.photos.map((photo, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ aspectRatio: '3/4', borderRadius: 14, background: `linear-gradient(135deg, var(--color-primary-light), var(--color-primary-hover))`, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '30px 12px 10px', color: 'white', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                        {photo.label}
                      </div>
                    </motion.div>
                  )).reverse()}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
              <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', padding: '20px', borderRadius: 20, marginBottom: 16, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ alignSelf: 'center', background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Début de la conversation sécurisée (HDS)</div>
                {patient.messages.length === 0 ? <p style={{textAlign:'center', color:'var(--text-muted)'}}>Aucun message. Vous pouvez poser une question à l'équipe médicale ci-dessous.</p> :
                  patient.messages.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.from === 'patient' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <div style={{ background: m.from === 'patient' ? 'var(--color-primary)' : 'white', color: m.from === 'patient' ? 'white' : 'var(--text-dark)', padding: '12px 16px', borderRadius: 18, borderBottomRightRadius: m.from === 'patient' ? 4 : 18, borderBottomLeftRadius: m.from === 'patient' ? 18 : 4, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: m.from === 'nurse' && '1px solid #e2e8f0', fontSize: 14, lineHeight: 1.4 }}>
                        {m.text}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: m.from === 'patient' ? 'right' : 'left' }}>
                        {new Date(m.timestamp).toLocaleTimeString('fr-BE', {hour: '2-digit', minute:'2-digit', timeZone: 'Europe/Brussels'})}
                      </div>
                    </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, background: 'white', padding: 10, borderRadius: 20, border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <input type="text" value={messageInput} onChange={e=>setMessageInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter' && messageInput.trim()){sendMessage(patient.id, messageInput, 'patient'); setMessageInput('');}}} placeholder="Votre message..." style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: 'none', fontSize: 15, background: 'transparent', outline: 'none' }} />
                <button onClick={()=>{if(messageInput.trim()){sendMessage(patient.id, messageInput, 'patient'); setMessageInput('');}}} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', width: 44, height: 44, borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          )}

        </motion.div>
      </main>
      
      {/* Simulation Banner */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0a4038', color: 'rgba(255,255,255,0.8)', fontSize: 11, padding: '6px', textAlign: 'center', zIndex: 100 }}>
        Vue Patient • SSL/TLS Actif • {new Date().toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' })}
      </div>
    </div>
  );
}
