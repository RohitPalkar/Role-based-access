export type ProjectsByBrandRes = {
  message: string;
  data: {
    userId?: string;
    brand?: string;
    projects: Array<{ id: number; name: string }>;
  };
};
