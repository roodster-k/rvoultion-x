import { useContext, useMemo } from 'react';
import PatientContext from './PatientContextDefinition';
import usePatientHook from '../hooks/usePatients';

export function PatientProvider({ children }) {
  const patientState = usePatientHook();
  
  const value = useMemo(() => patientState, [
    patientState.patients, 
    patientState.loading,
    patientState.refetch
  ]);

  return (
    <PatientContext.Provider value={value || {}}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatientContext() {
  const ctx = useContext(PatientContext);
  if (!ctx || Object.keys(ctx).length === 0) {
    if (!ctx) throw new Error('usePatientContext must be used within <PatientProvider>');
  }
  return ctx;
}

export { PatientContext };
