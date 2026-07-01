export type IBrandsTableFilters = {
  name: string;
  salarymultiplier: string | null;
};

export type IBrandsItem = {
  rtmPayable: string | number | null | undefined;
  rtmRegularization: string | number | null | undefined;
  reraPayable: string | number | null | undefined;
  reraRegularization: string | number | null | undefined;
  id: number;
  zone: string;
  name: string;
  logo: string;
  projectStage: string;
  salarymultiplier: number | null;
  razorpaySecret?: string | null;
  razorpayKey?: string | null;
  easebuzzBookingSalt: string | null;
  easebuzzMilestoneSalt: string | null;
  easebuzzBookingKey: string | null;
  easebuzzMilestoneKey: string | null;
  easebuzzBookingmid: string | null;
  easebuzzMilestonemid: string | null;
};
