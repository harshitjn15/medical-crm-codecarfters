import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ✅ Override FIRST
const originalFetch = window.fetch;

window.fetch = (url, options) => {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  if (url.startsWith('/api')) {
    url = `${API_URL}${url}`;
  }

  return originalFetch(url, options);
};

// ✅ THEN render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);