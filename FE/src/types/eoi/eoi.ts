import type { Dayjs } from "dayjs";

export type CampaignTableFilters = {
  search: string;
  projectStatus: any[];
  city: any[];

};

export type Date = Dayjs | string | null;

