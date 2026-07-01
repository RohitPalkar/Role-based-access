import { toast } from 'sonner';
import Cookies from 'js-cookie';

import axios from 'src/utils/axios';

import { route } from 'src/services/apiRoutes';
import { POST } from 'src/services/axiosInstance';

import { STORAGE_KEY } from './constant';

// ----------------------------------------------------------------------

export function jwtDecode(token: string) {
  try {
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts?.length < 2) {
      throw new Error('Invalid token format!');
    }

    const base64Url = parts[1];
    const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/');
    const decoded = JSON.parse(atob(base64));

    return decoded;
  } catch (error) {
    return error;
  }
}

// ----------------------------------------------------------------------

export function isValidToken(accessToken: string) {
  if (!accessToken) {
    return false;
  }

  try {
    const decoded = jwtDecode(accessToken);

    if (!decoded?.exp) {
      return false;
    }

    const currentTime = Date.now() / 1000;
    const isValid = decoded.exp > currentTime;

    return isValid;
  } catch (error) {
    console.error(error);
    return false;
  }
}

// ----------------------------------------------------------------------

export function tokenExpired(exp: number) {
  const currentTime = Date.now();
  const timeLeft = exp * 1000 - currentTime;

  setTimeout(async () => {
    try {
      const newAccessToken = await refreshTokenAPI();

      if (newAccessToken) {
        await setSession(newAccessToken);
      } else {
        toast.warning('Session expired. Please log in again.');
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('🚨 Error during token expiration:', error);
    }
  }, timeLeft);
}

// ----------------------------------------------------------------------

export async function setSession(accessToken: string | null) {
  try {
    if (accessToken) {
      localStorage.setItem(STORAGE_KEY, accessToken);
      const decodedToken = jwtDecode(accessToken);
      if (decodedToken && 'exp' in decodedToken) {
        tokenExpired(decodedToken.exp);
      } else {
        throw new Error('Invalid access token!');
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      delete axios.defaults.headers.common.Authorization;
    }
  } catch (error) {
    console.error('🚨 Error during set session:', error);
  }
}
export async function refreshTokenAPI() {
  try {
    const refreshTokenCookie = Cookies.get('refreshToken');
    const refreshTokenSession = localStorage.getItem('refreshToken');

    const refreshToken = refreshTokenCookie || refreshTokenSession;

    if (!refreshToken) {
      return null;
    }
    const payload = { refreshToken };
    const response = await POST(route.REFRESH_TOKEN_API, payload);
    const accessToken = response?.response?.response?.data?.accessToken;
    return accessToken;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export const formatIndianCurrencyShort = (
  value: number | string | null | undefined
): string => {
  const numValue = Number(value);

  if (value === null || value === undefined || Number.isNaN(numValue)) return "₹0";

  const absValue = Math.abs(numValue);

  if (absValue >= 10000000) {
    const inCr = absValue / 10000000;
    return `₹${inCr.toFixed(inCr % 1 === 0 ? 0 : 2)}Cr`;
  }

  if (absValue >= 100000) {
    const inLakh = absValue / 100000;
    return `₹${inLakh.toFixed(inLakh % 1 === 0 ? 0 : 1)}L`;
  }

  if (absValue >= 1000) {
    const inThousand = absValue / 1000;
    return `₹${inThousand.toFixed(inThousand % 1 === 0 ? 0 : 1)}K`;
  }

  return `₹${absValue.toFixed(0)}`;
};

export const removeEmpty = (obj: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, value]) =>
      value !== '' &&
      value !== null &&
      value !== undefined &&
      !(typeof value === 'number' && value === 0)
    )
  );
