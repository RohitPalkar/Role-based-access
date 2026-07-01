import type { PhasePayload, PhaseEditPayload } from 'src/types/admin/services/phase';

import { appendPayloadToEndpoint } from 'src/utils/helper';

import { route } from '../apiRoutes';
import { GET, POST,PATCH } from '../axiosInstance';

// create or edit phase payload interface
export interface CreateOrEditPhasePayloadInterface {
  brandId: number;
  cityId: number;
  name: string;
  easebuzzMilestonemid?: string;
  easebuzzBookingmid?: string;
}

export const getPhaseList = async (payload: PhasePayload) => {
  try {
    const response = await GET(appendPayloadToEndpoint(route.PHASES, payload));
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.response?.data || error.message || 'Something went wrong');
  }
};

export const getAllPhases = async (payload: any) => {
  try {
    const response = await GET(appendPayloadToEndpoint(route.PHASES_FIND_ALL, payload));
    
    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.response?.data || error.message || 'Something went wrong');
  }
};

export const editPhase = async (id: number, payload: PhaseEditPayload) => {
  try {
    // Validate inputs
    if (!id || typeof id !== 'number') {
      throw new Error('Invalid phase ID');
    }
    
    if (!payload) {
      throw new Error('Payload is required');
    }
    
    
    const response = await PATCH(`${route.EDIT_PHASES}${id}`, payload);
    
    
    if (response?.status === 200 || response?.status === 201) {
      return response;
    }
    throw new Error(`Unexpected response status: ${response?.status}`);
  } catch (error: any) {
    console.error('editPhase error:', error);
    const errorMessage = error?.response?.data?.message || 
                         error?.response?.data || 
                         error?.message || 
                         'Something went wrong';
    throw new Error(errorMessage);
  }
};

// get phase details  by id
export const getPhaseById = async (id: number) => {
  try {
    const url = `${route.GET_PHASE_BY_ID}/${id}`;
    const response = await GET(url);

    if (response?.status === 200) {
      return response?.response?.response?.data;
    }
    throw new Error('Unexpected response status');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.response?.data || error.message || 'Something went wrong');
  }
};


// create or edit phase
export const createOrEditPhase = async (
  payload: CreateOrEditPhasePayloadInterface,
  id?: string
) => {
  try {
    let response;

     if (id !== undefined && id !== null) {
      // Edit existing phase
      response = await PATCH(`${route.EDIT_PHASES}/${id}`, payload);
    } else {
      // Create new phase
      response = await POST(route.CREATE_PHASE, payload);
    }

    if (response?.status === 200 || response?.status === 201) {
      return response;
    }

    throw new Error(`Unexpected response status: ${response?.status}`);
  } catch (error: any) {
   
    const errorMessage =
    error?.response?.data?.errors?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong';

    throw new Error(errorMessage);
  }
};