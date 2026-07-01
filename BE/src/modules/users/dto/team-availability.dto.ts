export type AvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE';

export class TeamProjectDto {
  id: number;
  name: string;
}

export class TeamMemberAvailabilityDto {
  userId: number;
  empId: string | null;
  name: string;
  email: string;
  role: string;
  currentStatus: AvailabilityStatus;
  statusLabel: string;
  unavailableFrom?: string;
  unavailableTo?: string;
  projects: TeamProjectDto[];
  allocatedIomsCount: number;
}
