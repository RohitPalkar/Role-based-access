import { route } from "../apiRoutes";
import { GET } from "../axiosInstance";

export const getSFDCLogsList = async (params?: string) => {
  try {
    const response = await GET(route.SFDC_LOGS_LIST, params);

    if (response?.status === 200 || response?.status === 201) {
      return response.response?.data ?? response?.response?.response?.data;
    }

    throw new Error('Failed to fetch Logs');
  } catch (error: any) {
    const be = error?.response?.data;

    const message =
      be?.errors?.message ||
      be?.message ||
      'Failed to fetch Logs';

    throw new Error(message);
  }
};

export const getSFDCLogById = async (id: number) => {
  try {
    const response = await GET(`${route.GET_SFDC_LOG_BY_ID}${id}`);

    if (response?.status === 200 || response?.status === 201) {
      return response.response?.data ?? response?.response?.response?.data;
    }

    throw new Error('Failed to fetch SFDC log');
  } catch (error: any) {
    const be = error?.response?.data;

    const message =
      be?.errors?.message ||
      be?.message ||
      'Failed to fetch SFDC log';

    throw new Error(message);
  }
};