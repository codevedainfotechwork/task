import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Intercept benign console warnings/errors from third-party libraries
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('THREE.Clock')) return;
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Context Lost')) return;
  originalError(...args);
};

createRoot(document.getElementById('root')).render(
  <App />
)
