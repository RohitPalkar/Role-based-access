import type { Dayjs } from 'dayjs';

export type IBoosterTableFilters = {
  projectName: string;
  status: string | null;
  brandId: string | number | null;
  cityId:any;
  project: string | null;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  sortBy: string | null;
};

export interface Project {
  id: number;
  title: string;
  body: string;
  name: string;
}

export type IBoosterItem = {
  id: string;
  name: string;
  projects: Project[];
  duration: string;
  status: string;
  city: string[];
  brand: any;
};

export type IBoosterStructureBoosterSlabItem = {
  startRange: string;
  endRange: string;
  rewardType: string;
  rewardValue: string;
};

export type IBoosterStructureCreateItem = {
  name: string;
  projects: string[];
  groupId: string;
  brandId: any;
  cityIds: string[];
  startDate: string;
  endDate: string;
  boosterSlabs: IBoosterStructureBoosterSlabItem[];
};

export type BrandsList = {
  value: string;
  label: string;
};

export type CityList = {
  value: string;
  label: string;
};

export type ProjectList = {
  value: string;
  label: string;
};
