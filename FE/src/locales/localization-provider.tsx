'use client';

import 'dayjs/locale/en';
import 'dayjs/locale/vi';
import 'dayjs/locale/fr';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/ar-sa';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider as Provider } from '@mui/x-date-pickers/LocalizationProvider';

// ----------------------------------------------------------------------

type Props = Readonly<{
  children: React.ReactNode;
}>;

export function LocalizationProvider({ children }: Props) {
  return (
    <Provider dateAdapter={AdapterDayjs}>
      {children}
    </Provider>
  );
}
