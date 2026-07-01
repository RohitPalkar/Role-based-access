import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

import { AccountDrawer } from './account-drawer';
import { NotificationsDrawer } from './notifications-drawer';

import type { AccountDrawerProps } from './account-drawer';

// ----------------------------------------------------------------------

export type NavBottomAreaProps = Readonly<{
  data?: {
    account?: AccountDrawerProps['data'];
    notifications?: any[];
  };
  isNavMini?: boolean;
}>;

export function NavBottomArea({ data, isNavMini = false }: NavBottomAreaProps) {

  if (isNavMini) {
    return (
      <Stack
        spacing={1}
        alignItems="center"
        sx={{
          p: 1,

        }}
      >
    
        <AccountDrawer
          data={data?.account}
          sx={{
            width: 40,
            height: 40,
            '& .MuiIconButton-root': {
              width: 40,
              height: 40,
            },
          }}
        />
            <NotificationsDrawer
          sx={{
            width: 40,
            height: 40,
            '& .MuiIconButton-root': {
              width: 40,
              height: 40,
            },
          }}
        />
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
      }}
    >
      <Stack spacing={1}>
        <Divider sx={{ mb: 1 }} />
        <Stack direction="row" spacing={1}  alignItems="center">
    
          <AccountDrawer
            data={data?.account}
            sx={{
              '& .MuiIconButton-root': {
                width: 44,
                height: 44,
              },
            }}
          />
                <NotificationsDrawer
            sx={{
              '& .MuiIconButton-root': {
                width: 44,
                height: 44,
              },
            }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}