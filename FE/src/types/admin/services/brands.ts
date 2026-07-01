import type { IBrandsItem } from '../feature/brands';

export interface Brands {
  id: number;
  name: string;
  logo: string;
  projectStage: string;
}
export interface BrandsResponse {
  brands: IBrandsItem[];
  total: number;
  loading: boolean;
  error: string | null;
}

export interface BrandsPayload {
  name: string;
  assignedProjects: string[] | number[];
}
export interface BrandsEditPayload {
  salaryMultiplier: number | null;
}
