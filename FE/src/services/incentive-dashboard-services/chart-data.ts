import type { ISemiCircleChartFilter } from "src/types/admin/services/rm-dashboard-chart-data";

import { appendPayloadToEndpoint } from "src/utils/helper";

import { route } from "../apiRoutes";
import { GET } from "../axiosInstance";

export const getCurrentSalesData = async (payload: ISemiCircleChartFilter) => {
    try {
      const endpoint = appendPayloadToEndpoint(route.INCENTIVE_DASHBOARD_SEMICIRCLE_CHART, {
        ...payload,
        _t: Date.now(),
      });
      const response = await GET(endpoint);
      if (response?.status === 200 || response?.status === 201) {
        return (
          response?.response?.response?.data ??
          response?.response?.data ??
          response?.response ??
          response
        );
      }
      throw new Error('Unexpected response status');
    } catch (error: any) {
      throw new Error(error.response?.data || 'Something went wrong');
    }
  };