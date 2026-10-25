import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { AuthProvider } from './lib/auth.js';
import Router from './router.js';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <Router />
    </AuthProvider>
  </React.StrictMode>,
);
