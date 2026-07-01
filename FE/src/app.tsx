import 'src/global.css';

// ----------------------------------------------------------------------

import { Router } from 'src/routes/sections';

import { ThemeProvider } from 'src/theme/theme-provider';
import { LocalizationProvider } from 'src/locales/localization-provider';

import { ProgressBar } from 'src/components/progress-bar';
import { MotionLazy } from 'src/components/animate/motion-lazy';
import { SettingsDrawer, defaultSettings, SettingsProvider } from 'src/components/settings';

import { AuthProvider } from 'src/auth/context/jwt';

import { PermissionProvider } from 'src/rbac/context/permission-context';

import { Snackbar } from './components/snackbar';
import StoreProvider from './redux/store-provider';


// ----------------------------------------------------------------------

export default function App() {
  return (
    <StoreProvider>
      <AuthProvider>
        <PermissionProvider>
          <SettingsProvider settings={defaultSettings}>
          <LocalizationProvider>
            <ThemeProvider>
              <MotionLazy>
                <Snackbar />
                <ProgressBar />
                <SettingsDrawer />
                <Router />
              </MotionLazy>
            </ThemeProvider>
          </LocalizationProvider>
          </SettingsProvider>
        </PermissionProvider>
      </AuthProvider>
    </StoreProvider>
  );
}
