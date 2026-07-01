
import { appendPayloadToEndpoint } from 'src/utils/helper';

import { route } from '../apiRoutes';
import { GET } from '../axiosInstance';

import type { ILogsTableFilters } from '../../types/finance-admin/log-history';


export const getHistoryLogs = async (payload: ILogsTableFilters) => {
    try {
      const response = await GET(appendPayloadToEndpoint(route.LOG_HISTORY, payload));
      if (response?.status === 200 || response?.status === 201) {
        return response?.response?.response?.data;
      }
      throw new Error('Unexpected response status');
    } catch (error: any) {
      throw new Error(error.response?.data || 'Something went wrong');
    }
  };