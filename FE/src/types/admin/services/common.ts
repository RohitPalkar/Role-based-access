export interface ICity {
  id: string;
  name: string;
  active: boolean;
  cityName: string;
  phase: [];
}

export interface CityResponse {
  cities: ICity[];
}

export interface IProject {
  id: string;
  name: string;
}

export interface IProjectPayload {
  brandId: string;
  cityIds: string[];
}

export interface Company {
  id: string;
  name: string;
}

export type IomDropdownType =
  | 'projects'
  | 'adjustmentType'
  | 'InvoiceStatus'
  | 'IomStatus';

export type IomDropdownOption = {
  value: string | number;
  label: string;
  sequence?: number;
};

export type IomDropdownGroup = {
  type: IomDropdownType;
  items: IomDropdownOption[];
};

export type IomDropdowns = {
  projects: IomDropdownOption[];
  adjustmentType: IomDropdownOption[];
  InvoiceStatus: IomDropdownOption[];
  IomStatus: IomDropdownOption[];
};