import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Hook for managing patient medications and clinic templates.
 */
export default function useMedications(patientId = null) {
  const [medications, setMedications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchMedications = useCallback(async () => {
    if (!profile?.clinic_id && !patientId) return;
    setLoading(true);

    const query = supabase
      .from('medications')
      .select('*, prescribed_by_user:prescribed_by(full_name, role)')
      .order('start_day', { ascending: true });

    if (patientId) query.eq('patient_id', patientId);
    else query.eq('clinic_id', profile.clinic_id);

    const { data, error } = await query;
    if (!error && data) setMedications(data);
    setLoading(false);
  }, [profile, patientId]);

  const fetchTemplates = useCallback(async () => {
    if (!profile?.clinic_id) return;
    const { data } = await supabase
      .from('medication_templates')
      .select('*')
      .or(`clinic_id.eq.${profile.clinic_id},is_global.eq.true`)
      .order('intervention_type', { ascending: true });
    if (data) setTemplates(data);
  }, [profile]);

  useEffect(() => {
    fetchMedications();
    fetchTemplates();
  }, [fetchMedications, fetchTemplates]);

  /** Add a medication to a patient */
  const addMedication = useCallback(async ({ patientId: pid, name, dosage, frequency, startDay, endDay, notes }) => {
    if (!profile?.clinic_id) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('medications')
      .insert({
        patient_id: pid,
        clinic_id: profile.clinic_id,
        prescribed_by: profile.id,
        name: name.trim(),
        dosage: dosage?.trim() || null,
        frequency: frequency?.trim() || null,
        start_day: startDay ?? 0,
        end_day: endDay ?? null,
        notes: notes?.trim() || null,
      })
      .select('*, prescribed_by_user:prescribed_by(full_name, role)')
      .single();

    if (!error) setMedications(prev => [...prev, data].sort((a, b) => (a.start_day ?? 0) - (b.start_day ?? 0)));
    return { data, error };
  }, [profile]);

  /** Toggle is_active on a medication */
  const toggleMedication = useCallback(async (id) => {
    const med = medications.find(m => m.id === id);
    if (!med) return;
    const newActive = !med.is_active;
    setMedications(prev => prev.map(m => m.id === id ? { ...m, is_active: newActive } : m));
    await supabase.from('medications').update({ is_active: newActive, updated_at: new Date().toISOString() }).eq('id', id);
  }, [medications]);

  /** Delete a medication */
  const deleteMedication = useCallback(async (id) => {
    setMedications(prev => prev.filter(m => m.id !== id));
    await supabase.from('medications').delete().eq('id', id);
  }, []);

  /** Apply a template: insert all template meds for a patient */
  const applyTemplate = useCallback(async (pid, interventionType) => {
    if (!profile?.clinic_id) return { error: 'Not authenticated' };
    const relevantTemplates = templates.filter(t => t.intervention_type === interventionType);
    if (relevantTemplates.length === 0) return { error: 'Aucun template pour cette intervention' };

    const rows = relevantTemplates.map(t => ({
      patient_id: pid,
      clinic_id: profile.clinic_id,
      prescribed_by: profile.id,
      name: t.name,
      dosage: t.dosage,
      frequency: t.frequency,
      start_day: 0,
      end_day: t.duration_days ?? null,
      notes: t.notes,
    }));

    const { data, error } = await supabase.from('medications').insert(rows).select('*, prescribed_by_user:prescribed_by(full_name, role)');
    if (!error && data) setMedications(prev => [...prev, ...data].sort((a, b) => (a.start_day ?? 0) - (b.start_day ?? 0)));
    return { data, error };
  }, [profile, templates]);

  /** Save a new medication template */
  const saveTemplate = useCallback(async ({ interventionType, name, dosage, frequency, durationDays, notes }) => {
    if (!profile?.clinic_id) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('medication_templates')
      .insert({
        clinic_id: profile.clinic_id,
        intervention_type: interventionType,
        name: name.trim(),
        dosage: dosage?.trim() || null,
        frequency: frequency?.trim() || null,
        duration_days: durationDays ?? null,
        notes: notes?.trim() || null,
      })
      .select()
      .single();
    if (!error) setTemplates(prev => [...prev, data]);
    return { data, error };
  }, [profile]);

  const getPatientMedications = useCallback((pid) => medications.filter(m => m.patient_id === pid), [medications]);
  const getActiveMedications = useCallback((pid) => medications.filter(m => m.patient_id === pid && m.is_active), [medications]);
  const getTemplatesForIntervention = useCallback((type) => templates.filter(t => t.intervention_type === type), [templates]);

  return {
    medications,
    templates,
    loading,
    addMedication,
    toggleMedication,
    deleteMedication,
    applyTemplate,
    saveTemplate,
    getPatientMedications,
    getActiveMedications,
    getTemplatesForIntervention,
    refetch: fetchMedications,
  };
}
