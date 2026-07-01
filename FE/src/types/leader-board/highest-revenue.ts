export interface RevenueEntry {
  id: number;
  name: string;
  revenue: number;
  type: string;
  user: {
    id: number;
    name: string;
  };
  sales: number;
  results: any;
}

export interface HighestRevenueState {
  revenue: RevenueEntry[];
  loading: boolean;
  error: string | null;
}
