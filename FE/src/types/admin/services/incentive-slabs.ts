interface Brand {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
}

interface IncentiveSlab {
  map(
    arg0: (obj: any) => {
      id: any;
      launchStartRange: any;
      launchEndRange: any;
      launchIncentivePercentage: any;
      sustenanceStartRange: any;
      sustenanceEndRange: any;
      sustenanceIncentivePercentage: any;
    }
  ): unknown;
  id: number;
  launchProject: {
    startRange: number;
    endRange: number;
    incentivePercentage: number;
    minimumBookings?: number;
  };
  sustenanceProject: {
    startRange: number;
    endRange: number;
    incentivePercentage: number;
    minimumBookings?: number;
  };
}

interface IncentivePolicy {
  id: number;
  name: string;
  projects: Project[];
  incentiveSlabs: IncentiveSlab[];
  regions: string;
}

interface BoosterSlab {
  id: number;
  startRange: string;
  endRange: string;
  rewardType: string;
  rewardValue: string;
}

interface BoosterProject {
  id: number;
  name: string;
  reraRegularization: string;
  reraPayable: string;
  rtmRegularization: string;
  rtmPayable: string;
  maxQualificationDays: number;
}

interface Booster {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  boosterSlabs: BoosterSlab[];
  projects: BoosterProject[];
}

export interface Data {
  brand: Brand | null;
  incentivePolicy: IncentivePolicy[];
  boosters: Booster[];
}

export interface IIncentiveSlabResponse {
  data: Data;
}
