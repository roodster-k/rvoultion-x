import { useState, useEffect, useRef, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Phone, AtSign, CheckSquare, Image as ImageIcon, MessageCircle, Plus, Send, Mail, UserCheck, TrendingUp, Columns, Printer, CalendarDays, Trash2, Pill, X, FileText, Loader2, Camera, Upload } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useData } from '../context/DataContext';
import { useAlertContext } from '../context/AlertContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { statusConfig } from '../data/constants';
import PainChart from './PainChart';
import useAppointments from '../hooks/useAppointments';
import useMedications from '../hooks/useMedications';
import { supabase } from '../lib/supabase';

export default function PatientDetail({ currentPatient, onBack }) {
  const { toggleTask, addNote, addCustomTask, sendMessage, updatePatientStatus, invitePatient } = useData();
  const { toast } = useToast();
  const { clearPatientAlerts } = useAlertContext();
  const { profile } = useAuth();

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

  // ─── Staff photo upload ───
  const [photoFile, setPhotoFile] = useState(null);
  const [photoNote, setPhotoNote] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const printReportRef = useRef(null);

  // ─── Assign Protocol ───
  const [showAssignProtocol, setShowAssignProtocol] = useState(false);
  const [protocolTemplates, setProtocolTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [assigningProtocol, setAssigningProtocol] = useState(false);
  const [assignError, setAssignError] = useState('');

  useEffect(() => {
    if (!showAssignProtocol || !profile?.clinic_id) return;
    supabase
      .from('protocol_templates')
      .select('id, name, intervention_type, tasks')
      .or(`is_global.eq.true,clinic_id.eq.${profile.clinic_id}`)
      .order('name')
      .then(({ data }) => {
        setProtocolTemplates(data || []);
        // Pre-select first matching template by intervention type
        const match = (data || []).find(t =>
          t.intervention_type?.toLowerCase() === currentPatient.intervention?.toLowerCase()
        );
        setSelectedTemplateId(match?.id || data?.[0]?.id || '');
      });
  }, [showAssignProtocol, profile?.clinic_id, currentPatient.intervention]);

  const handleAssignProtocol = async () => {
    const tpl = protocolTemplates.find(t => t.id === selectedTemplateId);
    if (!tpl?.tasks?.length) { setAssignError('Ce protocole ne contient aucune étape.'); return; }
    setAssigningProtocol(true);
    setAssignError('');
    try {
      const rows = tpl.tasks.map(task => ({
        patient_id: currentPatient.id,
        clinic_id: profile.clinic_id,
        label: task.label,
        description: task.description || null,
        jour_post_op_ref: task.jour_post_op_ref ?? null,
        patient_can_check: task.patient_can_check ?? false,
        sort_order: task.sort_order ?? 0,
        done: false,
      }));
      const { error } = await supabase.from('tasks').insert(rows);
      if (error) throw error;
      window.location.reload();
    } catch (err) {
      console.error('[AssignProtocol]', err);
      setAssignError(err.message || 'Erreur lors de l\'assignation.');
      setAssigningProtocol(false);
    }
  };

  const handleExportPDF = async () => {
    const element = printReportRef.current;
    if (!element) return;
    setExportingPdf(true);
    try {
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `PostOp_${currentPatient.name.replace(/\s+/g, '_')}_rapport.pdf`,
          image: { type: 'jpeg', quality: 0.92 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(element)
        .save();
    } catch (err) {
      console.error('[PDF] Export error:', err);
      // Graceful fallback to browser print
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  // ─── Appointments ───
  const { getPatientAppointments, addAppointment, toggleAppointment, deleteAppointment } = useAppointments();

  // ─── Medications ───
  const { getPatientMedications, getTemplatesForIntervention, addMedication, toggleMedication, deleteMedication, applyTemplate } = useMedications(currentPatient.id);
  const patientMeds = getPatientMedications(currentPatient.id);
  const interventionTemplates = getTemplatesForIntervention(currentPatient.intervention);
  const [medForm, setMedForm] = useState({ name: '', dosage: '', frequency: '', startDay: 0, endDay: '', notes: '' });
  const [medFormOpen, setMedFormOpen] = useState(false);
  const [medSaving, setMedSaving] = useState(false);
  const patientAppts = getPatientAppointments(currentPatient.id);
  const [apptTitle, setApptTitle] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [apptLocation, setApptLocation] = useState('');
  const [apptSaving, setApptSaving] = useState(false);

  const handleAddAppt = async () => {
    if (!apptTitle.trim() || !apptDate) return;
    setApptSaving(true);
    const result = await addAppointment({
      patientId: currentPatient.id,
      title: apptTitle.trim(),
      scheduledAt: new Date(`${apptDate}T${apptTime || '09:00'}`).toISOString(),
      location: apptLocation.trim() || null,
    });
    setApptSaving(false);
    if (result?.error) {
      toast('Erreur lors de la planification du RDV.', 'error');
    } else {
      setApptTitle(''); setApptDate(''); setApptTime(''); setApptLocation('');
      toast('Rendez-vous planifié.', 'success');
    }
  };

  // ─── Messages: auto-scroll + mark-as-read ───
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, currentPatient.messages]);

  useEffect(() => {
    if (activeTab !== 'messages') return;
    // Mark unread patient messages as read in DB
    const unreadIds = currentPatient.messages
      .filter(m => m.from === 'patient' && !m.isRead && m.id && !m.id.startsWith('temp_'))
      .map(m => m.id);
    if (unreadIds.length === 0) return;
    supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
  }, [activeTab, currentPatient.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = currentPatient.messages.filter(m => m.from === 'patient' && !m.isRead).length;

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

  // ─── Log contact event as system message ───
  const logContact = (type, detail) => {
    const labels = {
      phone:     `📞 Appel téléphonique — ${detail}`,
      whatsapp:  `💬 Contact WhatsApp — ${detail}`,
      email:     `📧 Email envoyé à ${detail}`,
    };
    sendMessage(currentPatient.id, labels[type], 'system');
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setPhotoUploading(true);
    const result = await addPhoto(currentPatient.id, { file: photoFile, note: photoNote.trim() || null });
    setPhotoUploading(false);
    if (!result?.error) {
      setPhotoFile(null);
      setPhotoNote('');
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
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
      {/* Print styles */}
      <style>{`
        @media print {
          body * { display: none !important; }
          .print-report, .print-report * { display: block !important; }
          .print-report table { display: table !important; }
          .print-report thead { display: table-header-group !important; }
          .print-report tbody { display: table-row-group !important; }
          .print-report tr { display: table-row !important; }
          .print-report td, .print-report th { display: table-cell !important; }
          .print-report { position: fixed; top: 0; left: 0; width: 100%; padding: 24px; background: white; z-index: 9999; }
        }
      `}</style>

      {/* TopBar */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2.5 no-print">
        <button onClick={onBack} className="bg-primary-light text-primary hover:bg-[#d0ece8] border-none cursor-pointer font-semibold text-sm flex items-center gap-1.5 py-2 px-4 rounded-xl transition-colors">
          ‹ Retour
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-text-muted bg-white hover:bg-slate-50 border border-border py-2 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-60"
          >
            <Printer size={15} /> {exportingPdf ? 'Génération...' : 'Exporter PDF'}
          </button>
          <Link to={`/patient/${currentPatient.token}`} target="_blank" className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-primary hover:bg-primary-dark py-2 px-4 rounded-xl no-underline transition-colors shadow-sm">
            Simuler App Patient ↗
          </Link>
        </div>
      </div>

      {/* Print-only report (off-screen, used for PDF export via html2pdf) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '794px', pointerEvents: 'none', zIndex: -1 }}>
        <PrintReport patient={currentPatient} appointments={patientAppts} medications={patientMeds} ref={printReportRef} />
      </div>

      {/* Patient Info Card */}
      <div className="card p-4 sm:p-7 mb-5 shadow-sm">
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
            <a href={`tel:${currentPatient.phone.replace(/\s/g, '')}`}
              onClick={() => logContact('phone', currentPatient.phone)}
              className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold no-underline hover:bg-emerald-100 transition-colors">
              <Phone size={16} /> {currentPatient.phone}
            </a>
          )}
          {currentPatient.whatsapp && (
            <a href={`https://wa.me/${currentPatient.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => logContact('whatsapp', currentPatient.whatsapp)}
              className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold no-underline hover:bg-emerald-100 transition-colors">
              💬 WhatsApp
            </a>
          )}
          {currentPatient.email && (
            <a href={`mailto:${currentPatient.email}`}
              onClick={() => logContact('email', currentPatient.email)}
              className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[13px] font-semibold no-underline hover:bg-blue-100 transition-colors">
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
          <div className="flex-1 min-w-0 bg-slate-50 p-4 rounded-xl border border-border">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[11px] text-text-muted font-bold uppercase tracking-wide">Notes cliniques</div>
              {notes.length > 3 && (
                <button onClick={() => setNotesExpanded(e => !e)} className="text-[11px] font-bold text-primary hover:text-primary-dark transition-colors">
                  {notesExpanded ? '▲ Réduire' : `▼ Voir tout (${notes.length})`}
                </button>
              )}
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-text-muted italic mb-2.5">Aucune observation enregistrée.</p>
            ) : (
              <div className={`flex flex-col gap-2 mb-2.5 pr-1 ${notesExpanded ? '' : 'max-h-[160px] overflow-y-auto'}`}>
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
          { key: 'rdv', icon: <CalendarDays size={16} />, label: `RDV (${patientAppts.length})` },
          { key: 'traitements', icon: <Pill size={16} />, label: `Traitements (${patientMeds.filter(m => m.is_active).length})` },
          { key: 'photos', icon: <ImageIcon size={16} />, label: `Photos (${currentPatient.photos.length})` },
          { key: 'messages', icon: <MessageCircle size={16} />, label: 'Messages', badge: unreadCount },
        ].map(tab => (
          <button key={tab.key} onClick={() => {
            setActiveTab(tab.key);
            if (tab.key === 'messages') clearPatientAlerts(currentPatient.id);
          }} className={`py-2.5 px-4.5 rounded-xl border-none font-bold flex items-center gap-2 cursor-pointer text-[13px] transition-all whitespace-nowrap
            ${activeTab === tab.key ? 'bg-primary text-white shadow-md' : 'bg-white text-text-muted shadow-sm hover:text-text-dark hover:bg-slate-50'}`}>
            {tab.icon} {tab.label}
            {tab.badge > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 -ml-0.5">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card p-4 sm:p-7 shadow-sm">

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold text-text-dark">Validation Clinique & Patient</h3>
              <button
                onClick={() => { setShowAssignProtocol(p => !p); setAssignError(''); }}
                className="flex items-center gap-1.5 text-[12px] font-bold text-primary bg-primary-light px-3 py-1.5 rounded-lg border-none cursor-pointer hover:bg-primary/10 transition-colors"
              >
                <FileText size={13} /> Assigner un protocole
              </button>
            </div>

            {/* Protocol Assignment Panel */}
            {showAssignProtocol && (
              <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-[12px] font-bold text-blue-700 mb-2.5">Choisir un protocole à appliquer :</p>
                {protocolTemplates.length === 0 ? (
                  <p className="text-[12px] text-blue-500">Chargement des protocoles…</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <select
                      value={selectedTemplateId}
                      onChange={e => setSelectedTemplateId(e.target.value)}
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-400 bg-white"
                    >
                      {protocolTemplates.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.intervention_type} ({t.tasks?.length ?? 0} étapes)
                        </option>
                      ))}
                    </select>
                    {assignError && <p className="text-[12px] text-red-600 font-semibold">{assignError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAssignProtocol(false)}
                        className="px-4 py-2 rounded-lg text-[12px] font-bold text-text-muted bg-white border border-border cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleAssignProtocol}
                        disabled={assigningProtocol || !selectedTemplateId}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold text-white bg-blue-600 hover:bg-blue-700 border-none cursor-pointer disabled:opacity-60 transition-colors"
                      >
                        {assigningProtocol ? <><Loader2 size={13} className="animate-spin" /> Application…</> : 'Appliquer le protocole'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
            <PainChart painScores={currentPatient.painScores} height={180} intervention={currentPatient.intervention} />

            {/* Vitals table — only if at least one entry has temperature or swelling */}
            {currentPatient.painScores?.some(ps => ps.temperature !== null || ps.swellingLevel !== null) && (
              <div className="mt-6">
                <h4 className="text-[13px] font-bold text-text-dark mb-3">Constantes & symptômes déclarés</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        {['Jour', 'Douleur', 'Température', 'Œdème', 'Fièvre', 'Autres symptômes'].map(h => (
                          <th key={h} className="py-2 px-3 text-left font-bold text-text-muted border-b border-border">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...currentPatient.painScores]
                        .sort((a, b) => a.jour - b.jour)
                        .map((ps, i) => {
                          const swellingLabels = ['Aucun', 'Léger', 'Modéré', 'Important'];
                          const tempColor = ps.temperature >= 38 ? 'text-red-600 font-bold' : 'text-text-dark';
                          return (
                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 font-bold text-text-dark">J+{ps.jour}</td>
                              <td className="py-2 px-3">
                                <span className={`font-bold ${ps.score >= 7 ? 'text-red-500' : ps.score >= 4 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                  {ps.score}/10
                                </span>
                              </td>
                              <td className={`py-2 px-3 ${tempColor}`}>
                                {ps.temperature != null ? `${ps.temperature}°C` : '—'}
                              </td>
                              <td className="py-2 px-3 text-text-muted">
                                {ps.swellingLevel != null ? swellingLabels[ps.swellingLevel] ?? '—' : '—'}
                              </td>
                              <td className="py-2 px-3">
                                {ps.hasFever ? <span className="text-red-600 font-bold">Oui</span> : <span className="text-text-muted">Non</span>}
                              </td>
                              <td className="py-2 px-3 text-text-muted max-w-[180px] truncate" title={ps.otherSymptoms}>
                                {ps.otherSymptoms || '—'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* RDV TAB */}
        {activeTab === 'rdv' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-[17px] mb-1 font-bold text-text-dark">Rendez-vous de suivi</h3>
            <p className="text-sm text-text-muted mb-5">Planifiez les consultations et contrôles post-opératoires.</p>

            {/* Appointment list */}
            {patientAppts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-border mb-5">
                <CalendarDays size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
                <p className="text-text-muted font-medium text-sm">Aucun rendez-vous planifié.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 mb-5">
                {patientAppts.map(appt => {
                  const dt = new Date(appt.scheduledAt);
                  const isPast = dt < new Date();
                  return (
                    <div key={appt.id} className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all
                      ${appt.done ? 'bg-slate-50 border-border opacity-60' : isPast ? 'bg-amber-50 border-amber-200' : 'bg-white border-border shadow-sm'}`}>
                      <button onClick={() => toggleAppointment(appt.id)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                          ${appt.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-primary'}`}>
                        {appt.done && <span className="text-[11px] font-bold">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm ${appt.done ? 'line-through text-text-muted' : 'text-text-dark'}`}>
                          {appt.title}
                        </div>
                        <div className="text-[12px] text-text-muted font-semibold mt-0.5">
                          {dt.toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                          {' à '}
                          {dt.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                          {appt.location && <span className="ml-2">· 📍 {appt.location}</span>}
                        </div>
                        {!appt.done && isPast && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">Passé</span>
                        )}
                      </div>
                      <button onClick={() => deleteAppointment(appt.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add appointment form */}
            <div className="p-5 border-2 border-dashed border-primary/40 rounded-2xl bg-primary-light/50">
              <h4 className="text-sm text-primary-dark mb-3 flex items-center gap-2 font-bold">
                <Plus size={16} /> Nouveau rendez-vous
              </h4>
              <div className="flex flex-col gap-2.5">
                <input type="text" value={apptTitle} onChange={e => setApptTitle(e.target.value)}
                  placeholder="Titre (ex : Contrôle cicatrice J+14)"
                  className="py-2.5 px-3.5 rounded-xl border border-primary/20 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white" />
                <div className="flex gap-2.5 flex-wrap">
                  <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)}
                    className="flex-1 min-w-[140px] py-2.5 px-3.5 rounded-xl border border-primary/20 text-[13px] outline-none focus:border-primary bg-white" />
                  <input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)}
                    className="py-2.5 px-3.5 rounded-xl border border-primary/20 text-[13px] outline-none focus:border-primary bg-white" />
                  <input type="text" value={apptLocation} onChange={e => setApptLocation(e.target.value)}
                    placeholder="Lieu (optionnel)"
                    className="flex-1 min-w-[140px] py-2.5 px-3.5 rounded-xl border border-primary/20 text-[13px] outline-none focus:border-primary bg-white" />
                </div>
                <button onClick={handleAddAppt} disabled={!apptTitle.trim() || !apptDate || apptSaving}
                  className={`self-start bg-primary hover:bg-primary-dark text-white border-none py-2.5 px-5 rounded-xl font-bold cursor-pointer text-[13px] transition-colors shadow-sm
                    ${(!apptTitle.trim() || !apptDate) ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  {apptSaving ? 'Enregistrement...' : 'Planifier'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[320px] sm:h-[420px]">
            <div className="flex-1 overflow-y-auto bg-slate-50 p-5 rounded-2xl mb-3.5 border border-border flex flex-col gap-2.5">
              {currentPatient.messages.length === 0 ? (
                <p className="text-center text-text-muted mt-10 font-medium">Aucun message échangé avec {currentPatient.name.split(' ')[0]}.</p>
              ) : currentPatient.messages.map((m, i) => {
                if (m.from === 'system') {
                  return (
                    <div key={m.id || i} className="self-center flex items-center gap-2 py-1.5 px-3.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-text-muted">
                      {m.text}
                      <span className="opacity-50">·</span>
                      <span>{new Date(m.timestamp).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' })}</span>
                    </div>
                  );
                }
                return (
                  <div key={m.id || i} className={`max-w-[75%] ${m.from === 'nurse' ? 'self-end' : 'self-start'}`}>
                    <div className={`py-3 px-4 rounded-[16px] shadow-sm text-sm leading-relaxed font-medium
                      ${m.from === 'nurse' ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-text-dark border border-border rounded-bl-sm'}`}>
                      {m.text}
                    </div>
                    <div className={`text-[10px] text-text-muted mt-1 font-semibold ${m.from === 'nurse' ? 'text-right' : 'text-left'}`}>
                      {m.from === 'nurse' ? 'Vous' : currentPatient.name.split(' ')[0]} · {new Date(m.timestamp).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' })}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2.5">
              <input type="text" value={messageInput} onChange={e=>setMessageInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter' && messageInput.trim()){sendMessage(currentPatient.id, messageInput, 'nurse'); setMessageInput('');}}} placeholder="Envoyer un message sécurisé..." className="flex-1 py-3 px-4 rounded-xl border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white" />
              <button onClick={()=>{if(messageInput.trim()){sendMessage(currentPatient.id, messageInput, 'nurse'); setMessageInput('');}}} className="bg-primary hover:bg-primary-dark text-white border-none px-5 rounded-xl cursor-pointer transition-colors shadow-sm flex items-center justify-center">
                <Send size={18}/>
              </button>
            </div>
          </motion.div>
        )}

        {/* TRAITEMENTS TAB */}
        {activeTab === 'traitements' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Apply template banner */}
            {interventionTemplates.length > 0 && patientMeds.length === 0 && (
              <div className="mb-4 p-4 bg-primary-light border border-primary/20 rounded-[16px] flex items-center justify-between gap-3">
                <div className="text-sm text-primary-dark font-semibold">
                  {interventionTemplates.length} traitement(s) prédéfini(s) pour {currentPatient.intervention}
                </div>
                <button
                  onClick={async () => {
                    const { error } = await applyTemplate(currentPatient.id, currentPatient.intervention);
                    if (error) toast(error, 'error');
                    else toast(`${interventionTemplates.length} traitement(s) appliqué(s).`, 'success');
                  }}
                  className="bg-primary text-white border-none px-4 py-2 rounded-xl text-sm font-bold cursor-pointer hover:bg-primary-dark transition-colors shrink-0 shadow-sm">
                  Appliquer
                </button>
              </div>
            )}

            {/* Medication list */}
            <div className="flex flex-col gap-2.5 mb-5">
              {patientMeds.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm border-2 border-dashed border-border rounded-[16px]">
                  Aucun traitement enregistré.
                </div>
              ) : patientMeds.map(med => (
                <div key={med.id} className={`bg-white rounded-[14px] border p-4 flex items-start gap-3 ${!med.is_active ? 'opacity-50 border-border' : 'border-primary/20 shadow-sm'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${med.is_active ? 'bg-primary-light text-primary' : 'bg-slate-100 text-slate-400'}`}>
                    <Pill size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px] text-text-dark flex items-center gap-2 flex-wrap">
                      {med.name}
                      {!med.is_active && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Arrêté</span>}
                    </div>
                    <div className="text-[12px] text-text-muted font-medium mt-0.5 space-y-0.5">
                      {med.dosage && <span className="mr-3">{med.dosage}</span>}
                      {med.frequency && <span className="mr-3">· {med.frequency}</span>}
                      {med.end_day != null && <span>· Jusqu'à J+{med.end_day}</span>}
                    </div>
                    {med.prescribed_by_user?.full_name && (
                      <div className="text-[11px] text-text-muted/70 mt-1">Prescrit par {med.prescribed_by_user.full_name}</div>
                    )}
                    {med.notes && <div className="text-[12px] italic text-text-muted mt-1">{med.notes}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => toggleMedication(med.id)} title={med.is_active ? 'Arrêter' : 'Réactiver'}
                      className="p-1.5 rounded-lg bg-transparent border-none cursor-pointer text-text-muted hover:text-primary hover:bg-primary-light transition-colors">
                      {med.is_active ? <X size={15} /> : <CheckSquare size={15} />}
                    </button>
                    <button onClick={() => deleteMedication(med.id)} title="Supprimer"
                      className="p-1.5 rounded-lg bg-transparent border-none cursor-pointer text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add medication form */}
            <div className="bg-white rounded-[16px] border border-border shadow-sm overflow-hidden">
              <button onClick={() => setMedFormOpen(o => !o)}
                className="w-full flex justify-between items-center px-5 py-4 cursor-pointer bg-transparent border-none text-left hover:bg-slate-50 transition-colors">
                <span className="font-bold text-[14px] text-text-dark flex items-center gap-2">
                  <Plus size={16} className="text-primary" /> Ajouter un traitement
                </span>
                <span className="text-text-muted text-sm">{medFormOpen ? '▲' : '▼'}</span>
              </button>
              {medFormOpen && (
                <div className="px-5 pb-5 border-t border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 mb-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[12px] font-bold text-text-dark mb-1">Médicament *</label>
                      <input value={medForm.name} onChange={e => setMedForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ex : Amoxicilline"
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-text-dark mb-1">Dosage</label>
                      <input value={medForm.dosage} onChange={e => setMedForm(p => ({ ...p, dosage: e.target.value }))}
                        placeholder="Ex : 500mg"
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-text-dark mb-1">Fréquence</label>
                      <input value={medForm.frequency} onChange={e => setMedForm(p => ({ ...p, frequency: e.target.value }))}
                        placeholder="Ex : 3x/jour"
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-text-dark mb-1">Début (J+)</label>
                      <input type="number" min="0" value={medForm.startDay} onChange={e => setMedForm(p => ({ ...p, startDay: Number(e.target.value) }))}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-text-dark mb-1">Fin (J+, optionnel)</label>
                      <input type="number" min="0" value={medForm.endDay} onChange={e => setMedForm(p => ({ ...p, endDay: e.target.value }))}
                        placeholder="Vide = indéfini"
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[12px] font-bold text-text-dark mb-1">Notes (optionnel)</label>
                      <input value={medForm.notes} onChange={e => setMedForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Instructions particulières..."
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setMedFormOpen(false)}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-text-muted border border-border bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                      Annuler
                    </button>
                    <button
                      disabled={!medForm.name.trim() || medSaving}
                      onClick={async () => {
                        setMedSaving(true);
                        const { error } = await addMedication({
                          patientId: currentPatient.id,
                          name: medForm.name,
                          dosage: medForm.dosage,
                          frequency: medForm.frequency,
                          startDay: medForm.startDay,
                          endDay: medForm.endDay ? Number(medForm.endDay) : null,
                          notes: medForm.notes,
                        });
                        setMedSaving(false);
                        if (error) { toast('Erreur lors de l\'ajout.', 'error'); }
                        else { setMedForm({ name: '', dosage: '', frequency: '', startDay: 0, endDay: '', notes: '' }); setMedFormOpen(false); toast('Traitement ajouté.', 'success'); }
                      }}
                      className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark border-none cursor-pointer disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5">
                      <Plus size={15} /> {medSaving ? 'Ajout...' : 'Ajouter'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="text-[17px] font-bold text-text-dark">Suivi photographique</h3>
              <div className="flex items-center gap-2">
                {currentPatient.photos.length >= 2 && (
                  <button
                    onClick={() => { setCompareMode(m => !m); setCompareIds([]); }}
                    className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-colors
                      ${compareMode ? 'bg-primary text-white' : 'bg-slate-100 text-text-muted hover:bg-slate-200'}`}>
                    <Columns size={15} /> {compareMode ? 'Quitter comparaison' : 'Comparer'}
                  </button>
                )}
                <label
                  htmlFor="staff-photo-upload"
                  className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-[13px] font-bold bg-primary-light text-primary hover:bg-primary/10 cursor-pointer transition-colors"
                >
                  <Camera size={14} /> Ajouter une photo
                </label>
              </div>
            </div>

            {/* Staff upload form */}
            {photoFile && (
              <div className="mb-5 p-4 bg-slate-50 border border-border rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                    <ImageIcon size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-text-dark truncate">{photoFile.name}</p>
                    <p className="text-[11px] text-text-muted">{(photoFile.size / 1024).toFixed(0)} Ko</p>
                  </div>
                  <button onClick={() => { setPhotoFile(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                    className="p-1.5 text-text-muted hover:text-red-500 bg-transparent border-none cursor-pointer rounded-lg hover:bg-red-50 transition-colors">
                    <X size={15} />
                  </button>
                </div>
                <input
                  type="text"
                  value={photoNote}
                  onChange={e => setPhotoNote(e.target.value)}
                  placeholder="Note / description (optionnel)…"
                  className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                <button
                  onClick={handlePhotoUpload}
                  disabled={photoUploading}
                  className="flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white border-none rounded-xl font-bold text-[13px] cursor-pointer disabled:opacity-60 transition-colors shadow-sm"
                >
                  {photoUploading ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours…</> : <><Upload size={14} /> Enregistrer la photo</>}
                </button>
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={photoInputRef}
              id="staff-photo-upload"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) setPhotoFile(e.target.files[0]); }}
            />

            {currentPatient.photos.length === 0 ? (
              <div className="p-10 bg-slate-50 rounded-2xl text-center text-text-muted font-medium border border-border">
                <Camera size={28} className="mx-auto mb-3 opacity-30" />
                <p>Aucune photo dans le dossier.</p>
                <p className="text-[12px] mt-1">Utilisez "Ajouter une photo" ou invitez le patient à partager les siennes.</p>
              </div>
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

                <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3.5">
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

// ─── Print-only patient report ───
const PrintReport = forwardRef(function PrintReport({ patient, appointments, medications }, ref) {
  const notes = Array.isArray(patient.notes) ? patient.notes : [];
  const doneTasks = patient.checklist?.filter(t => t.done) || [];
  const pendingTasks = patient.checklist?.filter(t => !t.done) || [];
  const lastPain = patient.painScores?.length
    ? patient.painScores[patient.painScores.length - 1]
    : null;

  return (
    <div ref={ref} className="print-report" style={{ fontFamily: 'serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #0f5f54', paddingBottom: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f5f54' }}>PostOp — Rapport de suivi</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Généré le {new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
          Document confidentiel — usage médical
        </div>
      </div>

      {/* Patient info */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>{patient.name}</div>
        <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ color: '#64748b', paddingRight: 16, paddingBottom: 4, fontWeight: 600 }}>Intervention</td>
              <td style={{ paddingBottom: 4 }}>{patient.intervention}</td>
              <td style={{ color: '#64748b', paddingRight: 16, paddingLeft: 24, paddingBottom: 4, fontWeight: 600 }}>Chirurgien</td>
              <td style={{ paddingBottom: 4 }}>{patient.chirurgien}</td>
            </tr>
            <tr>
              <td style={{ color: '#64748b', paddingRight: 16, paddingBottom: 4, fontWeight: 600 }}>Date opération</td>
              <td style={{ paddingBottom: 4 }}>{patient.date}</td>
              <td style={{ color: '#64748b', paddingRight: 16, paddingLeft: 24, paddingBottom: 4, fontWeight: 600 }}>Jour post-op</td>
              <td style={{ paddingBottom: 4 }}>J+{patient.jourPostOp}</td>
            </tr>
            <tr>
              <td style={{ color: '#64748b', paddingRight: 16, fontWeight: 600 }}>Statut</td>
              <td style={{ textTransform: 'capitalize', fontWeight: 700 }}>{patient.status}</td>
              {lastPain && <>
                <td style={{ color: '#64748b', paddingRight: 16, paddingLeft: 24, fontWeight: 600 }}>Dernière douleur</td>
                <td style={{ fontWeight: 700, color: lastPain.score >= 7 ? '#ef4444' : lastPain.score >= 4 ? '#f59e0b' : '#10b981' }}>
                  {lastPain.score}/10 (J+{lastPain.jour})
                </td>
              </>}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pain scores table */}
      {patient.painScores?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f5f54', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
            Évolution de la douleur
          </div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Jour', 'Score', 'Température', 'Œdème', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...patient.painScores].sort((a, b) => a.jour - b.jour).map((ps, i) => {
                const swellingLabels = ['Aucun', 'Léger', 'Modéré', 'Important'];
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 600 }}>J+{ps.jour}</td>
                    <td style={{ padding: '5px 8px', fontWeight: 800, color: ps.score >= 7 ? '#ef4444' : ps.score >= 4 ? '#f59e0b' : '#10b981' }}>
                      {ps.score}/10
                    </td>
                    <td style={{ padding: '5px 8px', color: ps.temperature >= 38 ? '#ef4444' : '#64748b', fontWeight: ps.temperature >= 38 ? 700 : 400 }}>
                      {ps.temperature != null ? `${ps.temperature}°C` : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', color: '#64748b' }}>
                      {ps.swellingLevel != null ? swellingLabels[ps.swellingLevel] ?? '—' : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', color: '#64748b' }}>{ps.notes || ps.otherSymptoms || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tasks */}
      {patient.checklist?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f5f54', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
            Protocole — {doneTasks.length}/{patient.checklist.length} tâches complétées
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {patient.checklist.map((t, i) => (
              <div key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                <span style={{ color: t.done ? '#10b981' : '#cbd5e1', fontSize: 14 }}>{t.done ? '☑' : '☐'}</span>
                <span style={{ color: t.done ? '#64748b' : '#1e293b', textDecoration: t.done ? 'line-through' : 'none' }}>
                  {t.label} <span style={{ color: '#94a3b8' }}>({t.jour})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appointments */}
      {appointments?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f5f54', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
            Rendez-vous ({appointments.length})
          </div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Titre', 'Date', 'Lieu', 'Statut'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...appointments].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).map((appt, i) => {
                const dt = new Date(appt.scheduledAt);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 600 }}>{appt.title}</td>
                    <td style={{ padding: '5px 8px' }}>
                      {dt.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' '}
                      {dt.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '5px 8px', color: '#64748b' }}>{appt.location || '—'}</td>
                    <td style={{ padding: '5px 8px', color: appt.done ? '#10b981' : '#64748b', fontWeight: appt.done ? 700 : 400 }}>
                      {appt.done ? 'Effectué' : 'Planifié'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Medications */}
      {medications?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f5f54', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
            Traitements prescrits ({medications.length})
          </div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Médicament', 'Dosage', 'Fréquence', 'Durée', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medications.map((med, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '5px 8px', fontWeight: 600 }}>{med.name}</td>
                  <td style={{ padding: '5px 8px', color: '#64748b' }}>{med.dosage || '—'}</td>
                  <td style={{ padding: '5px 8px', color: '#64748b' }}>{med.frequency || '—'}</td>
                  <td style={{ padding: '5px 8px', color: '#64748b' }}>
                    {med.start_day != null ? `J+${med.start_day}` : '—'}
                    {med.end_day != null ? ` → J+${med.end_day}` : ''}
                  </td>
                  <td style={{ padding: '5px 8px', color: '#94a3b8', fontSize: 11 }}>{med.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Clinical notes */}
      {notes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f5f54', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
            Notes cliniques ({notes.length})
          </div>
          {notes.map((n, i) => (
            <div key={i} style={{ marginBottom: 6, paddingLeft: 10, borderLeft: '2px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#1e293b' }}>{n.text}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                {n.author} · {new Date(n.ts).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 8, fontSize: 10, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
        <span>PostOp — Suivi post-opératoire</span>
        <span>Document généré automatiquement — Ne pas diffuser sans autorisation médicale</span>
      </div>
    </div>
  );
});

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

  // Determine if label is a note (not just a day label)
  const dayLabel = photo.jour != null ? `J+${photo.jour}` : null;
  const hasNote = photo.label && photo.label !== dayLabel;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary-light to-accent/20 border border-primary/20 shadow-sm overflow-hidden">
      <div className="aspect-[3/4] relative">
        {url ? (
          <img src={url} alt={photo.label} className="w-full h-full object-cover" />
        ) : (
          <div className="text-4xl opacity-15 absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2">📷</div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/90 to-transparent pt-8 pb-3 px-3 text-white">
          <div className="text-[12px] font-bold tracking-wide">{dayLabel || 'Photo'}</div>
        </div>
      </div>
      {hasNote && (
        <div className="px-3 py-2 bg-white border-t border-primary/10">
          <p className="text-[11px] text-text-muted font-medium leading-snug line-clamp-2">{photo.label}</p>
        </div>
      )}
    </div>
  );
}
