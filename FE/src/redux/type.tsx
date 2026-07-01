export type GroupType = {
  id: number;
  name: string;
  startDate: string;
  endDate: string | null;
};

export interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  revenueTarget: string;
  unitsTarget: number;
  areaTarget: string;
  userGroup: string;
  monthlySalary: string;
  status: string | null;
  group: GroupType;
  role: string;
  updatedPost: Partial<EditUserState>;
  project?: string | number;
  signatureImage?: string; // URL or base64 string for user signature 
  employeeStatus?: string;
  contactNumber?: string;
  countryCode?: string;
  roleId?: string
  regionIds: number[];
}

export interface UserListResponse {
  users: User[];
  totalCount: number | null;
}

export interface userDetailsListObj {
  groupId: number;
  groupName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface userDetailsListResponse {
  assignments: userDetailsListObj[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
  userDetails: User | null;
  totalCount: number | null;
  count: number | null;
  groups: any[];
  roles: any[];
  rmList: [];
  userDetailsList: userDetailsListResponse | null;
  rolesDropdown: any[];
}

export interface EditUserState {
  id: number;
  title: string;
  content: string;
}

export interface Project {
  billingEntity:{ id: string; name: string };
  projectName: any;
  id: number;
  title: string;
  body: string;
  city: { id: string; name: string };
  brand: { id: string; name: string };
  phases: string[];
  name: string;
  reraPayable: string;
  reraRegularization: string;
  rtmPayable: string;
  rtmRegularization: string;
  maxQualificationDays: number;
  maxQualificationEffectiveFrom: string;
  razorpayKey?: string;
  razorpaySecret?: string;
  easebuzzBookingSalt?: string;
  easebuzzMilestoneSalt?: string;
  easebuzzBookingKey?: string;
  easebuzzMilestoneKey?: string;
  easebuzzBookingmid?: string;
  easebuzzMilestonemid?: string;
  tlId?: number;
  rshId?: number;
  gre?: { id: string; name: string }[];
  tl?: { id: string; name: string }[];
  ph?: { id: string; name: string } | null;
  rsh?: { id: string; name: string } | null;
  crm?: { id: string; name: string }[];
  bis?: { id: string; name: string }[];
  buddyRMs?: { id: string; name: string }[];
  finance?: { id: string; name: string }[];
  availableGateways?: string[];
  companyId: string;
  sfdcProjectName: string;
  codename: string | string[];
  projectImage: string;
  jvPartnerLogo: string;
  agreementPercentage?: number;
}

export interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  projectDetails: Project | null;
  phase: [] | null;
  billingEntites: [];
  totalCount: number | null;
}

export interface UpdateProject {
  name: string;
  cityId: number;
  brandId: string;
  phaseIds: number[];
  reraRegularization: string;
  reraPayable: string;
  rtmRegularization: string;
  rtmPayable: string;
  maxQualificationDays: number;
  agreementPercentage?: number;
}

export interface ProjectListResponse {
  projects: Project[];
  totalCount: number | null;
}

export interface CreateProject {
  name: string;
  cityId: number;
  brandId: number;
  phaseIds: number[];
}
export interface Reports {
  reports: Reports[];
  loading: boolean;
  error: string | null;
}

export interface FetchUserDetailsListArgs {
  userId: number;
  params: {
    page: number;
    limit: number;
    search: string;
  };
}
