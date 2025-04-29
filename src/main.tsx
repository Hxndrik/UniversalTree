import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Keep global styles for now
import App from './App.tsx';
import { ThemeProvider } from './contexts/ThemeContext'; // Import ThemeProvider

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
