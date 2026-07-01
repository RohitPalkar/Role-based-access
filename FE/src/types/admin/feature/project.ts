export type IProjectTableFilters = {
  phases?: any;
  name: string;
  brand: string | null;
  city: any;
  billingEntity: string | null;
};

export type IProjectItem = {
  id: number;
  projectId: number;
  projectPhase: string;
  projectName: string;
  brand: string;
  city: string;
  billingEntity: string;
  reraPayable: string;
  reraRegularization: string;
  rtmPayable: string;
  rtmRegularization: string;
};
