import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Custom hook — all patient CRUD ops via Supabase.
 * Fetches patients with their related checklist_items, messages, and photos,
 * then reconstructs the same in-memory structure the UI expects.
 */
export default function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // FETCH — Reconstruct the full patient shape
  // ==========================================
  const fetchPatients = useCallback(async () => {
    try {
      const [patientsRes, checklistRes, messagesRes, photosRes] = await Promise.all([
        supabase.from('patients').select('*').order('id'),
        supabase.from('checklist_items').select('*').order('created_at'),
        supabase.from('messages').select('*').order('timestamp'),
        supabase.from('photos').select('*').order('id'),
      ]);

      if (patientsRes.error) throw patientsRes.error;

      const checklistMap = {};
      (checklistRes.data || []).forEach(c => {
        if (!checklistMap[c.patient_id]) checklistMap[c.patient_id] = [];
        checklistMap[c.patient_id].push({
          id: c.id,
          label: c.label,
          done: c.done,
          jourPostOpRef: c.jour_post_op_ref,
          jour: c.jour,
          patientCanCheck: c.patient_can_check,
        });
      });

      const messagesMap = {};
      (messagesRes.data || []).forEach(m => {
        if (!messagesMap[m.patient_id]) messagesMap[m.patient_id] = [];
        messagesMap[m.patient_id].push({
          from: m.from_sender,
          text: m.text,
          timestamp: m.timestamp,
        });
      });

      const photosMap = {};
      (photosRes.data || []).forEach(p => {
        if (!photosMap[p.patient_id]) photosMap[p.patient_id] = [];
        photosMap[p.patient_id].push({
          jour: p.jour,
          label: p.label,
        });
      });

      // Reconstruct full patient objects
      const fullPatients = (patientsRes.data || []).map(p => ({
        id: p.id,
        name: p.name,
        intervention: p.intervention,
        date: p.date_op,
        jourPostOp: p.jour_post_op,
        status: p.status,
        chirurgien: p.chirurgien,
        assignedTo: p.assigned_to,
        email: p.email || '',
        phone: p.phone || '',
        whatsapp: p.whatsapp || '',
        notes: p.notes || '',
        token: p.token,
        checklist: checklistMap[p.id] || [],
        messages: messagesMap[p.id] || [],
        photos: photosMap[p.id] || [],
      }));

      setPatients(fullPatients);
    } catch (err) {
      console.error('[usePatients] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // ==========================================
  // MUTATIONS — Write to Supabase + optimistic UI
  // ==========================================

  const toggleTask = useCallback(async (patientId, taskId) => {
    // Optimistic update
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return {
        ...p,
        checklist: p.checklist.map(c =>
          c.id === taskId ? { ...c, done: !c.done } : c
        ),
      };
    }));

    // Find current state to determine new value
    const patient = patients.find(p => p.id === patientId);
    const task = patient?.checklist.find(c => c.id === taskId);
    if (!task) return;

    const { error } = await supabase
      .from('checklist_items')
      .update({ done: !task.done })
      .eq('id', taskId);

    if (error) {
      console.error('[toggleTask] Error:', error);
      fetchPatients(); // Rollback on error
    }
  }, [patients, fetchPatients]);

  const addCustomTask = useCallback(async (patientId, label, isForPatient, targetJourNumber) => {
    const newId = `c_custom_${Date.now()}`;

    // Optimistic update
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return {
        ...p,
        checklist: [...p.checklist, {
          id: newId,
          label,
          done: false,
          jourPostOpRef: targetJourNumber,
          jour: `J+${targetJourNumber}`,
          patientCanCheck: isForPatient,
        }],
      };
    }));

    const { error } = await supabase.from('checklist_items').insert({
      id: newId,
      patient_id: patientId,
      label,
      done: false,
      jour_post_op_ref: targetJourNumber,
      jour: `J+${targetJourNumber}`,
      patient_can_check: isForPatient,
    });

    if (error) {
      console.error('[addCustomTask] Error:', error);
      fetchPatients();
    }
  }, [fetchPatients]);

  const sendMessage = useCallback(async (patientId, text, sender = 'nurse') => {
    const timestamp = new Date().toISOString();

    // Optimistic update
    setPatients(prev => prev.map(p =>
      p.id === patientId
        ? { ...p, messages: [...p.messages, { from: sender, text, timestamp }] }
        : p
    ));

    const { error } = await supabase.from('messages').insert({
      patient_id: patientId,
      from_sender: sender,
      text,
      timestamp,
    });

    if (error) {
      console.error('[sendMessage] Error:', error);
      fetchPatients();
    }
  }, [fetchPatients]);

  const addPhoto = useCallback(async (patientId, photoLabel) => {
    const patient = patients.find(p => p.id === patientId);
    const jour = patient?.jourPostOp || 0;

    // Optimistic update
    setPatients(prev => prev.map(p =>
      p.id === patientId
        ? { ...p, photos: [...p.photos, { jour, label: photoLabel }] }
        : p
    ));

    const { error } = await supabase.from('photos').insert({
      patient_id: patientId,
      jour,
      label: photoLabel,
    });

    if (error) {
      console.error('[addPhoto] Error:', error);
      fetchPatients();
    }
  }, [patients, fetchPatients]);

  const addNote = useCallback(async (patientId, noteText) => {
    // Optimistic update
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, notes: noteText } : p
    ));

    const { error } = await supabase
      .from('patients')
      .update({ notes: noteText })
      .eq('id', patientId);

    if (error) {
      console.error('[addNote] Error:', error);
      fetchPatients();
    }
  }, [fetchPatients]);

  const addPatient = useCallback(async (newPatient, assignedTo) => {
    const token = `token_${newPatient.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
    const dateOp = new Date().toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' });

    // Insert patient
    const { data: insertedPatient, error: patientError } = await supabase
      .from('patients')
      .insert({
        name: newPatient.name,
        intervention: newPatient.intervention,
        date_op: dateOp,
        jour_post_op: 0,
        status: 'normal',
        chirurgien: newPatient.chirurgien || 'Dr. Renaud',
        assigned_to: assignedTo || 'Kevin M.',
        email: newPatient.email || '',
        phone: newPatient.phone || '',
        whatsapp: newPatient.whatsapp || '',
        notes: 'Nouveau patient enregistré. En attente de suivi.',
        token,
      })
      .select()
      .single();

    if (patientError) {
      console.error('[addPatient] Error:', patientError);
      return;
    }

    // Insert default checklist items
    const { error: checklistError } = await supabase.from('checklist_items').insert([
      {
        id: `c_${insertedPatient.id}_1`,
        patient_id: insertedPatient.id,
        label: "Vérification des constantes",
        done: false,
        jour_post_op_ref: 1,
        jour: "J+1",
        patient_can_check: false,
      },
      {
        id: `c_${insertedPatient.id}_2`,
        patient_id: insertedPatient.id,
        label: "Prise d'antalgique si douleur",
        done: false,
        jour_post_op_ref: null,
        jour: "Si besoin",
        patient_can_check: true,
      },
    ]);

    if (checklistError) {
      console.error('[addPatient] Checklist error:', checklistError);
    }

    // Refresh from DB to get complete data
    await fetchPatients();
  }, [fetchPatients]);

  // ==========================================
  // QUERIES (same interface as Phase 3)
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
      const matchesTeam = viewMode === 'equipe' || (p.assignedTo === (userName || 'Kevin M.'));
      return matchesSearch && matchesTeam;
    });
  }, [patients]);

  const getStats = useCallback((patientList) => {
    return {
      total: patientList.length,
      complication: patientList.filter(p => p.status === 'complication').length,
      attention: patientList.filter(p => p.status === 'attention').length,
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
    getPatientById,
    getPatientByToken,
    getFilteredPatients,
    getStats,
    refetch: fetchPatients,
  };
}
