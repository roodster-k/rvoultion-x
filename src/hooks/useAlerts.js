import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook encapsulating all alert/notification logic.
 * Receives patients from the PatientContext to generate lateness alerts.
 */
export default function useAlerts(patients) {
  const [alerts, setAlerts] = useState([]);
  const alertsInitialized = useRef(false);

  // --- ENGINE: Lateness Alerts (> 3 Days) ---
  useEffect(() => {
    const latenessAlerts = [];
    patients.forEach(p => {
      p.checklist.forEach(c => {
        if (!c.done && c.jourPostOpRef !== null) {
          const delay = p.jourPostOp - c.jourPostOpRef;
          if (delay > 3) {
            latenessAlerts.push({
              id: `late_${p.id}_${c.id}`,
              type: 'danger',
              title: 'Retard de Protocole',
              message: `[${p.name}] "${c.label}" — retard de ${delay} jours.`,
              patientId: p.id,
              date: new Date().toISOString(),
              silent: !alertsInitialized.current,
            });
          }
        }
      });
    });

    setAlerts(prev => {
      const nonLatenessAlerts = prev.filter(a => !a.id.toString().startsWith('late_'));
      return [...latenessAlerts, ...nonLatenessAlerts];
    });
    alertsInitialized.current = true;
  }, [patients]);

  // --- Alert creation helpers ---

  /** Push a task-completion alert (patient action) */
  const pushTaskAlert = useCallback((patientName, taskLabel, patientId) => {
    setAlerts(prev => [{
      id: `action_${Date.now()}`,
      type: 'info',
      title: 'Action Patient',
      message: `${patientName} a complété : "${taskLabel}"`,
      patientId,
      date: new Date().toISOString(),
    }, ...prev]);
  }, []);

  /** Push a new-message alert */
  const pushMessageAlert = useCallback((patientName, patientId) => {
    setAlerts(prev => [{
      id: `msg_${Date.now()}`,
      type: 'warning',
      title: 'Nouveau Message Patient',
      message: `${patientName} vous a envoyé un message.`,
      patientId,
      date: new Date().toISOString(),
    }, ...prev]);
  }, []);

  /** Push a photo-received alert */
  const pushPhotoAlert = useCallback((patientName, patientId) => {
    setAlerts(prev => [{
      id: `photo_${Date.now()}`,
      type: 'success',
      title: 'Photo reçue',
      message: `${patientName} a envoyé une nouvelle photo.`,
      patientId,
      date: new Date().toISOString(),
    }, ...prev]);
  }, []);

  /** Dismiss a single alert */
  const dismissAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  /** Clear alerts for a specific patient (except lateness) */
  const clearPatientAlerts = useCallback((patientId) => {
    setAlerts(prev => prev.filter(a =>
      a.patientId !== patientId || a.id.toString().startsWith('late_')
    ));
  }, []);

  return {
    alerts,
    setAlerts,
    pushTaskAlert,
    pushMessageAlert,
    pushPhotoAlert,
    dismissAlert,
    clearPatientAlerts,
  };
}
