/**
 * DataContext — Backward-compatible bridge.
 * 
 * This context now simply re-exports values from PatientContext + AlertContext
 * so that existing `useData()` calls continue to work during migration.
 * 
 * New code should import from the specific contexts directly:
 *   import { usePatientContext } from '../context/PatientContext';
 *   import { useAlertContext }   from '../context/AlertContext';
 * 
 * This file will be removed once all consumers are migrated.
 */
import { createContext, useContext, useCallback } from 'react';
import { usePatientContext } from './PatientContext';
import { useAlertContext } from './AlertContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const DataContext = createContext();

export function DataProvider({ children }) {
  const patientCtx = usePatientContext();
  const alertCtx = useAlertContext();
  const { profile } = useAuth();
  const { toast } = useToast();

  // Bridge: toggleTask with alert side-effect (patient action notification)
  const toggleTask = useCallback((patientId, taskId, isPatientAction = false) => {
    // Find the task BEFORE toggling to determine new state
    const patient = patientCtx.getPatientById(patientId);
    if (!patient) return;
    const task = patient.checklist.find(c => c.id === taskId);
    if (!task) return;
    const willBeDone = !task.done;

    patientCtx.toggleTask(patientId, taskId);

    if (isPatientAction && willBeDone) {
      alertCtx.pushTaskAlert(patient.name, task.label, patientId);
    }
  }, [patientCtx, alertCtx]);

  // Bridge: sendMessage with alert side-effect
  const sendMessage = useCallback(async (patientId, text, sender = 'nurse') => {
    if (sender === 'patient') {
      const patient = patientCtx.getPatientById(patientId);
      if (patient) alertCtx.pushMessageAlert(patient.name, patientId);
    }
    const result = await patientCtx.sendMessage(patientId, text, sender);
    if (result?.error) toast('Erreur lors de l\'envoi du message.', 'error');
  }, [patientCtx, alertCtx, toast]);

  // Bridge: addPhoto with alert side-effect
  const addPhoto = useCallback((patientId, photoLabel) => {
    const patient = patientCtx.getPatientById(patientId);
    if (patient) alertCtx.pushPhotoAlert(patient.name, patientId);
    patientCtx.addPhoto(patientId, photoLabel);
  }, [patientCtx, alertCtx]);

  // Bridge: addNote with author name from current profile
  const addNote = useCallback(async (patientId, noteText) => {
    const result = await patientCtx.addNote(patientId, noteText, profile?.full_name || 'Équipe');
    if (result?.error) toast('Erreur lors de l\'ajout de la note.', 'error');
    else toast('Note ajoutée.', 'success');
  }, [patientCtx, profile, toast]);

  // Bridge: updatePatientStatus with toast
  const updatePatientStatus = useCallback(async (patientId, newStatus) => {
    const result = await patientCtx.updatePatientStatus(patientId, newStatus);
    if (result?.error) toast('Erreur lors de la mise à jour du statut.', 'error');
  }, [patientCtx, toast]);

  // Bridge: toggleTask with toast on error
  const toggleTaskWithToast = useCallback(async (patientId, taskId, isPatientAction = false) => {
    const patient = patientCtx.getPatientById(patientId);
    if (!patient) return;
    const task = patient.checklist.find(c => c.id === taskId);
    if (!task) return;
    const willBeDone = !task.done;
    const result = await patientCtx.toggleTask(patientId, taskId);
    if (result?.error) toast('Erreur lors de la mise à jour de la tâche.', 'error');
    if (isPatientAction && willBeDone) alertCtx.pushTaskAlert(patient.name, task.label, patientId);
  }, [patientCtx, alertCtx, toast]);

  return (
    <DataContext.Provider value={{
      // Patient data
      patients: patientCtx.patients,
      toggleTask: toggleTaskWithToast,
      addCustomTask: patientCtx.addCustomTask,
      sendMessage,
      addPhoto,
      addNote,
      addPatient: patientCtx.addPatient,
      updatePatientStatus,
      invitePatient: patientCtx.invitePatient,
      // Alert data
      alerts: alertCtx.alerts,
      setAlerts: alertCtx.setAlerts,
      // New context-specific accessors (for progressive migration)
      clearPatientAlerts: alertCtx.clearPatientAlerts,
      dismissAlert: alertCtx.dismissAlert,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within <DataProvider>');
  return ctx;
};
