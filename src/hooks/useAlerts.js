import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for real-time alerts.
 * Replaces the legacy memory-based lateness alerts with true DB queries & realtime subscriptions.
 */
export default function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const { profile } = useAuth();

  const fetchAlerts = useCallback(async () => {
    if (!profile?.clinic_id) return;

    // Fetch unread alerts
    const { data: alertsData, error } = await supabase
      .from('alerts')
      .select('*, patients (full_name)')
      .eq('clinic_id', profile.clinic_id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (!error && alertsData) {
      setAlerts(alertsData.map(a => ({
        id: a.id,
        type: a.type === 'attention' ? 'danger' : a.type === 'message' ? 'warning' : a.type === 'photo' ? 'success' : 'info',
        title: a.title,
        message: a.message,
        patientId: a.patient_id,
        patientName: a.patients?.full_name || 'Inconnu',
        date: a.created_at,
        dbId: a.id // Keep reference to DB row
      })));
    }
  }, [profile]);

  useEffect(() => {
    fetchAlerts();

    if (!profile?.clinic_id) return;

    // Realtime Subscription
    const channel = supabase
      .channel('public:alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
        filter: `clinic_id=eq.${profile.clinic_id}`
      }, (payload) => {
        // Prepend new alert
        const newAlert = payload.new;
        if (!newAlert.is_read) {
          // Fetch patient name individually if needed, or just say 'Nouveau patient'.
          // Optimally, fetch the patient name here
          supabase.from('patients').select('full_name').eq('id', newAlert.patient_id).single().then(({ data }) => {
            setAlerts(prev => [{
              id: newAlert.id,
              type: newAlert.type === 'attention' ? 'danger' : newAlert.type === 'message' ? 'warning' : newAlert.type === 'photo' ? 'success' : 'info',
              title: newAlert.title,
              message: newAlert.message,
              patientId: newAlert.patient_id,
              patientName: data?.full_name || 'Inconnu',
              date: newAlert.created_at,
              dbId: newAlert.id
            }, ...prev]);
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'alerts',
        filter: `clinic_id=eq.${profile.clinic_id}`
      }, (payload) => {
        if (payload.new.is_read) {
          setAlerts(prev => prev.filter(a => a.id !== payload.new.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchAlerts]);

  // --- Alert controls ---

  /** Dismiss a single alert -> Marks as read in DB */
  const dismissAlert = useCallback(async (id) => {
    if (!profile) return;
    // Optimistic
    setAlerts(prev => prev.filter(a => a.id !== id));

    await supabase.from('alerts').update({ is_read: true, read_at: new Date().toISOString(), read_by: profile.id }).eq('id', id);
  }, [profile]);

  /** Clear all alerts for a specific patient */
  const clearPatientAlerts = useCallback(async (patientId) => {
    if (!profile) return;

    setAlerts(prev => prev.filter(a => a.patientId !== patientId));

    await supabase.from('alerts')
      .update({ is_read: true, read_at: new Date().toISOString(), read_by: profile.id })
      .eq('patient_id', patientId)
      .eq('is_read', false);
  }, [profile]);

  return {
    alerts,
    setAlerts,
    // Stub these to prevent breaking Context bridge temporarily
    pushTaskAlert: () => {},
    pushMessageAlert: () => {},
    pushPhotoAlert: () => {},
    dismissAlert,
    clearPatientAlerts,
  };
}
