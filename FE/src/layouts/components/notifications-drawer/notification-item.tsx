
import type { INotificationItem } from 'src/types/admin/feature/notification';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';


// ----------------------------------------------------------------------


type Props = Readonly<{
  notification: INotificationItem;
  }>;
  export function NotificationItem({notification}: Props) {
 
  const renderText = (
    <ListItemText
      disableTypography
      sx={{ typography: 'subtitle1' }}
      primary={reader(notification.type)}
      secondary={
        <Stack
          direction="row"
          alignItems="center"
          sx={{ typography: !notification.isRead ? 'subtitle2' : 'body2' }}
          divider={
            <Box
              sx={{
                width: 2,
                height: 2,
                bgcolor: 'currentColor',
                mx: 0.5,
                borderRadius: '50%',
              }}
            />
          }
        >
          {notification.message}
          
        </Stack>
      }
    />
  );

  const renderUnReadBadge = !notification.isRead && (
    <Box
      sx={{
        top: 26,
        width: 8,
        height: 8,
        left:5,
        borderRadius: '50%',
        bgcolor: 'info.main',
        position: 'absolute',
      }}
    />
  );

  return (
    <ListItemButton
      disableRipple
      sx={{
        p: 2.5,
        alignItems: 'flex-start',
        borderBottom: (theme) => `dashed 1px ${theme.vars.palette.divider}`,
      }}
    >
      {renderUnReadBadge}
      <Stack sx={{ flexGrow: 1 }}>
        {renderText}
        <Stack
          sx={{ typography: 'caption', color: 'text.disabled' }}>
          {notification.createdAt}
        </Stack>
      </Stack>
      
    </ListItemButton>
  );
}

// ----------------------------------------------------------------------

function reader(data: string) {
  return (
    <Box
      dangerouslySetInnerHTML={{ __html: data }}
      sx={{
        mb: 0.5,
        '& p': { typography: 'body2', m: 0 },
        '& a': { color: 'inherit', textDecoration: 'none' },
        '& strong': { typography: 'subtitle2' },
      }}
    />
  );
}
