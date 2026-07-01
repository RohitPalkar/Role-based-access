
export interface SemiCircleChartData {
  userId?: number;
  month?: number;
  year?: number;
  currentSales?: SalesValue;
  earnedIncentive?: SalesValue;
  slabs?: Slab[];
}
export interface SalesValue {
  value?: string;
  unit?: string;
}

export interface Slab {
  slabId?: number;
  startRange?: SalesValue;
  endRange?: SalesValue;
  incentiveRate?: SalesValue;
  incentiveAmount?: SalesValue;
  completedPercentage?: SalesValue;
  isCurrentSlab?: boolean;
}

export interface IDashboardChartData {
  minValue: number;
  maxValue: number;
  incentiveRate: number;
  incentiveAmount: number;
  total: string | null;
}

export type ISemiCircleChartFilter = {
  name?: string | null;
  phaseType?: string;
};

export interface SemiCircleChartResponse {
  currentSalesChartData: SemiCircleChartData;
}
