export type EmployeeListTableFilters = {
  empID: string;
  name: string;
};

export type EmployeeList = {
  id: string;
  empId: number;
  name: string;
  email: string;
  roleName: string;
  updatedAt: string;
  salary: string;
  accruals: string;
  hasSalary: boolean;
  userId: string;
  employeeStatus: string;
};

export type IEmployeeListCreateItem = {
  name: string;
  email: string;
  salary: string;
  accruals: string;
  roleId: number;
  roleName: string;
  hasSalary: boolean;
  finances: {
    accumulatedBalance: number;
    amount: number;
    date: string;
    action: string;
    balance: number;
  }[];
};

export interface EmployeeListState {
  employeeList: any[];
  loading: boolean;
  error: string | null;
  total: number | null;
  employeeDetails: [] | null;
}

export interface UpdateFinanceData {
  amount: number;
  date: string;
  action: string;
  salary: number;
  accumulatedBalance?: number;
}

export interface UpdateEmployeeParams {
  id: string | undefined;
  employeeDetails: UpdateFinanceData;
}
