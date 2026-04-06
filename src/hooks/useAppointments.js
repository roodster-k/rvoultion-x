import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Hook for managing post-op follow-up appointments.
 * Scoped to the authenticated user's clinic.
 */
export default function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchAppointments = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients (full_name, intervention)')
      .eq('clinic_id', profile.clinic_id)
      .order('scheduled_at', { ascending: true });

    if (!error && data) {
      setAppointments(data.map(a => ({
        id: a.id,
        patientId: a.patient_id,
        patientName: a.patients?.full_name || 'Inconnu',
        intervention: a.patients?.intervention || '',
        title: a.title,
        scheduledAt: a.scheduled_at,
        location: a.location,
        notes: a.notes,
        done: a.done,
        createdAt: a.created_at,
      })));
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  /** Create a new appointment */
  const addAppointment = useCallback(async ({ patientId, title, scheduledAt, location, notes }) => {
    if (!profile?.clinic_id) return { error: 'Not authenticated' };

    const payload = {
      patient_id: patientId,
      clinic_id: profile.clinic_id,
      created_by: profile.id,
      title,
      scheduled_at: scheduledAt,
      location: location || null,
      notes: notes || null,
    };

    // Optimistic
    const tempId = `temp-${Date.now()}`;
    setAppointments(prev => [...prev, {
      id: tempId,
      patientId,
      patientName: '',
      intervention: '',
      title,
      scheduledAt,
      location: location || null,
      notes: notes || null,
      done: false,
      createdAt: new Date().toISOString(),
    }].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)));

    const { data, error } = await supabase
      .from('appointments')
      .insert(payload)
      .select('*, patients (full_name, intervention)')
      .single();

    if (error) {
      setAppointments(prev => prev.filter(a => a.id !== tempId));
      return { error };
    }

    setAppointments(prev => prev
      .filter(a => a.id !== tempId)
      .concat({
        id: data.id,
        patientId: data.patient_id,
        patientName: data.patients?.full_name || '',
        intervention: data.patients?.intervention || '',
        title: data.title,
        scheduledAt: data.scheduled_at,
        location: data.location,
        notes: data.notes,
        done: data.done,
        createdAt: data.created_at,
      })
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    );
    return { data };
  }, [profile]);

  /** Mark appointment as done / not done */
  const toggleAppointment = useCallback(async (id) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    const newDone = !appt.done;

    setAppointments(prev => prev.map(a => a.id === id ? { ...a, done: newDone } : a));
    await supabase.from('appointments').update({ done: newDone, updated_at: new Date().toISOString() }).eq('id', id);
  }, [appointments]);

  /** Delete an appointment */
  const deleteAppointment = useCallback(async (id) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    await supabase.from('appointments').delete().eq('id', id);
  }, []);

  return {
    appointments,
    loading,
    addAppointment,
    toggleAppointment,
    deleteAppointment,
    getPatientAppointments: (patientId) => appointments.filter(a => a.patientId === patientId),
    getUpcoming: () => appointments.filter(a => !a.done && new Date(a.scheduledAt) >= new Date()),
  };
}
