import Cookies from 'js-cookie';
import { useMemo, useEffect, useCallback } from 'react';

import { useSetState } from 'src/hooks/use-set-state';

import axios from 'src/utils/axios';

import { route } from 'src/services/apiRoutes';
// eslint-disable-next-line import/no-cycle

import { useAppDispatch } from 'src/hooks/use-redux';

import { decryptText } from 'src/utils/encryption';

import { setUserDetails } from 'src/redux/slices/auth/auth-slice';

import { STORAGE_KEY } from './constant';
import { AuthContext } from '../auth-context';
import { setSession, isValidToken } from './utils';

import type { AuthState } from '../../types';

// ----------------------------------------------------------------------

/**
 * NOTE:
 * We only build demo at basic level.
 * Customer will need to do some extra handling yourself if you want to extend the logic and other features...
 */

type Props = Readonly<{
  children: React.ReactNode;
}>;

export function AuthProvider({ children }: Props) {
  const dispatch = useAppDispatch()

  const { state, setState } = useSetState<AuthState>({
    user: null,
    loading: true,
  });
  const checkUserSession = useCallback(async () => {
    try {
      const accessTokenFromCookies = Cookies.get('accessToken');
      const refreshTokenFromCookies = Cookies.get('refreshToken');
      if (refreshTokenFromCookies) {
        localStorage.setItem('refreshToken', refreshTokenFromCookies);
      }

      const accessTokenFromStorage = localStorage.getItem(STORAGE_KEY);
      const accessToken = accessTokenFromCookies || accessTokenFromStorage || null;

      if (accessToken) {
        const isValid = isValidToken(accessToken);
        if (isValid) {
          setSession(accessToken);
          const res = await axios.get(route.USERDETAIL, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          const decrypted = (await decryptText(res?.data?.response?.data)) || {};

          const user = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;

          setState({ user: { ...user, accessToken }, loading: false });
          dispatch(setUserDetails(user));
          return;
        }
      }

      // If token is invalid or not found, clear state
      setState({ user: null, loading: false });
      dispatch(setUserDetails({}));
    } catch (error) {
      console.error(error)
      setState({ user: null, loading: false });
      dispatch(setUserDetails({}))
    }
  }, [dispatch, setState]);
  useEffect(() => {
    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === 'refreshToken') {
        const accessToken = localStorage.getItem(STORAGE_KEY);

        if (!accessToken) {
          setSession(null);
          setState({ user: null, loading: false });
          dispatch(setUserDetails({}));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch, setState]);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const logout = useCallback(() => {
    Cookies.remove("accessToken"); // Remove token from cookies
    localStorage.clear()
    setSession(null); // Clear axios default headers
    setState({ user: null, loading: false }); // Reset auth state
  }, [setState]);

  const memoizedValue = useMemo(
    () => ({
      user: state.user
        ? {
          ...state.user,
          role: state.user?.role ?? 'admin',
        }
        : null,
      checkUserSession,
      logout,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
    }),
    [checkUserSession, logout, state.user, status]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}
