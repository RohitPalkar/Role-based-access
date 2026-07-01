import type { ButtonProps } from '@mui/material/Button';
import type { Theme, SxProps } from '@mui/material/styles';

import { useContext } from 'react';

import { useAppDispatch } from 'src/hooks/use-redux';

import { Logout } from 'src/redux/actions/rm-panel/dashboard-actions';

import { FilledButton } from 'src/components/buttons/FilledButton';

import { signOut } from 'src/auth/context/jwt';
import { AuthContext } from 'src/auth/context/auth-context';

// ----------------------------------------------------------------------

type Props = ButtonProps & {
  sx?: SxProps<Theme>;
  onClose?: () => void;
};

export function SignOutButton({ onClose, ...other }: Props) {
  const dispatch = useAppDispatch()


  const authContext = useContext(AuthContext);

  if (!authContext) return null; // Ensure context exists

  const { logout } = authContext;
  const handleLogout = async () => {
    await dispatch(Logout());
    await signOut();
    await logout();
  };
  return (

    <FilledButton height='35px' label='Logout' onClick={handleLogout} width='100%' />

  );
}
