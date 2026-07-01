// ----------------------------------------------------------------------

export const ROOTS = {
  AUTH: '/auth',
  ADMIN: '/admin',
  SUPER_ADMIN: '/super-admin',
  RM_PANEL: '/rm-panel',
  FINANCE_ADMIN: '/finance-admin',
  CRM: '/crm',
  GRE: '/gre',
  MIS: '/mis',
  SALES_TL: '/sales-tl',
  SALES_RSH: '/sales-rsh',
  SALES_BH: '/sales-bh',
  EOI_MANAGER: '/eoi-manager',
  PROJECT_HEAD: '/project-head',
  BIS: '/bis',
  CRM_TL: '/crm-tl',
  CRM_HEAD: '/crm-head',
  FINANCE_USER: '/finance-user',
  FINANCE_HEAD: '/finance-head',
  LOYALTY: '/loyalty',
};

// ----------------------------------------------------------------------

export const paths = {
  faqs: '/faqs',
  minimalStore: 'https://mui.com/store/items/minimal-dashboard/',
  // PROFILE
  profile: {
    settings: '/rm-panel/profile/settings',
  },
  // AUTH
  auth: {
    amplify: {
      signIn: `${ROOTS.AUTH}/amplify/sign-in`,
      verify: `${ROOTS.AUTH}/amplify/verify`,
      signUp: `${ROOTS.AUTH}/amplify/sign-up`,
      updatePassword: `${ROOTS.AUTH}/amplify/update-password`,
      resetPassword: `${ROOTS.AUTH}/amplify/reset-password`,
    },
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
    },
    firebase: {
      signIn: `${ROOTS.AUTH}/firebase/sign-in`,
      verify: `${ROOTS.AUTH}/firebase/verify`,
      signUp: `${ROOTS.AUTH}/firebase/sign-up`,
      resetPassword: `${ROOTS.AUTH}/firebase/reset-password`,
    },
    auth0: {
      signIn: `${ROOTS.AUTH}/auth0/sign-in`,
    },
    supabase: {
      signIn: `${ROOTS.AUTH}/supabase/sign-in`,
      verify: `${ROOTS.AUTH}/supabase/verify`,
      signUp: `${ROOTS.AUTH}/supabase/sign-up`,
      updatePassword: `${ROOTS.AUTH}/supabase/update-password`,
      resetPassword: `${ROOTS.AUTH}/supabase/reset-password`,
    },
  },
  // ADMIN
  admin: {
    root: `${ROOTS.ADMIN}/user`,
    user: {
      root: `${ROOTS.ADMIN}/user`,
      edit: (id: string) => `${ROOTS.ADMIN}/user/${id}/edit`,
      create: `${ROOTS.ADMIN}/create`,
    },
    brand: {
      root: `${ROOTS.ADMIN}/brand`,
      edit: (id: string) => `${ROOTS.ADMIN}/brand/${id}/edit`,
    },
    phase: {
      root: `${ROOTS.ADMIN}/phase`,
      edit: (id: string) => `${ROOTS.ADMIN}/phase/${id}/edit`,
      create: `${ROOTS.ADMIN}/phase/create`,
    },
    booster: {
      root: `${ROOTS.ADMIN}/booster`,
      edit: (id: string) => `${ROOTS.ADMIN}/booster/${id}/edit`,
      create: `${ROOTS.ADMIN}/booster/create`,
    },
    incentiveStructure: {
      root: `${ROOTS.ADMIN}/incentive-structure`,
      edit: (id: string) => `${ROOTS.ADMIN}/incentive-structure/${id}/edit`,
      create: `${ROOTS.ADMIN}/incentive-structure/create`,
    },
    project: {
      root: `${ROOTS.ADMIN}/project`,
      edit: (id: string) => `${ROOTS.ADMIN}/project/${id}/edit`,
      create: `${ROOTS.ADMIN}/project/create`,
    },
    reports: {
      root: `${ROOTS.ADMIN}/reports`,
      users: {
        root: `${ROOTS.ADMIN}/reports/users`,
        edit: (id: string) => `${ROOTS.ADMIN}/reports/users/${id}/edit`,
      },
      bookings: {
        root: `${ROOTS.ADMIN}/reports/bookings`,
        // bookingDateModification: `${ROOTS.ADMIN}/reports/bookings/booking-date-modification`,
      },
      incentives: { root: `${ROOTS.ADMIN}/reports/incentives` }, // Add this line
    },
    leaderBoard: {
      root: `${ROOTS.ADMIN}/leader-board`,
      leaderBoard: {
        root: `${ROOTS.ADMIN}/leader-board`,
      },
      rmSummary: {
        root: `${ROOTS.ADMIN}/leader-board/rmSummary`,
      },
    },
    uploads: {
      root: `${ROOTS.ADMIN}/uploads`,
      bookingDateModification: {
        root: `${ROOTS.ADMIN}/uploads/booking-date-modification`,
      },
    },
    voucherEOI: {
      root: `${ROOTS.ADMIN}/eoi-records`,
    },
    voucherChannelPartners: {
      root: `${ROOTS.ADMIN}/cp-list`,
    },
    eoiManagerDashboard: {
      root: `${ROOTS.ADMIN}/eoi-manager`,
      create: `${ROOTS.ADMIN}/eoi-manager/create`,
      edit: (id: string) => `${ROOTS.ADMIN}/eoi-manager/edit/${id}`,
    },
    eoiDashboard: {
      root: `${ROOTS.ADMIN}/eoi-dashboard`,
    },
    eoiLeaderboard: {
      root: `${ROOTS.ADMIN}/eoi-leaderboard`,
    },
    unitInventory: {
      root: `${ROOTS.ADMIN}/inventory`,
    },
    bankDetails: {
      root: `${ROOTS.ADMIN}/bank-details`,
    },
    batch: {
      root: `${ROOTS.ADMIN}/batch/dashboard`,
      dashboard: `${ROOTS.ADMIN}/batch/dashboard`,
      listing: `${ROOTS.ADMIN}/batch/listing`,
      tracker: `${ROOTS.ADMIN}/batch/tracker`,
    },
  },
  superAdmin: {
    root: `${ROOTS.SUPER_ADMIN}/user`,
    user: {
      root: `${ROOTS.SUPER_ADMIN}/user`,
      edit: (id: string) => `${ROOTS.SUPER_ADMIN}/user/${id}/edit`,
      create: `${ROOTS.SUPER_ADMIN}/create`,
    },
    brand: {
      root: `${ROOTS.SUPER_ADMIN}/brand`,
      edit: (id: string) => `${ROOTS.SUPER_ADMIN}/brand/${id}/edit`,
    },
    phase: {
      root: `${ROOTS.SUPER_ADMIN}/phase`,
      edit: (id: string) => `${ROOTS.SUPER_ADMIN}/phase/${id}/edit`,
      create: `${ROOTS.SUPER_ADMIN}/phase/create`,
    },
    booster: {
      root: `${ROOTS.SUPER_ADMIN}/booster`,
      edit: (id: string) => `${ROOTS.SUPER_ADMIN}/booster/${id}/edit`,
      create: `${ROOTS.SUPER_ADMIN}/booster/create`,
    },
    incentiveStructure: {
      root: `${ROOTS.SUPER_ADMIN}/incentive-structure`,
      edit: (id: string) => `${ROOTS.SUPER_ADMIN}/incentive-structure/${id}/edit`,
      create: `${ROOTS.SUPER_ADMIN}/incentive-structure/create`,
    },
    project: {
      root: `${ROOTS.SUPER_ADMIN}/project`,
      edit: (id: string) => `${ROOTS.SUPER_ADMIN}/project/${id}/edit`,
      create: `${ROOTS.SUPER_ADMIN}/project/create`,
    },
    reports: {
      root: `${ROOTS.SUPER_ADMIN}/reports`,
      users: {
        root: `${ROOTS.SUPER_ADMIN}/reports/users`,
        edit: (id: string) => `${ROOTS.SUPER_ADMIN}/reports/users/${id}/edit`,
      },
      bookings: {
        root: `${ROOTS.SUPER_ADMIN}/reports/bookings`,
      },
      incentives: { root: `${ROOTS.SUPER_ADMIN}/reports/incentives` },
    },
    leaderBoard: {
      root: `${ROOTS.SUPER_ADMIN}/leader-board`,
      leaderBoard: { root: `${ROOTS.SUPER_ADMIN}/leader-board` },
      rmSummary: { root: `${ROOTS.SUPER_ADMIN}/leader-board/rmSummary` },
    },
    uploads: {
      root: `${ROOTS.SUPER_ADMIN}/uploads`,
      bookingDateModification: { root: `${ROOTS.SUPER_ADMIN}/uploads/booking-date-modification` },
    },
    voucherEOI: { root: `${ROOTS.SUPER_ADMIN}/eoi-records` },
    voucherChannelPartners: { root: `${ROOTS.SUPER_ADMIN}/cp-list` },
    eoiManagerDashboard: {
      root: `${ROOTS.SUPER_ADMIN}/eoi-manager`,
      create: `${ROOTS.SUPER_ADMIN}/eoi-manager/create`,
      edit: (id: string) => `${ROOTS.SUPER_ADMIN}/eoi-manager/edit/${id}`,
    },
    eoiDashboard: { root: `${ROOTS.SUPER_ADMIN}/eoi-dashboard` },
    eoiLeaderboard: { root: `${ROOTS.SUPER_ADMIN}/eoi-leaderboard` },
    unitInventory: {
      root: `${ROOTS.SUPER_ADMIN}/inventory`,
    },
    bankDetails: {
      root: `${ROOTS.SUPER_ADMIN}/bank-details`,
    },
    batch: {
      root: `${ROOTS.SUPER_ADMIN}/batch/dashboard`,
      dashboard: `${ROOTS.SUPER_ADMIN}/batch/dashboard`,
      listing: `${ROOTS.SUPER_ADMIN}/batch/listing`,
      tracker: `${ROOTS.SUPER_ADMIN}/batch/tracker`,
    },
    sfdcLogs: {
      root: `${ROOTS.SUPER_ADMIN}/sfdc-logs`,
    },
  },
  financeAdmin: {
    root: `${ROOTS.FINANCE_ADMIN}/employee-list`,
    employeeList: {
      root: `${ROOTS.FINANCE_ADMIN}/employee-list`,
      edit: (id: string) => `${ROOTS.FINANCE_ADMIN}/employee-list/${id}/edit`,
    },
    salary: {
      root: `${ROOTS.FINANCE_ADMIN}/salary`,
    },
    logs: {
      root: `${ROOTS.FINANCE_ADMIN}/logs`,
    },
    voucherEOI: {
      root: `${ROOTS.FINANCE_ADMIN}/eoi-records`,
      financeRecordDetails: (id: string) =>
        `${ROOTS.FINANCE_ADMIN}/eoi-records/finance-record-details/${id}`,
    },
    uploadFinance: {
      root: `${ROOTS.FINANCE_ADMIN}/upload-finance-records`,
    },
    profile: { settings: `${ROOTS.FINANCE_ADMIN}/profile/settings` },
  },
  rm: {
    root: `${ROOTS.RM_PANEL}/bookings`,
    rmDashboard: {
      root: `${ROOTS.RM_PANEL}/bookings`,
    },
    dashboard: {
      root: `${ROOTS.RM_PANEL}/dashboard`,
    },
    incentive: {
      root: `${ROOTS.RM_PANEL}/incentive-dashboard`,
    },
    reports: {
      root: `${ROOTS.RM_PANEL}/reports`,
    },
    incentiveSlabs: {
      root: `${ROOTS.RM_PANEL}/incentive-slabs`,
    },
    voucherDashboard: {
      root: `${ROOTS.RM_PANEL}/voucherDashboard`,
    },
    voucherEOI: {
      root: `${ROOTS.RM_PANEL}/eoi-records`,
    },
    createVoucherEOI: {
      root: `${ROOTS.RM_PANEL}/eoi-records/create`,
    },

    voucherChannelPartners: {
      root: `${ROOTS.RM_PANEL}/cp-list`,
    },
    createChannelPartner: {
      root: `${ROOTS.RM_PANEL}/cp-list/create`,
    },
    groupList: {
      root: `${ROOTS.RM_PANEL}/group-list`,
      edit: (id: string) => `${ROOTS.RM_PANEL}/group-list/group-details/${id}`,
    },
    eoiDashboard: {
      root: `${ROOTS.RM_PANEL}/eoi-dashboard`,
    },
    eoiLeaderboard: {
      root: `${ROOTS.RM_PANEL}/eoi-leaderboard`,
    },
    unitInventory: {
      root: `${ROOTS.RM_PANEL}/inventory`,
    },
    bankDetails: {
      root: `${ROOTS.RM_PANEL}/bank-details`,
    },
  },
  crm: {
    root: `${ROOTS.CRM}/dashboard`,
    profile: { settings: `${ROOTS.CRM}/profile/settings` },
    dashboard: {
      root: `${ROOTS.CRM}/dashboard`,
    },
    eoiDashboard: {
      root: `${ROOTS.CRM}/eoi-dashboard`,
    },
    voucherEOI: {
      root: `${ROOTS.CRM}/eoi-records`,
    },
    batch: {
      root: `${ROOTS.CRM}/batch/listing`,
      listing: `${ROOTS.CRM}/batch/listing`,
      tracker: `${ROOTS.CRM}/batch/tracker`,
    },
    iomManagement: {
      root: `${ROOTS.CRM}/iom-management`,
    },
  },
  gre: {
    root: `${ROOTS.GRE}/dashboard`,
    dashboard: {
      root: `${ROOTS.GRE}/dashboard`,
      edit: (id: string) => `${ROOTS.GRE}/enquiry/${id}/edit`,
    },
    batch: {
      root: `${ROOTS.GRE}/batch/listing`,
      listing: `${ROOTS.GRE}/batch/listing`,
      records: `${ROOTS.GRE}/batch/records`,
    },
  },
  mis: {
    root: `${ROOTS.MIS}/eoi-dashboard`,
    voucherEOI: {
      root: `${ROOTS.MIS}/eoi-records`,
    },
    eoiManagerDashboard: {
      root: `${ROOTS.MIS}/eoi-manager`,
      create: `${ROOTS.MIS}/eoi-manager/create`,
      edit: (id: string) => `${ROOTS.MIS}/eoi-manager/edit/${id}`,
    },
    eoiDashboard: {
      root: `${ROOTS.MIS}/eoi-dashboard`,
    },
    unitInventory: {
      root: `${ROOTS.MIS}/inventory`,
    },
    batch: {
      root: `${ROOTS.MIS}/batch/listing`,
      listing: `${ROOTS.MIS}/batch/listing`,
      tracker: `${ROOTS.MIS}/batch/tracker`,
    },
  },
  salesTL: {
    root: `${ROOTS.SALES_TL}/bookings`,
    rmDashboard: {
      root: `${ROOTS.SALES_TL}/bookings`,
    },
    dashboard: {
      root: `${ROOTS.SALES_TL}/dashboard`,
    },
    voucherEOI: {
      root: `${ROOTS.SALES_TL}/eoi-records`,
    },
    voucherChannelPartners: {
      root: `${ROOTS.SALES_TL}/cp-list`,
    },
    bankDetails: {
      root: `${ROOTS.SALES_TL}/bank-details`,
    },
    eoiDashboard: {
      root: `${ROOTS.SALES_TL}/eoi-dashboard`,
    },
    unitInventory: {
      root: `${ROOTS.SALES_TL}/inventory`,
    },
  },
  salesRSH: {
    root: `${ROOTS.SALES_RSH}/bookings`,
    dashboard: {
      root: `${ROOTS.SALES_RSH}/dashboard`,
    },
    rmDashboard: {
      root: `${ROOTS.SALES_RSH}/bookings`,
    },
    voucherEOI: {
      root: `${ROOTS.SALES_RSH}/eoi-records`,
    },
    voucherChannelPartners: {
      root: `${ROOTS.SALES_RSH}/cp-list`,
    },
    bankDetails: {
      root: `${ROOTS.SALES_RSH}/bank-details`,
    },
    eoiDashboard: {
      root: `${ROOTS.SALES_RSH}/eoi-dashboard`,
    },
    batch: {
      root: `${ROOTS.SALES_RSH}/batch/listing`,
      listing: `${ROOTS.SALES_RSH}/batch/listing`,
      tracker: `${ROOTS.SALES_RSH}/batch/tracker`,
    },
  },
  salesBH: {
    root: `${ROOTS.SALES_BH}/eoi-records`,
    voucherEOI: {
      root: `${ROOTS.SALES_BH}/eoi-records`,
    },
  },
  /** BIS: admin-shaped paths under /bis (see bisNav / bis-routes / useAdminPanelPaths). */
  bis: {
    root: `${ROOTS.BIS}/user`,
    user: {
      root: `${ROOTS.BIS}/user`,
      edit: (id: string) => `${ROOTS.BIS}/user/${id}/edit`,
      create: `${ROOTS.BIS}/create`,
    },
    rmDashboard: {
      root: `${ROOTS.BIS}/bookings`,
    },
    reports: {
      root: `${ROOTS.BIS}/reports`,
      users: {
        root: `${ROOTS.BIS}/reports/users`,
        edit: (id: string) => `${ROOTS.BIS}/reports/users/${id}/edit`,
      },
      bookings: {
        root: `${ROOTS.BIS}/reports/bookings`,
      },
      incentives: { root: `${ROOTS.BIS}/reports/incentives` },
    },
    leaderBoard: {
      root: `${ROOTS.BIS}/leader-board`,
      leaderBoard: {
        root: `${ROOTS.BIS}/leader-board`,
      },
      rmSummary: {
        root: `${ROOTS.BIS}/leader-board/rmSummary`,
      },
    },
    incentiveStructure: {
      root: `${ROOTS.BIS}/incentive-structure`,
      edit: (id: string) => `${ROOTS.BIS}/incentive-structure/${id}/edit`,
      create: `${ROOTS.BIS}/incentive-structure/create`,
    },
    uploads: {
      root: `${ROOTS.BIS}/uploads`,
      bookingDateModification: {
        root: `${ROOTS.BIS}/uploads/booking-date-modification`,
      },
    },
    voucherEOI: {
      root: `${ROOTS.BIS}/eoi-records`,
      financeRecordDetails: (id: string) => `${ROOTS.BIS}/eoi-records/finance-record-details/${id}`,
    },
    eoiDashboard: {
      root: `${ROOTS.BIS}/eoi-dashboard`,
    },
    unitInventory: {
      root: `${ROOTS.BIS}/inventory`,
    },
    booster: {
      root: `${ROOTS.BIS}/booster`,
      edit: (id: string) => `${ROOTS.BIS}/booster/${id}/edit`,
      create: `${ROOTS.BIS}/booster/create`,
    },
    brand: {
      root: `${ROOTS.BIS}/brand`,
      edit: (id: string) => `${ROOTS.BIS}/brand/${id}/edit`,
    },
    phase: {
      root: `${ROOTS.BIS}/phase`,
      edit: (id: string) => `${ROOTS.BIS}/phase/${id}/edit`,
      create: `${ROOTS.BIS}/phase/create`,
    },
    project: {
      root: `${ROOTS.BIS}/project`,
      edit: (id: string) => `${ROOTS.BIS}/project/${id}/edit`,
      create: `${ROOTS.BIS}/project/create`,
    },
    batch: {
      root: `${ROOTS.BIS}/batch/listing`,
      listing: `${ROOTS.BIS}/batch/listing`,
      tracker: `${ROOTS.BIS}/batch/tracker`,
    },
  },
  projectHead: {
    root: `${ROOTS.PROJECT_HEAD}/eoi-dashboard`,
    voucherEOI: {
      root: `${ROOTS.PROJECT_HEAD}/eoi-records`,
    },
    dashboard: {
      root: `${ROOTS.PROJECT_HEAD}/dashboard`,
    },
    eoiDashboard: {
      root: `${ROOTS.PROJECT_HEAD}/eoi-dashboard`,
    },
    bankDetails: {
      root: `${ROOTS.PROJECT_HEAD}/bank-details`,
    },
    unitInventory: {
      root: `${ROOTS.PROJECT_HEAD}/inventory`,
    },
  },
  crmTl: {
    root: `${ROOTS.CRM_TL}/iom-management`,
    iomManagement: { root: `${ROOTS.CRM_TL}/iom-management` },
    profile: { settings: `${ROOTS.CRM_TL}/profile/settings` },
  },
  crmHead: {
    root: `${ROOTS.CRM_HEAD}/iom-management`,
    iomManagement: { root: `${ROOTS.CRM_HEAD}/iom-management` },
    profile: { settings: `${ROOTS.CRM_HEAD}/profile/settings` },
  },
  financeUser: {
    root: `${ROOTS.FINANCE_USER}/iom-management`,
    iomManagement: { root: `${ROOTS.FINANCE_USER}/iom-management` },
    profile: { settings: `${ROOTS.FINANCE_USER}/profile/settings` },
  },
  financeHead: {
    root: `${ROOTS.FINANCE_HEAD}/iom-management`,
    iomManagement: { root: `${ROOTS.FINANCE_HEAD}/iom-management` },
    profile: { settings: `${ROOTS.FINANCE_HEAD}/profile/settings` },
  },
  loyalty: {
    root: `${ROOTS.LOYALTY}/iom-management`,
    iomManagement: { root: `${ROOTS.LOYALTY}/iom-management` },
    profile: { settings: `${ROOTS.LOYALTY}/profile/settings` },
  },
};
