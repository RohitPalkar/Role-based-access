import { route } from './apiRoutes';
import { POST } from './axiosInstance';

// Local Auth Service for handling username/password authentication

export interface LocalLoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface LocalLoginResponse {
  statusCode: number;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    userRole: string;
    user: {
      id: number;
      name: string;
      email: string;
      role: string;
    };
  } | null;
}

export interface LocalLogoutResponse {
  statusCode: number;
  message: string;
  data: {
    logout: boolean;
  };
}

export class LocalAuthService {
  // Local login with username/email and password
  static async login(request: LocalLoginRequest): Promise<LocalLoginResponse> {
    try {
      const response = await POST(route.LOCAL_LOGIN, request);
      return response.response;
    } catch (error: any) {
      console.error('Local login error:', error);
      throw new Error(error?.response?.data?.errors?.message || 'Invalid credentials');
    }
  }

  // Local logout
  static async logout(): Promise<LocalLogoutResponse> {
    try {
      const response = await POST(route.LOCAL_LOGOUT, {});
      return response.response;
    } catch (error: any) {
      console.error('Local logout error:', error);
      throw new Error(error?.response?.data?.errors?.message || 'Logout failed');
    }
  }
}