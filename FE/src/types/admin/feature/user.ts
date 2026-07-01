export type IUserTableFilters = {
  name: string;
  role: string | null;
  brand: string | null;
  status: string | null;
  group: string | null;
};

export type IUserItem = {
  id: number;
  EmpId: string;
  name: string;
  role: string;
  email: string;
  status: string;
  phoneNumber: number;
  group: {
    id: string;
    name: string;
  };
  brand: string;
  employeeStatus: string;
};
