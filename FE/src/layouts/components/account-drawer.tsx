import type { IconButtonProps } from '@mui/material/IconButton';

import React, { useCallback } from 'react';

import PersonIcon from '@mui/icons-material/Person';
import { Box, Divider, MenuItem, MenuList, Typography } from '@mui/material';

import { useRouter, usePathname } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';

import { getProfileSettingsPath } from 'src/utils/profile-settings-path';

import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { useMockedUser } from 'src/auth/hooks';

import { AccountButton } from './account-button';
import { SignOutButton } from './sign-out-button';

// ----------------------------------------------------------------------
export type ProfilePopoverMenu = {
  title: string;
  path: string;
};
export type AccountDrawerProps = IconButtonProps & {
  data?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
};

export function AccountDrawer({ data = [], sx, ...other }: AccountDrawerProps) {
  const popover = usePopover();
  const router = useRouter();
  const pathname = usePathname();
  const logoutPopup = useBoolean();

  const { user } = useMockedUser();

  const profileSettingsPath = getProfileSettingsPath(pathname);

  const handleCloseDrawer = useCallback(() => {
    popover.onClose();
  }, [popover]);

  // const renderAvatar = (
  //   <AnimateAvatar
  //     width={96}
  //     slotProps={{
  //       avatar: { src: user?.photoURL, alt: user?.name },
  //       overlay: {
  //         border: 2,
  //         spacing: 3,
  //         color: `linear-gradient(135deg, ${varAlpha(theme.vars.palette.primary.mainChannel, 0)} 25%, ${theme.vars.palette.primary.main} 100%)`,
  //       },
  //     }}
  //   >
  //     {user?.name?.charAt(0).toUpperCase()}
  //   </AnimateAvatar>
  // );
  // Create account menu based on user type
  const accountMenu: ProfilePopoverMenu[] = [
    // Show Profile Settings only for roles that have a profile/settings route
    ...(profileSettingsPath ? [{ title: 'Profile Settings', path: profileSettingsPath }] : []),
    {
      title: 'Logout',
      path: '',
    },
  ];
  const handelClickMenu = async (menu: ProfilePopoverMenu) => {
    if (menu.title === 'Logout') {
      logoutPopup.setValue(true);
    } else {
      router.push(menu.path);
    }
    popover.onClose();
  };

  return (
    <>
      <AccountButton
        open={popover.open}
        onClick={popover.onOpen}
        photoURL={user?.photoURL}
        displayName={user?.name}
        sx={sx}
        {...other}
      />
      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        sx={{ mt: 1.4 }}
      >
        {user && (
          <>
            <Box sx={{ px: 2, pt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {user?.name}
              </Typography>
              <Typography variant="body2">{user?.email}</Typography>
            </Box>
            <Divider sx={{ borderBottom: 'dashed 1px', opacity: '.20', my: 1.5 }} />
          </>
        )}
        <MenuList sx={{ width: 200, minHeight: 55 }}>
          {accountMenu?.map((menu) => {
            if (menu.title === 'Profile Settings') {
              return (
                <MenuItem
                  key={menu.title}
                  onClick={() => handelClickMenu(menu)}
                  sx={{ width: '100%', px: 2 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" />
                    <Typography variant="body2">Profile Settings</Typography>
                  </Box>
                </MenuItem>
              );
            }

            if (menu.title === 'Logout') {
              return (
                <React.Fragment key={menu.title}>
                  <MenuItem
                    key={menu.title}
                    onClick={() => handelClickMenu(menu)}
                    sx={{ color: '#FF5630', width: '100%', px: 2 }}
                  >
                    <SignOutButton onClose={handleCloseDrawer} />
                  </MenuItem>
                </React.Fragment>
              );
            }

            return null;
          })}
        </MenuList>
      </CustomPopover>
    </>
  );
}
