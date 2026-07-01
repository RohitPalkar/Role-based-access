
/// Incentive Policy
export interface Incentive {
  id: number;
  name: string;
  active: boolean;
  status?: string;
  projectName: string | null;
  brandName?: {
    name: string;
  } | {
    name: string;
  }[] | null;
  duration?: string | null;
}

export interface IncentiveResponse {
  policies: Incentive[];
  total: number;
}

export interface IncentivePayload {
  name: string;
  brandId: string[];
  regions: string[];
  cities: string[];
  projects: string[] | number[];
  maxPayableIncentive: null | number
  incentiveSlabs: {
    eligibilitySlab: number;
    launchStartRange: string | number;
    launchEndRange: string | number;
    sustenanceStartRange: string | number;
    sustenanceEndRange: string | number;
    incentivePercentage: string | number;
  }[];
  minimumBookings: number;
}

export interface Regions {
  id: number;
  name: string;
}
export interface ISelectOption {
  value: string | number;
  label: string;
}