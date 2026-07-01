export type IPhaseTableFilters = {
  name: string;
  brand: string | null;
  city: string[] | null;
  
};

export type IPhaseItem = {
  project: string;
  city: string;
  brand: string;
  id: number;
  name: string;
  reraStatus: 'YES' | 'NO' | string;
  projectType: string;
  possessionDate: string | null;
  sustenanceDate: string | null;
  skipLaunch: boolean;
  isLaunch: boolean;
  isSustenance: boolean;
  launchStartDate: string | null;
  launchEndDate: string | null;
  launchDateRange: string | null;
};


// get phase data by id response data interface
export type PhaseDataInterface = {
  project: string;
  city: any;
  brand: any;
  id: number;
  name: string;
  reraStatus: 'YES' | 'NO' | string;
  projectType: string;
  sustenanceDate: string | null;
  skipLaunch: boolean;
  isLaunch: boolean;
  isSustenance: boolean;
  launchStartDate: string | null;
  launchEndDate: string | null;
  launchDateRange: string | null;
  easebuzzBookingmid?: string;
  easebuzzMilestonemid?: string;
  region?:string[]
  sfdcPhaseName?: string,
  blockNames?: string[],
  possessionDate?: string | null,
};

