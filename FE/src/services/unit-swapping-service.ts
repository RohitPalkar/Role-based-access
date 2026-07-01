import { route } from './apiRoutes';
import { POST } from './axiosInstance';

// Unit Swapping Service for handling unit swap operations

export interface UnitSwappingRequest {
  sourceOppId: string;
  targetOppId: string;
}

export interface UnitSwappingResponse {
  response: any;
  success: boolean;
  message: string;
}

export class UnitSwappingService {
  // Submit unit swapping request
  static async swapUnits(request: UnitSwappingRequest): Promise<UnitSwappingResponse> {
    try {
      const response = await POST(route.SALES_UNIT_SWAPPING, request);
      return response.response;
    } catch (error: any) {
      throw new Error(error?.response?.data?.errors?.message || 'Failed to swap units');
    }
  }
}
