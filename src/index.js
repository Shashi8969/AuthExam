import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 1. Updated for Vite: Changed process.env to import.meta.env
if (import.meta.env.DEV) {
  console.log("[index.js] Firebase API Key Loaded:", !!import.meta.env.VITE_FIREBASE_API_KEY);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();