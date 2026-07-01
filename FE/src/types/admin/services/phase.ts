import type { IPhaseItem } from '../feature/phase';

export interface Phase {
  id: number;
  name: string;
  logo: string;
  projectStage: string;
}
export interface PhaseResponse {
  phases: IPhaseItem[];
  total: number;
  loading: boolean;
  error: string | null;
}

export interface PhasePayload {
  name: string;
  assignedProjects: string[] | number[];
}
export interface PhaseEditPayload {
  skipLaunch: boolean;
  sustenanceDate: string | null;
  launchStartDate?: string | null;
  launchEndDate?: string | null;
}