import { createContext, useContext } from 'react';
import usePatientHook from '../hooks/usePatients';

const PatientContext = createContext();

export function PatientProvider({ children }) {
  const patientState = usePatientHook();

  return (
    <PatientContext.Provider value={patientState}>
      {children}
    </PatientContext.Provider>
  );
}

export const usePatientContext = () => {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatientContext must be used within <PatientProvider>');
  return ctx;
};
