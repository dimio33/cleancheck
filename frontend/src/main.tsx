import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n/index';
import './index.css';
import App from './App';

// Remote error logger for native app debugging
const API_URL = import.meta.env.VITE_API_URL || '';
function remoteLog(level: string, message: string, meta?: unknown) {
  try {
    fetch(`${API_URL}/client-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, meta }),
    }).catch(() => {});
  } catch {}
}

remoteLog('info', 'App starting', {
  url: window.location.href,
  userAgent: navigator.userAgent,
  apiUrl: API_URL,
});

window.addEventListener('error', (e) => {
  remoteLog('error', e.message, { filename: e.filename, lineno: e.lineno, colno: e.colno });
});

window.addEventListener('unhandledrejection', (e) => {
  remoteLog('error', 'Unhandled promise rejection', { reason: String(e.reason) });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
