import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Camera, Info, ShieldCheck, AlertCircle, Loader2, MessageCircle, Send, LogOut, TrendingUp } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import PainChart from '../components/PainChart';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getEducationalContent } from '../data/educationalContent';

/**
 * PatientPortalAuth — Portail patient sécurisé via Supabase Auth.
 * 
 * Contrairement au PatientPortal legacy (token URL), ce portail :
 * - Nécessite une session Supabase Auth active (magic link)
 * - Charge les données directement depuis Supabase (filtré par RLS)
 * - Permet les mutations sécurisées (tâches, messages, photos)
 */
export default function PatientPortalAuth() {
  const { authUser, patientRecord, isPatient, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [painScores, setPainScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [submittingPain, setSubmittingPain] = useState(false);
  // Check-in quotidien étendu
  const [checkinStep, setCheckinStep] = useState(1); // 1=douleur, 2=symptômes
  const [selectedScore, setSelectedScore] = useState(null);
  const [checkinData, setCheckinData] = useState({ temperature: '', swelling_level: null, other_symptoms: '' });

  // ─── Redirect if not authenticated as patient ───
  useEffect(() => {
    if (!authLoading && !authUser) {
      navigate('/', { replace: true });
    }
  }, [authLoading, authUser, navigate]);

  // ─── Fetch patient data ───
  const fetchData = useCallback(async () => {
    if (!authUser) return;

    try {
      // Fetch patient record by auth_user_id
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Fetch related data in parallel
      const [tasksRes, messagesRes, photosRes, painRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('patient_id', patientData.id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('messages')
          .select('*')
          .eq('patient_id', patientData.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('photos')
          .select('*')
          .eq('patient_id', patientData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('pain_scores')
          .select('*')
          .eq('patient_id', patientData.id)
      ]);

      setTasks(tasksRes.data || []);
      setMessages(messagesRes.data || []);
      setPhotos(photosRes.data || []);
      setPainScores(painRes.data || []);
    } catch (err) {
      console.error('[PatientPortalAuth] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (!authLoading && authUser) {
      fetchData();
    }
  }, [authLoading, authUser, fetchData]);

  // ─── Realtime: incoming messages from care team ───
  useEffect(() => {
    if (!patient?.id) return;

    const channel = supabase
      .channel(`messages:patient:${patient.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `patient_id=eq.${patient.id}`,
      }, (payload) => {
        const m = payload.new;
        if (m.sender_type === 'patient') return; // already added optimistically
        setMessages(prev => {
          if (prev.some(msg => msg.id === m.id)) return prev;
          return [...prev, m];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [patient?.id]);

  // ─── Auto-scroll on new messages ───
  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, messages]);

  // ─── Mark staff messages as read when opening messages tab ───
  useEffect(() => {
    if (activeTab !== 'messages' || !patient?.id) return;
    const unreadIds = messages
      .filter(m => m.sender_type !== 'patient' && !m.is_read && m.id && !String(m.id).startsWith('temp_'))
      .map(m => m.id);
    if (unreadIds.length === 0) return;
    supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
  }, [activeTab, patient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Toggle task (patient_can_check only — enforced by RLS) ───
  const handleToggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.patient_can_check) return;

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, done: !t.done, done_at: !t.done ? new Date().toISOString() : null } : t
    ));

    const { error } = await supabase
      .from('tasks')
      .update({
        done: !task.done,
        done_at: !task.done ? new Date().toISOString() : null,
      })
      .eq('id', taskId);

    if (error) {
      console.error('[PatientPortalAuth] Toggle task error:', error);
      fetchData(); // Rollback
    } else if (!task.done) {
      // It was false, now true -> Action Alert
      await supabase.from('alerts').insert({
        clinic_id: patient.clinic_id,
        patient_id: patient.id,
        type: 'action',
        title: 'Action Patient',
        message: `${patient.full_name.split(' ')[0]} a complété : "${task.label}"`
      });
    }
  };

  // ─── Submit check-in complet (douleur + symptômes) ───
  const handleSubmitCheckin = async (score, extraData = {}) => {
    if (!patient) return;
    setSubmittingPain(true);

    const currentJourPostOp = Math.max(
      0,
      Math.floor((new Date() - new Date(patient.surgery_date)) / (1000 * 60 * 60 * 24))
    );
    const hasFever = extraData.temperature ? parseFloat(extraData.temperature) >= 38.0 : false;

    try {
      const { error } = await supabase.from('pain_scores').upsert({
        patient_id: patient.id,
        clinic_id: patient.clinic_id,
        score,
        jour_post_op: currentJourPostOp,
        temperature: extraData.temperature ? parseFloat(extraData.temperature) : null,
        swelling_level: extraData.swelling_level ?? null,
        has_fever: hasFever,
        other_symptoms: extraData.other_symptoms || null,
      }, { onConflict: 'patient_id, jour_post_op' });

      if (error) throw error;

      // Alertes si douleur élevée ou fièvre
      if (score >= 6 || hasFever) {
        const alertTitle = hasFever ? `Fièvre signalée` : `Douleur signalée : ${score}/10`;
        const alertMsg = hasFever
          ? `${patient.full_name.split(' ')[0]} a signalé une fièvre (${extraData.temperature}°C) à J+${currentJourPostOp}.`
          : `Le patient a signalé une douleur de ${score}/10 aujourd'hui.`;
        await supabase.from('alerts').insert({
          clinic_id: patient.clinic_id,
          patient_id: patient.id,
          type: 'action',
          title: alertTitle,
          message: alertMsg,
        });
      }

      setCheckinStep(1);
      setSelectedScore(null);
      setCheckinData({ temperature: '', swelling_level: null, other_symptoms: '' });
      await fetchData();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la soumission. Veuillez réessayer.');
    } finally {
      setSubmittingPain(false);
    }
  };

  // ─── Send message ───
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !patient) return;

    const newMessage = {
      patient_id: patient.id,
      clinic_id: patient.clinic_id,
      sender_type: 'patient',
      sender_id: patient.id,
      content: messageInput.trim(),
      is_read: false,
    };

    // Optimistic update
    setMessages(prev => [...prev, { ...newMessage, id: `temp_${Date.now()}`, created_at: new Date().toISOString() }]);
    setMessageInput('');

    const { error } = await supabase.from('messages').insert(newMessage);

    if (error) {
      console.error('[PatientPortalAuth] Send message error:', error);
      fetchData(); // Rollback
    } else {
      // Push alert
      await supabase.from('alerts').insert({
        clinic_id: patient.clinic_id,
        patient_id: patient.id,
        type: 'message',
        title: 'Nouveau Message Patient',
        message: `${patient.full_name.split(' ')[0]} vous a envoyé un message.`
      });
    }
  };

  // ─── Upload photo ───
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !patient) return;

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      // Compress image client-side (max 1MB, JPEG 0.8)
      const compressed = await compressImage(file, 1024 * 1024, 0.8);

      // Calculate jour post-op
      const surgeryDate = new Date(patient.surgery_date);
      const today = new Date();
      const jourPostOp = Math.floor((today - surgeryDate) / (1000 * 60 * 60 * 24));

      // Upload to Supabase Storage
      const fileName = `${Date.now()}_j${jourPostOp}.jpg`;
      const storagePath = `${patient.clinic_id}/${patient.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('patient-photos')
        .upload(storagePath, compressed, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Insert photo record
      const { error: insertError } = await supabase.from('photos').insert({
        patient_id: patient.id,
        clinic_id: patient.clinic_id,
        storage_path: storagePath,
        label: `Photo J+${jourPostOp}`,
        jour_post_op: jourPostOp,
        uploaded_by: 'patient',
        uploader_id: patient.id,
      });

      if (insertError) throw insertError;

      // Push alert
      await supabase.from('alerts').insert({
        clinic_id: patient.clinic_id,
        patient_id: patient.id,
        type: 'photo',
        title: 'Nouvelle Photo Patient',
        message: `${patient.full_name.split(' ')[0]} a partagé une photo.`
      });

      setUploadSuccess(true);
      await fetchData();
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error('[PatientPortalAuth] Photo upload error:', err);
      alert('Erreur lors de l\'envoi de la photo. Veuillez réessayer.');
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Logout ───
  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  // ─── Loading / Error states ───
  if (authLoading || loading) {
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-10 bg-white rounded-[20px] text-center max-w-[400px] shadow-card w-full">
          <AlertCircle size={48} className="text-status-complication mx-auto mb-4" />
          <h2 className="font-serif text-[22px] mb-2 font-bold text-text-dark">Dossier introuvable</h2>
          <p className="text-text-muted text-[14px] font-medium leading-relaxed">
            Aucun dossier patient n'est associé à votre compte. Veuillez contacter la clinique.
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Computed values ───
  const patientTasks = tasks.filter(t => t.patient_can_check);
  const staffTasks = tasks.filter(t => !t.patient_can_check);
  const progressDone = tasks.filter(t => t.done).length;
  const progressTotal = tasks.length;
  const progressPct = progressTotal === 0 ? 0 : Math.round((progressDone / progressTotal) * 100);

  const surgeryDate = new Date(patient.surgery_date);
  const today = new Date();
  const jourPostOp = Math.max(0, Math.floor((today - surgeryDate) / (1000 * 60 * 60 * 24)));

  const hasSubmittedPainToday = painScores.some(ps => ps.jour_post_op === jourPostOp);

  // Computed timeline groupings
  const groupedTasks = (tasksArr) => {
    const passed = [];
    const todayTasks = [];
    const future = [];
    
    tasksArr.forEach(t => {
      // Custom tasks without a ref are considered "today" context or independent
      if (t.jour_post_op_ref == null) {
        todayTasks.push(t);
      } else if (t.jour_post_op_ref < jourPostOp) {
        // Only show passed tasks if they are NOT done (so patient can catch up) or just let them fade out
        // Let's show all for a complete timeline or filter out done? 
        // We will show them
        passed.push(t);
      } else if (t.jour_post_op_ref === jourPostOp) {
        todayTasks.push(t);
      } else {
        future.push(t);
      }
    });

    return { passed, todayTasks, future };
  };

  const patientTimeline = groupedTasks(patientTasks);
  const staffTimeline = groupedTasks(staffTasks);

  return (
    <div className="min-h-screen bg-surface-main pb-[60px]">
      {/* Header */}
      <header className="bg-white px-5 py-4 border-b border-border flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-primary to-accent w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">+</div>
          <span className="font-extrabold text-primary font-serif text-[18px]">PostOp</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-primary bg-primary-light px-3 py-1.5 rounded-full font-bold shadow-sm">
            <ShieldCheck size={14} /> Sécurisé
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full font-bold transition-colors cursor-pointer border-none"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto p-5 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Welcome */}
          <div className="mb-6">
            <h1 className="font-serif text-[26px] text-text-dark mb-1 font-bold">
              Bonjour {patient.full_name.split(' ')[0]}
            </h1>
            <p className="text-text-muted text-[15px] font-medium tracking-wide">
              Suivi de votre {patient.intervention.toLowerCase()} · J+{jourPostOp}
            </p>
          </div>

          {/* Progress card */}
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
            <div className="flex justify-between mt-4 pt-4 border-t border-border">
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider font-bold mb-1">Intervention</div>
                <div className="text-[14px] font-extrabold text-text-dark">{patient.intervention}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-text-muted uppercase tracking-wider font-bold mb-1">Statut</div>
                <StatusBadge status={patient.status} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { id: 'tasks', icon: <Check size={20} />, label: 'Tâches' },
              { id: 'photos', icon: <Camera size={20} />, label: 'Photos' },
              { id: 'messages', icon: <MessageCircle size={20} />, label: 'Messages',
                badge: messages.filter(m => m.sender_type !== 'patient' && !m.is_read).length },
              { id: 'evolution', icon: <TrendingUp size={20} />, label: 'Évolution' },
              { id: 'info', icon: <Info size={20} />, label: 'Infos' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`
                relative flex-1 min-w-[28%] py-3 px-1.5 rounded-[14px] border-none font-bold text-[13px] transition-all cursor-pointer flex flex-col items-center gap-1.5
                ${activeTab === tab.id ? 'bg-primary text-white shadow-button' : 'bg-white text-text-muted shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:text-text-dark hover:bg-slate-50'}`}>
                {tab.icon} {tab.label}
                {tab.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              
              {/* Bilan quotidien — 2 étapes */}
              {!hasSubmittedPainToday && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-primary/20">

                  {checkinStep === 1 && (
                    <>
                      <h3 className="text-text-dark font-bold text-[16px] mb-1 flex items-center gap-2">
                        <AlertCircle size={18} className="text-status-attention" />
                        Bilan du jour — J+{jourPostOp}
                      </h3>
                      <p className="text-text-muted text-[13px] mb-5">Évaluez votre douleur (0 = aucune, 10 = maximale).</p>
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-border">
                        {[0,1,2,3,4,5,6,7,8,9,10].map(score => (
                          <button key={score} disabled={submittingPain}
                            onClick={() => { setSelectedScore(score); setCheckinStep(2); }}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[14px] transition-all hover:scale-110 cursor-pointer disabled:opacity-50 border-none bg-transparent
                              ${score <= 3 ? 'text-emerald-700 hover:bg-emerald-100' : score <= 6 ? 'text-amber-600 hover:bg-amber-100' : 'text-red-600 hover:bg-red-100'}`}>
                            {score}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {checkinStep === 2 && (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-text-dark font-bold text-[16px] flex items-center gap-2">
                          <AlertCircle size={18} className="text-status-attention" />
                          Douleur : {selectedScore}/10 — Autres symptômes ?
                        </h3>
                        <button onClick={() => setCheckinStep(1)}
                          className="text-text-muted text-[12px] font-semibold bg-transparent border-none cursor-pointer hover:text-text-dark">
                          ← Modifier
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Température */}
                        <div>
                          <label className="block text-[13px] font-bold text-text-dark mb-1.5">🌡️ Température (°C)</label>
                          <input type="number" step="0.1" min="35" max="42"
                            value={checkinData.temperature}
                            onChange={e => setCheckinData(p => ({ ...p, temperature: e.target.value }))}
                            placeholder="Ex : 37.2"
                            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                          {checkinData.temperature && parseFloat(checkinData.temperature) >= 38.0 && (
                            <p className="text-[12px] text-red-600 font-bold mt-1">⚠️ Fièvre détectée — votre équipe sera notifiée.</p>
                          )}
                        </div>

                        {/* Gonflement */}
                        <div>
                          <label className="block text-[13px] font-bold text-text-dark mb-2">💧 Niveau de gonflement</label>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 0, label: 'Aucun', color: 'emerald' },
                              { value: 1, label: 'Léger', color: 'amber' },
                              { value: 2, label: 'Modéré', color: 'orange' },
                              { value: 3, label: 'Sévère', color: 'red' },
                            ].map(opt => (
                              <button key={opt.value}
                                onClick={() => setCheckinData(p => ({ ...p, swelling_level: p.swelling_level === opt.value ? null : opt.value }))}
                                className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-[12px] font-bold border transition-all cursor-pointer
                                  ${checkinData.swelling_level === opt.value
                                    ? `bg-${opt.color}-500 text-white border-${opt.color}-500`
                                    : `bg-${opt.color}-50 text-${opt.color}-700 border-${opt.color}-200 hover:bg-${opt.color}-100`}`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Autres symptômes */}
                        <div>
                          <label className="block text-[13px] font-bold text-text-dark mb-1.5">📝 Autres symptômes (optionnel)</label>
                          <textarea value={checkinData.other_symptoms}
                            onChange={e => setCheckinData(p => ({ ...p, other_symptoms: e.target.value }))}
                            rows={2} placeholder="Décrivez d'autres sensations ou symptômes..."
                            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none" />
                        </div>
                      </div>

                      <button
                        onClick={() => handleSubmitCheckin(selectedScore, checkinData)}
                        disabled={submittingPain}
                        className="mt-5 w-full py-3 bg-primary hover:bg-primary-dark text-white border-none rounded-xl font-bold text-[14px] cursor-pointer disabled:opacity-60 transition-colors shadow-sm">
                        {submittingPain ? 'Envoi en cours...' : '✓ Envoyer mon bilan du jour'}
                      </button>
                    </>
                  )}
                </motion.div>
              )}


              <h3 className="text-[16px] mb-4 font-bold text-text-dark flex items-center gap-2">
                <Check size={18} className="text-primary" /> À faire par vous
              </h3>
              
              <div className="flex flex-col gap-2.5 mb-8 border-l-2 border-slate-100 ml-2 pl-4">
                
                {/* En retard / Passées */}
                {patientTimeline.passed.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[11px] font-bold text-status-attention uppercase mb-2">Tâches passées / En retard</div>
                    <div className="flex flex-col gap-2">
                      {patientTimeline.passed.map((task) => (
                        <TaskChecker key={task.id} task={task} onToggle={handleToggleTask} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Aujourd'hui */}
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-primary uppercase mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" /> Aujourd'hui (J+{jourPostOp})
                  </div>
                  <div className="flex flex-col gap-2">
                    {patientTimeline.todayTasks.length === 0 ? (
                      <p className="text-[13px] text-text-muted italic bg-slate-50 p-3 rounded-xl border border-border">Aucune tâche pour aujourd'hui.</p>
                    ) : (patientTimeline.todayTasks.map((task) => (
                      <TaskChecker key={task.id} task={task} onToggle={handleToggleTask} />
                    )))}
                  </div>
                </div>

                {/* À venir */}
                {patientTimeline.future.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-text-muted uppercase mb-2">À venir</div>
                    <div className="flex flex-col gap-2 opacity-70 transition-opacity hover:opacity-100">
                      {patientTimeline.future.map((task) => (
                        <TaskChecker key={task.id} task={task} onToggle={() => {}} disabled />
                      ))}
                    </div>
                  </div>
                )}

              </div>

              <h3 className="text-[16px] mb-4 font-bold text-text-muted flex items-center gap-2">
                <Info size={18} /> Suivi médical (Votre équipe)
              </h3>
              <div className="flex flex-col gap-2 border-l-2 border-slate-100 ml-2 pl-4">
                {['passed', 'todayTasks', 'future'].map(groupKey => {
                  if (staffTimeline[groupKey].length === 0) return null;
                  return (
                    <div key={groupKey} className="mb-3">
                      <div className="text-[10px] font-bold text-text-muted uppercase mb-1.5 font-mono">
                        {groupKey === 'passed' ? 'Passé' : groupKey === 'todayTasks' ? "Aujourd'hui" : 'À venir'}
                      </div>
                      <div className="flex flex-col gap-2">
                        {staffTimeline[groupKey].map((task) => (
                          <div key={task.id} className={`flex items-center gap-3.5 py-3 px-3.5 rounded-[12px] border border-border transition-all
                            ${task.done ? 'bg-slate-50 opacity-60' : 'bg-white shadow-sm'}`}>
                            <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center text-white text-[9px] shrink-0 font-bold
                              ${task.done ? 'bg-status-normal-text' : 'bg-slate-200'}`}>
                              {task.done && '✓'}
                            </div>
                            <div className={`flex-1 font-semibold text-[13px] ${task.done ? 'line-through text-text-dark' : 'text-text-dark'}`}>
                              {task.label}
                              {task.jour_post_op_ref != null && (
                                <span className="inline-block px-1.5 py-0.5 ml-2 bg-slate-100 text-[10px] rounded text-slate-500 font-bold">J+{task.jour_post_op_ref}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="bg-white rounded-[20px] p-8 text-center border-2 border-dashed border-primary-light mb-6 shadow-sm">
                <div className={`w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300
                  ${uploadSuccess ? 'bg-status-normal-bg text-status-normal' : 'bg-primary-light text-primary'}`}>
                  {isUploading ? <Loader2 size={28} className="animate-spin" /> : (uploadSuccess ? <Check size={28} /> : <Camera size={28} />)}
                </div>
                <h3 className="text-[16px] mb-2 font-bold text-text-dark">
                  {uploadSuccess ? 'Photo envoyée avec succès !' : 'Envoyer une nouvelle photo'}
                </h3>
                <p className="text-[13px] text-text-muted mb-5 leading-relaxed font-medium">
                  Photographiez la zone concernée pour permettre à votre chirurgien de contrôler l'évolution.
                </p>
                <label className={`block w-full py-3 px-6 text-white border-none rounded-xl font-bold text-[14px] transition-all shadow-sm text-center
                  ${isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark cursor-pointer shadow-button'}`}>
                  {isUploading ? 'Envoi en cours…' : 'Prendre ou sélectionner une photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>

              <h3 className="text-[16px] mb-4 font-bold text-text-dark">Historique des envois</h3>
              {photos.length === 0 ? (
                <div className="text-center p-5 text-text-muted font-medium bg-white rounded-xl shadow-sm border border-slate-100">
                  Aucune photo envoyée.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((photo) => (
                    <motion.div key={photo.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="aspect-[3/4] rounded-[14px] bg-gradient-to-br from-primary-light to-primary-hover relative overflow-hidden shadow-sm border border-primary/20">
                      {photo.storage_path && (
                        <PhotoThumbnail storagePath={photo.storage_path} alt={photo.label} />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-8 pb-2.5 px-3 text-white text-[12px] font-bold text-center">
                        {photo.label || `J+${photo.jour_post_op}`}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-[60vh] max-h-[600px]">
              <div className="flex-1 overflow-y-auto bg-slate-50 p-5 rounded-[20px] mb-4 border border-border flex flex-col gap-3 shadow-inner">
                <div className="self-center bg-primary-light text-primary-dark py-1.5 px-3 rounded-full text-[11px] font-bold mb-2 shadow-sm">
                  Conversation sécurisée (HDS)
                </div>
                {messages.length === 0
                  ? <p className="text-center text-text-muted font-medium mt-4">Aucun message. Posez une question à l'équipe médicale ci-dessous.</p>
                  : messages.map((m, i) => (
                    <div key={m.id || i} className={`max-w-[80%] ${m.sender_type === 'patient' ? 'self-end' : 'self-start'}`}>
                      <div className={`py-3 px-4 rounded-[18px] shadow-sm text-[14px] leading-relaxed font-medium
                        ${m.sender_type === 'patient'
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-white text-text-dark border border-slate-200 rounded-bl-sm'}`}>
                        {m.content}
                      </div>
                      <div className={`text-[11px] text-text-muted mt-1 font-semibold ${m.sender_type === 'patient' ? 'text-right' : 'text-left'}`}>
                        {new Date(m.created_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' })}
                      </div>
                    </div>
                  ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2.5 bg-white p-2.5 rounded-[20px] border border-border shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
                <input
                  type="text"
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                  placeholder="Votre message..."
                  className="flex-1 py-2.5 px-3.5 rounded-xl border-none text-[15px] bg-transparent outline-none font-medium"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-primary hover:bg-primary-dark text-white border-none w-11 h-11 rounded-xl cursor-pointer flex items-center justify-center transition-colors shadow-sm shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          )}
          {/* Évolution Tab */}
          {activeTab === 'evolution' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="bg-white rounded-[20px] p-6 shadow-sm border border-border">
                <h3 className="text-[16px] font-bold text-text-dark mb-1">Évolution de votre douleur</h3>
                <p className="text-[13px] text-text-muted mb-5">Vos scores déclarés au fil des jours post-opératoires.</p>
                <PainChart
                  painScores={painScores.map(ps => ({ score: ps.score, jour: ps.jour_post_op }))}
                  height={160}
                  intervention={patient?.intervention}
                />
              </div>
            </motion.div>
          )}

          {/* Infos Tab */}
          {activeTab === 'info' && (() => {
            const eduContent = getEducationalContent(patient.intervention);
            return (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="bg-white rounded-[20px] p-6 shadow-sm border border-border mb-4">
                  <h3 className="font-serif text-[18px] font-bold text-text-dark mb-1">{eduContent.title}</h3>
                  <p className="text-[12px] text-text-muted font-semibold uppercase tracking-wide">
                    Informations post-opératoires
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {eduContent.sections.map((section, i) => (
                    <div key={i} className="bg-white rounded-[18px] p-5 shadow-sm border border-border">
                      <h4 className="font-bold text-[14px] text-text-dark mb-2">{section.heading}</h4>
                      <p className="text-[13px] text-text-muted leading-relaxed font-medium">{section.body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-primary-light rounded-[16px] p-4 border border-primary/20 text-center">
                  <p className="text-[12px] text-primary font-bold">
                    Ces informations ne remplacent pas l'avis médical. En cas de doute, contactez votre équipe via la messagerie.
                  </p>
                </div>
              </motion.div>
            );
          })()}

        </motion.div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-[#0a4038] text-white/80 text-[11px] font-bold tracking-wide p-1.5 text-center z-[100] shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
        Portail Patient · SSL/TLS Actif · {new Date().toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' })}
      </div>
    </div>
  );
}

// ─── Helper: Task Checker Row ───
function TaskChecker({ task, onToggle, disabled = false }) {
  return (
    <label className={`flex items-center gap-3.5 py-3.5 px-4 rounded-xl cursor-pointer transition-all border
      ${task.done ? 'bg-status-normal-bg border-emerald-200 hover:bg-emerald-100' : 'bg-white border-border shadow-sm hover:border-primary/30'}
      ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} disabled={disabled}
        className="w-[20px] h-[20px] accent-primary cursor-pointer shrink-0 rounded" />
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-[14px] transition-all ${task.done ? 'text-primary line-through opacity-70' : 'text-text-dark'}`}>
          {task.label}
        </div>
        {task.description && (
          <div className="text-[12px] text-text-muted mt-1 leading-snug">{task.description}</div>
        )}
      </div>
    </label>
  );
}

// ─── Helper: Compress image before upload ───
async function compressImage(file, maxBytes, quality) {
  try {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Max dimension 2048px
          const maxDim = 2048;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file); // Fallback to original
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => resolve(blob || file), // Fallback if blob is null
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  } catch (err) {
    console.warn('[compressImage] Compression failed, using original:', err);
    return file;
  }
}

// ─── Helper: Photo thumbnail from Supabase Storage ───
function PhotoThumbnail({ storagePath, alt }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const { data } = supabase.storage
      .from('patient-photos')
      .getPublicUrl(storagePath);

    // For private buckets, use createSignedUrl instead
    supabase.storage
      .from('patient-photos')
      .createSignedUrl(storagePath, 3600) // 1 hour
      .then(({ data: signedData }) => {
        if (signedData?.signedUrl) {
          setUrl(signedData.signedUrl);
        }
      });
  }, [storagePath]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt={alt || 'Photo de suivi'}
      className="absolute inset-0 w-full h-full object-cover"
      loading="lazy"
    />
  );
}
