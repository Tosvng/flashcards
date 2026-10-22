import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { registerSW } from 'virtual:pwa-register';
import { apiBaseUrl } from './app/config';
import { AppProviders } from './app/AppProviders';
import { AppRoutes } from './app/AppRoutes';
import { composeServices } from './app/composition';
import '@fontsource-variable/figtree';
import './presentation/styles.css';

// Built once at startup; the only place the app learns about concrete implementations.
const services = composeServices({ baseUrl: apiBaseUrl() });

// Offline support. A new version waits until the app is next opened; it never reloads mid-review.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders services={services}>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
