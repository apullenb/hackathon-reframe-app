import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/themes.css';
import './index.css';
import { initTheme } from './styles/applyTheme';
import { App } from './App';

// Stamp the theme before the first paint so there is no flash of the default palette.
initTheme();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
