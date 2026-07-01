import Axios from './axiosInterceptors';

// Define the response type
interface ApiResponse<T = any> {
  message?: string;
  response: T;
  status: number;
}

export const GET = async <T = any>(path: string, params: string = ''): Promise<ApiResponse<T>> => {
  // eslint-disable-next-line no-useless-catch
  try {
    // eslint-disable-next-line no-debugger
    const response = await Axios.get(`${path}${params}`);
    return {
      response: response.data,
      status: response.status,
    };
  } catch (error) {
    throw error;
  }
};

export const POST = async <T = any>(
  path: string,
  payload: Record<string, any> = {},
  headers?: Record<string, any>
): Promise<ApiResponse<T>> => {
  // eslint-disable-next-line no-useless-catch
  try {
    const response = await Axios.post(path, payload, { headers });
    return {
      response: response.data,
      status: response.status,
    };
  } catch (error) {
    throw error;
  }
};

export const PUT = async <T = any>(
  path: string,
  payload: Record<string, any>,
  headers?: Record<string, any>
): Promise<ApiResponse<T>> => {
  // eslint-disable-next-line no-useless-catch
  try {
    const response = await Axios.put(path, payload, { headers });
    return {
      response: response.data,
      status: response.status,
    };
  } catch (error) {
    throw error;
  }
};

export const PATCH = async <T = any>(
  path: string,
  payload: Record<string, any>
): Promise<ApiResponse<T>> => {
  // eslint-disable-next-line no-useless-catch
  try {
    const response = await Axios.patch(path, payload);
    return {
      response: response.data,
      status: response.status,
    };
  } catch (error) {
    throw error;
  }
};

export const DELETE = async <T = any>(
  path: string,
  payload?: Record<string, any>,
  headers?: Record<string, any>
): Promise<ApiResponse<T>> => {
  const response = await Axios.delete(path, {
    data: payload,
    headers,
  });

  return {
    response: response.data,
    status: response.status,
  };
};

