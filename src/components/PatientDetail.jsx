import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Phone, AtSign, CheckSquare, Image as ImageIcon, MessageCircle, Plus, Send, Mail, UserCheck, TrendingUp, Columns } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAlertContext } from '../context/AlertContext';
import { statusConfig } from '../data/constants';
import PainChart from './PainChart';

export default function PatientDetail({ currentPatient, onBack }) {
  const { toggleTask, addNote, addCustomTask, sendMessage, updatePatientStatus, invitePatient } = useData();
  const { clearPatientAlerts } = useAlertContext();

  const [activeTab, setActiveTab] = useState('checklist');
  const [noteInput, setNoteInput] = useState('');
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [customTaskDay, setCustomTaskDay] = useState(7);
  const [customTaskWho, setCustomTaskWho] = useState('patient');
  const [messageInput, setMessageInput] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]); // max 2 photo ids

  // ─── Notes chronologiques ───
  const notes = Array.isArray(currentPatient.notes) ? currentPatient.notes : [];

  const handleAddNote = () => {
    if (noteInput.trim()) {
      addNote(currentPatient.id, noteInput.trim());
      setNoteInput('');
    }
  };

  // ─── Invitation patient ───
  const handleInvite = async () => {
    setInviting(true);
    setInviteMsg(null);
    const result = await invitePatient(currentPatient.id);
    setInviting(false);
    if (result?.error) {
      const msg = result.error.message || '';
      if (msg.includes('409') || msg.includes('already')) {
        setInviteMsg({ type: 'info', text: 'Ce patient a déjà activé son compte.' });
      } else {
        setInviteMsg({ type: 'error', text: 'Erreur lors de l\'envoi. Vérifiez l\'adresse email.' });
      }
    } else {
      setInviteMsg({ type: 'success', text: 'Invitation envoyée avec succès !' });
    }
    setTimeout(() => setInviteMsg(null), 4000);
  };

  const inviteButtonState = () => {
    if (!currentPatient.email) return null;
    if (currentPatient.auth_user_id) return 'activated';
    if (currentPatient.invited_at) return 'reinvite';
    return 'invite';
  };
  const btnState = inviteButtonState();

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      {/* TopBar */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2.5">
        <button onClick={onBack} className="bg-primary-light text-primary hover:bg-[#d0ece8] border-none cursor-pointer font-semibold text-sm flex items-center gap-1.5 py-2 px-4 rounded-xl transition-colors">
          ‹ Retour
        </button>
        <Link to={`/patient/${currentPatient.token}`} target="_blank" className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-primary hover:bg-primary-dark py-2 px-4 rounded-xl no-underline transition-colors shadow-sm">
          Simuler App Patient ↗
        </Link>
      </div>

      {/* Patient Info Card */}
      <div className="card p-7 mb-5 shadow-sm">
        <div className="flex justify-between items-start mb-5 gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-[26px] mb-1 font-bold">{currentPatient.name}</h1>
            <div className="text-sm text-text-muted font-medium">
              {currentPatient.intervention} · {currentPatient.chirurgien} · Opéré(e) le {currentPatient.date}
            </div>
          </div>
          {/* Statut modifiable */}
          <select
            value={currentPatient.status}
            onChange={e => updatePatientStatus(currentPatient.id, e.target.value)}
            style={{
              color: statusConfig[currentPatient.status]?.color,
              background: statusConfig[currentPatient.status]?.bg,
            }}
            className="py-1.5 px-3 rounded-xl text-[13px] font-bold border cursor-pointer outline-none focus:ring-1 focus:ring-primary/20 border-current/30"
          >
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Contact + Invitation */}
        <div className="flex gap-2.5 flex-wrap mb-5">
          {currentPatient.phone && (
            <a href={`tel:${currentPatient.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold no-underline hover:bg-emerald-100 transition-colors">
              <Phone size={16} /> {currentPatient.phone}
            </a>
          )}
          {currentPatient.whatsapp && (
            <a href={`https://wa.me/${currentPatient.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold no-underline hover:bg-emerald-100 transition-colors">
              💬 WhatsApp
            </a>
          )}
          {currentPatient.email && (
            <a href={`mailto:${currentPatient.email}`} className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[13px] font-semibold no-underline hover:bg-blue-100 transition-colors">
              <AtSign size={16} /> {currentPatient.email}
            </a>
          )}

          {/* Bouton invitation */}
          {btnState === 'activated' && (
            <span className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-primary-light border border-primary/30 text-primary text-[13px] font-bold">
              <UserCheck size={16} /> Compte activé
            </span>
          )}
          {(btnState === 'invite' || btnState === 'reinvite') && (
            <button
              onClick={handleInvite}
              disabled={inviting}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-colors disabled:opacity-60
                ${btnState === 'reinvite'
                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  : 'bg-primary text-white hover:bg-primary-dark shadow-sm'}`}
            >
              <Mail size={16} />
              {inviting ? 'Envoi...' : btnState === 'reinvite' ? 'Renvoi d\'invitation' : 'Inviter sur l\'app'}
            </button>
          )}
          {!currentPatient.email && (
            <span className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-400 text-[13px] font-semibold italic">
              Aucun email — invitation impossible
            </span>
          )}
        </div>

        {inviteMsg && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className={`mb-4 px-4 py-2.5 rounded-xl text-[13px] font-bold
              ${inviteMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : inviteMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
            {inviteMsg.text}
          </motion.div>
        )}

        <div className="flex gap-4 flex-wrap">
          <div className="bg-primary-light p-4 rounded-xl border border-primary/20 min-w-[130px]">
            <div className="text-[11px] text-primary font-bold uppercase tracking-wide mb-1">Jour Post-Op</div>
            <div className="text-3xl font-extrabold text-primary-dark">J+{currentPatient.jourPostOp}</div>
          </div>

          {currentPatient.painScores && currentPatient.painScores.length > 0 && (() => {
            const latestPain = currentPatient.painScores[currentPatient.painScores.length - 1];
            const isHigh = latestPain.score >= 6;
            return (
              <div className={`p-4 rounded-xl border min-w-[130px] ${isHigh ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-border'}`}>
                <div className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${isHigh ? 'text-red-700' : 'text-text-muted'}`}>Dernière Douleur</div>
                <div className={`text-3xl font-extrabold ${isHigh ? 'text-red-600' : 'text-text-dark'}`}>
                  {latestPain.score}<span className="text-lg opacity-50">/10</span>
                </div>
                <div className={`text-[11px] font-semibold mt-1 ${isHigh ? 'text-red-600/70' : 'text-text-muted'}`}>Saisie J+{latestPain.jour}</div>
              </div>
            );
          })()}

          {/* Notes cliniques chronologiques */}
          <div className="flex-1 min-w-[250px] bg-slate-50 p-4 rounded-xl border border-border">
            <div className="text-[11px] text-text-muted font-bold uppercase tracking-wide mb-2">Notes cliniques</div>
            {notes.length === 0 ? (
              <p className="text-sm text-text-muted italic mb-2.5">Aucune observation enregistrée.</p>
            ) : (
              <div className="max-h-[140px] overflow-y-auto flex flex-col gap-2 mb-2.5 pr-1">
                {notes.map((n, i) => (
                  <div key={i} className="bg-white p-2.5 rounded-lg border border-border shadow-sm">
                    <p className="text-sm text-text-dark font-medium leading-relaxed">{n.text}</p>
                    <p className="text-[10px] text-text-muted font-semibold mt-1">
                      {n.author} · {new Date(n.ts).toLocaleString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
                placeholder="Nouvelle observation..."
                className="flex-1 py-2 px-3 border border-border rounded-lg text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteInput.trim()}
                className={`bg-primary text-white border-none px-4 rounded-lg font-bold text-[13px] transition-all ${noteInput.trim() ? 'cursor-pointer opacity-100 hover:bg-primary-dark' : 'cursor-not-allowed opacity-40'}`}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { key: 'checklist', icon: <CheckSquare size={16} />, label: 'Protocole' },
          { key: 'evolution', icon: <TrendingUp size={16} />, label: 'Évolution' },
          { key: 'photos', icon: <ImageIcon size={16} />, label: `Photos (${currentPatient.photos.length})` },
          { key: 'messages', icon: <MessageCircle size={16} />, label: `Messages (${currentPatient.messages.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => {
            setActiveTab(tab.key);
            if (tab.key === 'messages') clearPatientAlerts(currentPatient.id);
          }} className={`py-2.5 px-4.5 rounded-xl border-none font-bold flex items-center gap-2 cursor-pointer text-[13px] transition-all whitespace-nowrap
            ${activeTab === tab.key ? 'bg-primary text-white shadow-md' : 'bg-white text-text-muted shadow-sm hover:text-text-dark hover:bg-slate-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card p-7 shadow-sm">

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-[17px] mb-4 font-bold text-text-dark">Validation Clinique & Patient</h3>
            <div className="flex flex-col gap-2.5 mb-7">
              {currentPatient.checklist.map(c => {
                const late = !c.done && c.jourPostOpRef !== null && (currentPatient.jourPostOp - c.jourPostOpRef > 3);
                return (
                  <div key={c.id} onClick={() => toggleTask(currentPatient.id, c.id)} className={`flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all border
                    ${c.done ? 'bg-status-normal-bg border-emerald-200 hover:bg-emerald-100' :
                     (late ? 'bg-status-complication-bg border-red-300 hover:bg-red-100' : 'bg-slate-50 border-border hover:bg-slate-100')}`}>
                    <input type="checkbox" checked={c.done} readOnly className="w-5 h-5 accent-status-normal cursor-pointer pointer-events-none rounded sm:text-sm" />
                    <div className="flex-1 flex justify-between items-center flex-wrap gap-2">
                      <span className={`font-semibold text-sm flex items-center flex-wrap gap-2
                        ${c.done ? 'text-status-normal line-through' : (late ? 'text-red-700' : 'text-text-dark')}`}>
                        {c.label}
                        {c.patientCanCheck && <span className="text-[11px] bg-primary-light text-primary px-2 py-0.5 rounded-lg font-bold">Patient</span>}
                        {late && <span className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-lg font-bold tracking-wide">RETARD +3J</span>}
                      </span>
                      <span className={`text-xs font-bold ${late ? 'text-red-700' : 'text-text-muted'}`}>{c.jour}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Task Programming */}
            <div className="p-5 border-2 border-dashed border-primary/40 rounded-2xl bg-primary-light/50">
              <h4 className="text-sm text-primary-dark mb-3 flex items-center gap-2 font-bold"><Plus size={16}/> Programmation Supplémentaire</h4>
              <div className="flex gap-2.5 flex-wrap">
                <input type="text" value={customTaskInput} onChange={e=>setCustomTaskInput(e.target.value)} placeholder="Ex : Retirer fils suture" className="flex-1 min-w-[180px] py-2.5 px-3.5 rounded-xl border border-primary/20 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                <select value={customTaskDay} onChange={e=>setCustomTaskDay(Number(e.target.value))} className="py-2.5 px-3 rounded-xl border border-primary/20 text-[13px] bg-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20">
                  {[1,3,5,7,10,14,21,30].map(d => <option key={d} value={d}>J+{d}</option>)}
                </select>
                <select value={customTaskWho} onChange={e=>setCustomTaskWho(e.target.value)} className="py-2.5 px-3 rounded-xl border border-primary/20 text-[13px] bg-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20">
                  <option value="patient">Par le patient</option>
                  <option value="nurse">Par l'équipe</option>
                </select>
                <button onClick={() => {
                  if(customTaskInput.trim()) { addCustomTask(currentPatient.id, customTaskInput, customTaskWho === 'patient', customTaskDay); setCustomTaskInput(''); }
                }} className="bg-primary hover:bg-primary-dark text-white border-none py-2.5 px-4 rounded-xl font-bold cursor-pointer text-[13px] transition-colors shadow-sm">Programmer</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ÉVOLUTION TAB */}
        {activeTab === 'evolution' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-[17px] mb-2 font-bold text-text-dark">Évolution de la douleur</h3>
            <p className="text-sm text-text-muted mb-5">Scores déclarés par le patient au fil des jours post-opératoires.</p>
            <PainChart painScores={currentPatient.painScores} height={180} />
          </motion.div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[420px]">
            <div className="flex-1 overflow-y-auto bg-slate-50 p-5 rounded-2xl mb-3.5 border border-border flex flex-col gap-2.5">
              {currentPatient.messages.length === 0 ? (
                <p className="text-center text-text-muted mt-10 font-medium">Aucun message échangé avec {currentPatient.name.split(' ')[0]}.</p>
              ) : currentPatient.messages.map((m, i) => (
                <div key={i} className={`max-w-[75%] ${m.from === 'nurse' ? 'self-end' : 'self-start'}`}>
                  <div className={`py-3 px-4 rounded-[16px] shadow-sm text-sm leading-relaxed font-medium
                    ${m.from === 'nurse' ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-text-dark border border-border rounded-bl-sm'}`}>
                    {m.text}
                  </div>
                  <div className={`text-[10px] text-text-muted mt-1 font-semibold ${m.from === 'nurse' ? 'text-right' : 'text-left'}`}>
                    {m.from === 'nurse' ? 'Vous' : currentPatient.name.split(' ')[0]} · {new Date(m.timestamp).toLocaleTimeString('fr-BE', {hour: '2-digit', minute:'2-digit', timeZone: 'Europe/Brussels'})}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2.5">
              <input type="text" value={messageInput} onChange={e=>setMessageInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter' && messageInput.trim()){sendMessage(currentPatient.id, messageInput, 'nurse'); setMessageInput('');}}} placeholder="Envoyer un message sécurisé..." className="flex-1 py-3 px-4 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white" />
              <button onClick={()=>{if(messageInput.trim()){sendMessage(currentPatient.id, messageInput, 'nurse'); setMessageInput('');}}} className="bg-primary hover:bg-primary-dark text-white border-none px-5 rounded-xl cursor-pointer transition-colors shadow-sm flex items-center justify-center">
                <Send size={18}/>
              </button>
            </div>
          </motion.div>
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="text-[17px] font-bold text-text-dark">Suivi photographique</h3>
              {currentPatient.photos.length >= 2 && (
                <button
                  onClick={() => { setCompareMode(m => !m); setCompareIds([]); }}
                  className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-colors
                    ${compareMode ? 'bg-primary text-white' : 'bg-slate-100 text-text-muted hover:bg-slate-200'}`}>
                  <Columns size={15} /> {compareMode ? 'Quitter comparaison' : 'Comparer'}
                </button>
              )}
            </div>

            {currentPatient.photos.length === 0 ? (
              <div className="p-10 bg-slate-50 rounded-2xl text-center text-text-muted font-medium border border-border">Le patient n'a pas encore partagé de photos.</div>
            ) : (
              <>
                {/* Panneau de comparaison côte à côte */}
                {compareMode && compareIds.length === 2 && (() => {
                  const p1 = currentPatient.photos.find(p => p.id === compareIds[0]);
                  const p2 = currentPatient.photos.find(p => p.id === compareIds[1]);
                  return (
                    <div className="grid grid-cols-2 gap-3 mb-5 p-4 bg-primary-light/30 rounded-2xl border border-primary/20">
                      <div>
                        <p className="text-[11px] font-bold text-primary uppercase tracking-wide mb-2 text-center">Photo A</p>
                        {p1 && <PhotoCard photo={p1} />}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-primary uppercase tracking-wide mb-2 text-center">Photo B</p>
                        {p2 && <PhotoCard photo={p2} />}
                      </div>
                    </div>
                  );
                })()}

                {compareMode && compareIds.length < 2 && (
                  <p className="text-[13px] text-text-muted font-semibold mb-3 bg-slate-50 p-3 rounded-xl border border-border">
                    Sélectionnez {2 - compareIds.length} photo{compareIds.length === 0 ? '(s)' : ''} à comparer.
                  </p>
                )}

                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
                  {currentPatient.photos.map((photo, i) => {
                    const isSelected = compareIds.includes(photo.id);
                    const selIdx = compareIds.indexOf(photo.id);
                    return (
                      <div key={photo.id || i}
                        onClick={() => {
                          if (!compareMode) return;
                          if (isSelected) {
                            setCompareIds(ids => ids.filter(id => id !== photo.id));
                          } else if (compareIds.length < 2) {
                            setCompareIds(ids => [...ids, photo.id]);
                          }
                        }}
                        className={`relative ${compareMode ? 'cursor-pointer' : ''}`}>
                        <PhotoCard photo={photo} />
                        {compareMode && (
                          <div className={`absolute inset-0 rounded-2xl border-2 transition-all flex items-center justify-center
                            ${isSelected ? 'border-primary bg-primary/10' : 'border-transparent hover:border-primary/40'}`}>
                            {isSelected && (
                              <span className="w-7 h-7 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center shadow-md">
                                {selIdx + 1}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Helper: Photo card with signed URL ───
function PhotoCard({ photo }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!photo.storage_path) return;
    import('../lib/supabase').then(({ supabase }) => {
      supabase.storage.from('patient-photos')
        .createSignedUrl(photo.storage_path, 3600)
        .then(({ data }) => { if (data?.signedUrl) setUrl(data.signedUrl); });
    });
  }, [photo.storage_path]);

  return (
    <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-primary-light to-accent/20 relative overflow-hidden border border-primary/20 shadow-sm">
      {url ? (
        <img src={url} alt={photo.label} className="w-full h-full object-cover" />
      ) : (
        <div className="text-4xl opacity-15 absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2">📷</div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/90 to-transparent pt-8 pb-3.5 px-3 text-white">
        <div className="text-sm font-bold tracking-wide">{photo.label || `J+${photo.jour}`}</div>
      </div>
    </div>
  );
}
