import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { PatientProvider } from './context/PatientContext';
import { AlertProvider } from './context/AlertContext';
import { DataProvider } from './context/DataContext';
import './styles/global.css';

/**
 * Provider hierarchy:
 *   AuthProvider     → user authentication state
 *   PatientProvider  → patient data + mutations (usePatients hook)
 *   AlertProvider    → alerts engine + notifications (useAlerts hook, depends on patients)
 *   DataProvider     → backward-compatible bridge (will be removed once all consumers migrate)
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <PatientProvider>
        <AlertProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </AlertProvider>
      </PatientProvider>
    </AuthProvider>
  </React.StrictMode>
);
