/// Booster
export interface BoosterProject {
  id: number;
  title: string;
  body: string;
  name: string;
}
export interface Booster {
  id: string;
  name: string;
  duration: string;
  status: string;
  projects: BoosterProject[];
}

export interface BoosterState {
  booster: Booster[];
  loading: boolean;
  error: string | null;
}

export interface BoosterResponse {
  booster: Booster[];
  total: number;
}

export interface BoosterPayload {
  name: string;
  brandId: string | number;
  cityIds: string[] | number[];
  startDate: string;
  endDate: string;
  projects: string[] | number[];
  boosterSlabs: {
    id: number;
    startRange: string | number;
    endRange: string | number;
    rewardType: string;
    rewardValue: string | number;
  }[];
}
