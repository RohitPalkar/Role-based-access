import type { Dayjs } from 'dayjs';

export type IIncentiveStructureTableFilters = {
  name: string;
  status: string | null;
  brand: string | null;
  startDate?: Dayjs | null;
  endDate?: Dayjs | null;
  project: any;
};

export type BrandNameItem = {
  name: string;
};

export type IIncentiveStructureItem = {
  active: any;
  id: number;
  name: string;
  status: string;
  projectName: string | null;
  brandName: BrandNameItem | BrandNameItem[];
  brandIds?: number[];
  duration?: string;
};

export type IIncentiveStructureIncentiveSlabItem = {
  id?:number;
  launchStartRange: string;
  launchEndRange: string;
  sustenanceStartRange: string;
  sustenanceEndRange: string;
  sustenanceIncentivePercentage: string;
  launchIncentivePercentage: string;
};

export type IIncentiveStructureCreateItem = {
  name: string;
  projects: string[];
  slabs: IIncentiveStructureIncentiveSlabItem[];
  maxPayableIncentive?: null | number;
  groupId?: string;
  brandId?: string | string[];
  regions?: string[];
  cities?: string[];
  startDate?: string | null;
  endDate?: string | null;
  minimumBookings?: string | number;
};

export type ProjectList = {
  value: string;
  label: string;
  projectTypeFlag?: string;
};
