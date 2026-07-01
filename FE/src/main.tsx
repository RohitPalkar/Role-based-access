import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { Suspense, StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import App from './app';
import { CONFIG } from './config-global';
import { ScrollToTop } from './components/scroll-to-top';

// ----------------------------------------------------------------------

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

Sentry.init({
  dsn: import.meta.env.VITE_APP_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.captureConsoleIntegration({ levels: ['log', 'warn', 'error'] }),
  ],
  tracesSampleRate: import.meta.env.VITE_APP_ENV === 'production' ? 0.05 : 1.0,
  environment: process.env.NODE_ENV || 'dev',
  debug: true, // use this instead of enableLogs
});

root.render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter basename={CONFIG.site.basePath}>
        <ScrollToTop />
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
