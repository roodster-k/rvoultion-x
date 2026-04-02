import { createContext, useContext } from 'react';
import useAlertHook from '../hooks/useAlerts';
import { usePatientContext } from './PatientContext';

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const { patients } = usePatientContext();
  const alertState = useAlertHook(patients);

  return (
    <AlertContext.Provider value={alertState}>
      {children}
    </AlertContext.Provider>
  );
}

export const useAlertContext = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlertContext must be used within <AlertProvider>');
  return ctx;
};
