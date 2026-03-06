import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthProvider';
import { ServiceProvider } from './ServiceProvider';
import { App } from './App';
import './i18n/index';
import './styles/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <AuthProvider>
        <ServiceProvider>
          <App />
        </ServiceProvider>
      </AuthProvider>
    </AppThemeProvider>
  </React.StrictMode>
);
