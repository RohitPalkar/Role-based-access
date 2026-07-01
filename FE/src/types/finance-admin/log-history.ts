export interface ILogHistoryResponse {
  empID: string;
  emailAddress: string;
  name: string;
  fileName: string;
  uploadedAt: string | null;
  total: number | null;
}

export type ILogsTableFilters = {
  name: string | null;
  startDate: null | string;
  endDate: null | string;
};
