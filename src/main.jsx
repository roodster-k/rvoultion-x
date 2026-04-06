import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { PatientProvider } from './context/PatientContext';
import { AlertProvider } from './context/AlertContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <AuthProvider>
      <PatientProvider>
        <AlertProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </AlertProvider>
      </PatientProvider>
    </AuthProvider>
  </ToastProvider>
);
