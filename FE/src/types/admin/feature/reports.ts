export type IReportsItem = {
    id: string;
    statement: string;
    filePath: string;
    month: string;
    year: number;
  };
  export type IReportsTableFilters = {
    year: string;
    rmId?: string | null;
  };