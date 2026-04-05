import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook — all patient CRUD ops via Supabase.
 * 
 * ADAPTER PATTERN (Étape 4) : 
 * - Le hook interroge les vraies tables V2 (patients, tasks, messages, photos)
 * - Il convertit les données récupérées dans l'ancien format V1 pour la compatibilité UI.
 */
export default function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { profile, authUser } = useAuth(); // profile contient clinic_id et role

  // ==========================================
  // FETCH — Reconstruct the full patient shape
  // ==========================================
  const fetchPatients = useCallback(async () => {
    // Si l'utilisateur n'a pas de profil staff, on ne charge rien (le portail charge ses propres données)
    if (!profile?.clinic_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const [patientsRes, tasksRes, messagesRes, photosRes, usersRes, painRes] = await Promise.all([
        supabase.from('patients').select('*').eq('clinic_id', profile.clinic_id).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('clinic_id', profile.clinic_id).order('sort_order', { ascending: true }),
        supabase.from('messages').select('*').eq('clinic_id', profile.clinic_id).order('created_at', { ascending: true }),
        supabase.from('photos').select('*').eq('clinic_id', profile.clinic_id).order('created_at', { ascending: true }),
        supabase.from('users').select('id, full_name').eq('clinic_id', profile.clinic_id),
        supabase.from('pain_scores').select('*').eq('clinic_id', profile.clinic_id).order('jour_post_op', { ascending: true }),
      ]);

      if (patientsRes.error) throw patientsRes.error;

      // Map users for fast lookup (uuid -> name)
      const usersMap = {};
      (usersRes.data || []).forEach(u => {
        usersMap[u.id] = u.full_name;
      });

      const checklistMap = {};
      (tasksRes.data || []).forEach(t => {
        if (!checklistMap[t.patient_id]) checklistMap[t.patient_id] = [];
        checklistMap[t.patient_id].push({
          id: t.id,
          label: t.label,
          description: t.description,
          done: t.done,
          due_date: t.due_date,
          jourPostOpRef: t.jour_post_op_ref,
          jour: t.jour_post_op_ref != null ? `J+${t.jour_post_op_ref}` : 'Spécial',
          patientCanCheck: t.patient_can_check,
        });
      });

      const messagesMap = {};
      (messagesRes.data || []).forEach(m => {
        if (!messagesMap[m.patient_id]) messagesMap[m.patient_id] = [];
        messagesMap[m.patient_id].push({
          from: m.sender_type, // V2: 'nurse', 'patient', 'surgeon', 'system' (V1 expected same)
          text: m.content,
          timestamp: m.created_at,
        });
      });

      const photosMap = {};
      (photosRes.data || []).forEach(p => {
        if (!photosMap[p.patient_id]) photosMap[p.patient_id] = [];
        photosMap[p.patient_id].push({
          jour: p.jour_post_op,
          label: p.label,
          storage_path: p.storage_path,
        });
      });

      const painMap = {};
      (painRes.data || []).forEach(ps => {
        if (!painMap[ps.patient_id]) painMap[ps.patient_id] = [];
        painMap[ps.patient_id].push({
          score: ps.score,
          jour: ps.jour_post_op,
          notes: ps.notes,
          timestamp: ps.created_at
        });
      });

      // Calculer le jour post op à la volée based on surgery_date
      const today = new Date();
      
      // Reconstruct full patient objects into V1 shape
      const fullPatients = (patientsRes.data || []).map(p => {
        const dateOp = new Date(p.surgery_date);
        let currentJourPostOp = Math.floor((today - dateOp) / (1000 * 60 * 60 * 24));
        if (currentJourPostOp < 0) currentJourPostOp = 0;

        return {
          id: p.id,
          name: p.full_name,
          intervention: p.intervention,
          date: p.surgery_date,         // was: date_op
          jourPostOp: currentJourPostOp, // dynamically calculated
          status: p.status,
          chirurgien: p.surgeon_id ? usersMap[p.surgeon_id] : 'Non assigné',
          assignedTo: p.assigned_to ? usersMap[p.assigned_to] : 'Non assigné',
          email: p.email || '',
          phone: p.phone || '',
          whatsapp: p.whatsapp || '',
          notes: p.notes || '',
          token: p.token,
          checklist: checklistMap[p.id] || [],
          messages: messagesMap[p.id] || [],
          photos: photosMap[p.id] || [],
          painScores: painMap[p.id] || [],
        };
      });

      setPatients(fullPatients);
    } catch (err) {
      console.error('[usePatients] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Initial fetch when profile loads
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // ==========================================
  // MUTATIONS — Write to Supabase V2 + optimistic UI
  // ==========================================

  const toggleTask = useCallback(async (patientId, taskId) => {
    // Determine new done status based on current state
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const task = patient.checklist.find(c => c.id === taskId);
    if (!task) return;
    const newDone = !task.done;

    // Optimistic update
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return {
        ...p,
        checklist: p.checklist.map(c =>
          c.id === taskId ? { ...c, done: newDone } : c
        ),
      };
    }));

    // Update V2 'tasks' table
    const { error } = await supabase
      .from('tasks')
      .update({ 
        done: newDone, 
        done_at: newDone ? new Date().toISOString() : null,
        done_by: newDone && profile ? profile.id : null 
      })
      .eq('id', taskId);

    if (error) {
      console.error('[toggleTask] Error:', error);
      fetchPatients(); // Rollback on error
    }
  }, [patients, profile, fetchPatients]);

  const addCustomTask = useCallback(async (patientId, label, isForPatient, targetJourNumber) => {
    if (!profile) return;
    
    // V2 requires clinic_id for RLS policies
    const newTask = {
      patient_id: patientId,
      clinic_id: profile.clinic_id,
      label,
      jour_post_op_ref: targetJourNumber,
      patient_can_check: isForPatient,
      done: false
    };

    // V1 UI Optimistic task (temp ID)
    const tempId = `temp_${Date.now()}`;
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return {
        ...p,
        checklist: [...p.checklist, {
          id: tempId,
          label,
          done: false,
          jourPostOpRef: targetJourNumber,
          jour: targetJourNumber != null ? `J+${targetJourNumber}` : 'Spécial',
          patientCanCheck: isForPatient,
        }],
      };
    }));

    const { error } = await supabase.from('tasks').insert(newTask);

    if (error) {
      console.error('[addCustomTask] Error:', error);
    }
    // Refresh to get actual ID
    fetchPatients();
  }, [profile, fetchPatients]);

  // sendMessage => 'messages' table with V2 format (sender_type, content)
  const sendMessage = useCallback(async (patientId, text, sender = 'nurse') => {
    if (!profile) return;
    
    const timestamp = new Date().toISOString();

    // Optimistic update
    setPatients(prev => prev.map(p =>
      p.id === patientId
        ? { ...p, messages: [...p.messages, { from: sender, text, timestamp }] }
        : p
    ));

    const { error } = await supabase.from('messages').insert({
      patient_id: patientId,
      clinic_id: profile.clinic_id,
      sender_type: sender,
      sender_id: profile.id, // who sent it
      content: text,
      is_read: false
    });

    if (error) {
      console.error('[sendMessage] Error:', error);
      fetchPatients();
    }
  }, [profile, fetchPatients]);

  // addPhoto using simulated upload or inserting into V2 photos tracking table
  const addPhoto = useCallback(async (patientId, photoLabel) => {
    if (!profile) return;

    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const jour = patient.jourPostOp || 0;

    // Optimistic update
    setPatients(prev => prev.map(p =>
      p.id === patientId
        ? { ...p, photos: [...p.photos, { jour, label: photoLabel }] }
        : p
    ));

    // Note: since this is simulated in nurse view (no actual file), we just create the DB record
    // In PatientPortalAuth, it does actual storage upload
    const { error } = await supabase.from('photos').insert({
      patient_id: patientId,
      clinic_id: profile.clinic_id,
      label: photoLabel,
      jour_post_op: jour,
      storage_path: 'simulated/path.jpg', // Dummy path since UI just displays rectangles for now
      uploaded_by: 'nurse',
      uploader_id: profile.id
    });

    if (error) {
      console.error('[addPhoto] Error:', error);
      fetchPatients();
    }
  }, [patients, profile, fetchPatients]);

  const addNote = useCallback(async (patientId, noteText) => {
    // Optimistic update
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, notes: noteText } : p
    ));

    // V2 update on 'patients' table
    const { error } = await supabase
      .from('patients')
      .update({ notes: noteText })
      .eq('id', patientId);

    if (error) {
      console.error('[addNote] Error:', error);
      fetchPatients();
    }
  }, [fetchPatients]);

  const submitPainScore = useCallback(async (patientId, score, jour_post_op, notes = null) => {
    if (!profile) return;

    // Optimistic
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return {
        ...p,
        painScores: [...p.painScores.filter(ps => ps.jour !== jour_post_op), { score, jour: jour_post_op, notes }]
      };
    }));

    const { error } = await supabase.from('pain_scores').upsert({
      patient_id: patientId,
      clinic_id: profile.clinic_id,
      score,
      jour_post_op,
      notes
    }, { onConflict: 'patient_id, jour_post_op' });

    if (error) {
      console.error('[submitPainScore] Error:', error);
      fetchPatients();
      return { error };
    }

    if (score >= 6) {
      // Create alert
      const patient = patients.find(p => p.id === patientId);
      await supabase.from('alerts').insert({
        clinic_id: profile.clinic_id,
        patient_id: patientId,
        type: 'action',
        title: `Douleur signalée : ${score}/10`,
        message: `Le patient signale une douleur de niveau ${score} à J+${jour_post_op}.`
      });
    }

    fetchPatients();
    return { success: true };
  }, [profile, patients, fetchPatients]);

  // addPatient : Mapped to the actual V2 schema
  const addPatient = useCallback(async (newPatient, assignedToName) => {
    if (!profile) return;

    let assignedUserId = null;
    let surgeonUserId = null;

    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('clinic_id', profile.clinic_id);

      if (usersData) {
        const matchedNurse = usersData.find(u => u.full_name === assignedToName);
        if (matchedNurse) assignedUserId = matchedNurse.id;

        const matchedSurgeon = usersData.find(u => u.full_name === newPatient.chirurgien);
        if (matchedSurgeon) surgeonUserId = matchedSurgeon.id;
      }
    } catch(e) {
      console.warn("Could not heuristically map names to UUIDs:", e);
    }

    if (!assignedUserId) assignedUserId = profile.id;

    const surgeryDateStr = newPatient.surgeryDate || new Date().toISOString().split('T')[0];

    const patientPayload = {
      clinic_id: profile.clinic_id,
      full_name: newPatient.name,
      intervention: newPatient.intervention,
      surgery_date: surgeryDateStr,
      status: 'normal',
      assigned_to: assignedUserId,
      surgeon_id: surgeonUserId, // Can be null
      email: newPatient.email || null,
      phone: newPatient.phone || null,
      whatsapp: newPatient.whatsapp || null,
      notes: 'Nouveau patient enregistré. En attente de suivi.'
    };

    // Insert patient
    const { data: insertedPatient, error: patientError } = await supabase
      .from('patients')
      .insert(patientPayload)
      .select()
      .single();

    if (patientError) {
      console.error('[addPatient] Error inserting patient:', patientError);
      return;
    }

    // Retrieve matching protocol template
    // Split interventions by comma if multiple were selecting, just take the first one or match any
    const primaryIntervention = newPatient.intervention.split(',')[0].trim();
    
    // We look for a template matching the exact intervention string
    const { data: templates } = await supabase
      .from('protocol_templates')
      .select('id, tasks')
      .or(`clinic_id.eq.${profile.clinic_id},is_global.eq.true`)
      .ilike('intervention_type', `%${primaryIntervention}%`)
      .limit(1);

    let tasksToInsert = [];

    if (templates && templates.length > 0 && Array.isArray(templates[0].tasks)) {
      // Dynamic generation based on template
      const template = templates[0];
      const surgeryDate = new Date(surgeryDateStr);
      
      tasksToInsert = template.tasks.map((taskTemplate, index) => {
        // Calculate due date based on surgery date + jour_post_op_ref
        let dueDate = null;
        if (taskTemplate.jour_post_op_ref != null) {
          const d = new Date(surgeryDate);
          d.setDate(d.getDate() + taskTemplate.jour_post_op_ref);
          dueDate = d.toISOString().split('T')[0];
        }

        return {
          patient_id: insertedPatient.id,
          clinic_id: profile.clinic_id,
          template_id: template.id,
          label: taskTemplate.label,
          description: taskTemplate.description || null,
          jour_post_op_ref: taskTemplate.jour_post_op_ref,
          due_date: dueDate,
          done: false,
          patient_can_check: taskTemplate.patient_can_check || false,
          sort_order: taskTemplate.sort_order || index + 1
        };
      });
    } else {
      // Fallback if no template matches
      tasksToInsert = [
        {
          patient_id: insertedPatient.id,
          clinic_id: profile.clinic_id,
          label: "Vérification des constantes",
          done: false,
          jour_post_op_ref: 1,
          due_date: (() => { const d = new Date(surgeryDateStr); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })(),
          patient_can_check: false,
          sort_order: 1
        },
        {
          patient_id: insertedPatient.id,
          clinic_id: profile.clinic_id,
          label: "Prise d'antalgique si douleur",
          done: false,
          jour_post_op_ref: null,
          patient_can_check: true,
          sort_order: 2
        },
      ];
    }

    if (tasksToInsert.length > 0) {
      const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert);
      if (tasksError) {
        console.error('[addPatient] Error inserting tasks:', tasksError);
      }
    }

    // Refresh from DB to get complete data and show it in UI
    await fetchPatients();
  }, [profile, fetchPatients]);

  // ==========================================
  // QUERIES
  // ==========================================

  const getPatientById = useCallback((id) => {
    return patients.find(p => p.id === id) || null;
  }, [patients]);

  const getPatientByToken = useCallback((token) => {
    return patients.find(p => p.token === token) || null;
  }, [patients]);

  const getFilteredPatients = useCallback((searchTerm, viewMode, userName) => {
    return patients.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.intervention.toLowerCase().includes(searchTerm.toLowerCase());
      
      // In V1 mode `userName` was a custom string, map it roughly. 
      // If `viewMode` is 'mes_patients', we check if assignedTo matches or if it's assigned to ME directly.
      const isMyPatient = profile && (p.assignedTo === profile.full_name || p.chirurgien === profile.full_name);
      const matchesTeam = viewMode === 'equipe' || isMyPatient;
      
      return matchesSearch && matchesTeam;
    });
  }, [patients, profile]);

  const getStats = useCallback((patientList) => {
    let totalTasks = 0;
    let doneTasks = 0;

    patientList.forEach(p => {
      p.checklist.forEach(c => {
        if (c.patientCanCheck) {
          totalTasks++;
          if (c.done) doneTasks++;
        }
      });
    });

    return {
      total: patientList.length,
      complication: patientList.filter(p => p.status === 'complication').length,
      attention: patientList.filter(p => p.status === 'attention').length,
      complianceRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 100
    };
  }, []);

  return {
    patients,
    loading,
    toggleTask,
    addCustomTask,
    sendMessage,
    addPhoto,
    addNote,
    addPatient,
    submitPainScore,
    getPatientById,
    getPatientByToken,
    getFilteredPatients,
    getStats,
    refetch: fetchPatients,
  };
}
