import type { AppDispatch } from 'src/redux/store';

import Cookies from 'js-cookie';

import axios from 'src/utils/axios';
import { decryptText } from 'src/utils/encryption';

import { route } from 'src/services/apiRoutes';
import { setUserDetails } from 'src/redux/slices/auth/auth-slice';

import { STORAGE_KEY } from 'src/auth/context/jwt/constant';

export async function refreshUserDetailsFromApi(
  dispatch: AppDispatch
): Promise<Record<string, unknown> | null> {
  try {
    const accessTokenFromCookies = Cookies.get('accessToken');
    const accessTokenFromStorage = localStorage.getItem(STORAGE_KEY);
    const accessToken = accessTokenFromCookies || accessTokenFromStorage || null;

    if (!accessToken) {
      return null;
    }

    const res = await axios.get(route.USERDETAIL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const decrypted = (await decryptText(res?.data?.response?.data)) || {};
    const user = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;

    dispatch(setUserDetails(user));
    return user;
  } catch (error) {
    console.error('refreshUserDetailsFromApi failed', error);
    return null;
  }
}
