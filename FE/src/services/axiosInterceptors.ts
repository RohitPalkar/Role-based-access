// src/api/axiosInterceptors.ts
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import axios from 'axios';

import { paths } from 'src/routes/paths';

import { toast } from 'src/components/snackbar';

import { encryptText, decryptText, maybeParseJSON, enableEncryption } from 'src/utils/encryption';

import { CONFIG } from 'src/config-global';

import { STORAGE_KEY } from 'src/auth/context/jwt/constant';

const Axios = axios.create({
  baseURL: CONFIG.site.serverUrl,
  headers: { 'Content-Type': 'application/json' },
});

/* ----------------------- REQUEST ----------------------- */
Axios.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }

    // Only encrypt bodies (not GET), and skip FormData/ArrayBuffer
    const method = (config.method || 'get').toLowerCase();
    const hasBody = ['post', 'put', 'patch', 'delete'].includes(method);
    const body = config.data;

    if (
      enableEncryption &&
      hasBody &&
      body != null &&
      !(body instanceof FormData) &&
      !(body instanceof ArrayBuffer)
    ) {
      const encrypted = await encryptText(JSON.stringify(body));
      config.data = { payload: encrypted };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ----------------------- RESPONSE ----------------------- */
Axios.interceptors.response.use(
  async (response: AxiosResponse) => {
    const data = response?.data;

    // Case 1: { payload: "<encrypted>" }
    const rootPayload = data?.payload;

    if (enableEncryption && typeof rootPayload === 'string') {
      const decrypted = await decryptText(rootPayload);
      response.data = maybeParseJSON(decrypted);
      return response;
    }

    // Case 2: { response: { data: "<encrypted>" } }
    const nestedPayload = data?.response?.data;

    if (enableEncryption && typeof nestedPayload === 'string') {
      const decrypted = await decryptText(nestedPayload);
      const parsed = maybeParseJSON(decrypted);
      response.data.response.data = parsed;
      return response;
    }

    return response;
  },

  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url;

    // 401 Handling
    if (status === 401) {
      const isOTPRequest = url?.includes('/sso/verify-otp');

      if (!isOTPRequest) {
        logoutUser();
      }
    }

    // 403 Handling - show permission denied toast
    if (status === 403) {
      const errorMessage =
        error?.response?.data?.errors?.message ||
        error?.response?.data?.errors?.[0]?.message ||
        'You do not have permission to perform this action';
      toast.error(errorMessage);
    }

    // Attempt decrypting backend error payloads
    try {
      const payload = error?.response?.data?.payload;
      if (enableEncryption && typeof payload === 'string') {
        const decrypted = await decryptText(payload);
        error.response.data = maybeParseJSON(decrypted);
      }
    } catch {
      // Ignore decrypt failure
    }

    throw error;
  }
);

/* ----------------------- LOGOUT ----------------------- */
function logoutUser() {
  localStorage.removeItem(STORAGE_KEY);
  delete Axios.defaults.headers.common.Authorization;

  const path = window.location.pathname;
  const onAuthPage = path.includes('/auth/') || path.includes('/sign-in') || path.includes('/otp');

  if (!onAuthPage) {
    window.location.href = paths.auth.jwt.signIn;
  }
}

export default Axios;
