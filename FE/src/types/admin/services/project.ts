/// Incentive Policy
export interface Project {
  id: number;
  name: string;
  active: boolean;
  projects: string[];
}

export interface ProjectResponse {
  structures: Project[];
  total: number;
}

export interface ProjectPayload {
  page: number;
  search: string;
  limit: number;
  brand: string;
  city: string;
  phases: string;
}
