export interface ITopPerformersResponse {
  data: {
    performers: {
      id: string;
      name: string;
      totalSales: string;
      bookingsCount: number;
    }[];
  };
}

  export interface ICancellationsResponse {
    id: string;
    name: string;
    totalSales: string;
    totalCancellations: any;
  }