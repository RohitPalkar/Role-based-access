import type {} from '@mui/lab/themeAugmentation';
import type {} from '@mui/x-tree-view/themeAugmentation';
import type {} from '@mui/x-data-grid/themeAugmentation';
import type {} from '@mui/x-date-pickers/themeAugmentation';
import type {} from '@mui/material/themeCssVarsAugmentation';

import CssBaseline from '@mui/material/CssBaseline';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';

import { useSettingsContext } from 'src/components/settings';

import { createTheme } from './create-theme';
import { schemeConfig } from './color-scheme-script';
import { RightToLeft } from './with-settings/right-to-left';

// ----------------------------------------------------------------------

type Props = Readonly<{
  children: React.ReactNode;
}>;

export function ThemeProvider({ children }: Props) {
  const settings = useSettingsContext();

  const theme = createTheme(settings);

  return (
    <CssVarsProvider
      theme={theme}
      defaultMode={schemeConfig.defaultMode}
      modeStorageKey={schemeConfig.modeStorageKey}
    >
      <CssBaseline />
      <RightToLeft direction={settings.direction}>{children}</RightToLeft>
    </CssVarsProvider>
  );
}
