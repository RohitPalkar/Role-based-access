export interface IReportsResponse {
    structures: any;
    reports: any;
    id: string;
    statement: string;
    filePath: string;
    month: string;
    year: number;
  };
  export interface IReportsTableFilters {
    year: string;
  };
  
  export interface IUserBookingsFilters {
    page?: string;
    limit?: string;
    userId?: string;
    search?:string;
    brandId?: string;
    projectIds?: any;
    unitStatus?: string;
    incentiveStatus?: string;
    startDate?: string;
    endDate?: string;
  };
  export interface IUserBookingsResponse {
    bookings: any;
    total: number;
    page: number;
    limit: number;
  };