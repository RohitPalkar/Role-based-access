import { route } from './apiRoutes';
import { POST } from './axiosInstance';

// OTP Service for handling OTP-based authentication

export interface SendOTPRequest {
  email: string;
}

export interface SendOTPResponse {
  response: any;
  success: boolean;
  message: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface VerifyOTPResponse {
  response: any;
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export class OTPService {
  // Send OTP to email
  static async sendOTP(request: SendOTPRequest): Promise<SendOTPResponse> {
    try {
      const response = await POST(route.SEND_OTP, request);
      return response.response;
    } catch (error: any) {
      console.error('Send OTP error:', error);
      throw new Error(error?.response?.data?.errors?.message || 'Failed to send OTP');
    }
  }

  // Resend OTP to email
  static async resendOTP(request: SendOTPRequest): Promise<SendOTPResponse> {
    try {
      const response = await POST(route.RESEND_OTP, request);
      return response.response;
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      throw new Error(error?.response?.data?.errors?.message || 'Failed to resend OTP');
    }
  }

  // Verify OTP
  static async verifyOTP(request: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    try {
      const response = await POST(route.VERIFY_OTP, request);
      return response.response;
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      throw new Error(error?.response?.data?.errors?.message || 'Invalid OTP');
    }
  }
}