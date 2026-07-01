import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.site.basePath}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  user: icon('user-icon'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('dashboard-icon'),
  parameter: icon('ic-parameter'),
  project: icon('project-icon'),
  booster: icon('booster-icon'),
  incentiveStructure: icon('incentive-structure-icon'),
  brand: icon('brand-icon'),
  incentiveSlabs: icon('incentive-structure-icon'),
  rupees: icon('rupee-icon'),
  leadership: icon('trophy'),
  reports: icon('reports'),
  vector: icon('vector'),
  rm_bookings: icon('rm_bookings'),
  empployee: icon('employee'),
  salary: icon('salary'),
  logs: icon('logs'),
  phase: icon('ic-phase'),
  eoi: icon('EOI'),
  esign: icon('Signature'),
  eoiManager: icon('eoi-manager'),
  eoiDashboard: icon('eoi-dashboard'),
  batchManager: icon('batch-manager')};

// ----------------------------------------------------------------------

export const adminNav = [
  {
    items: [
      {
        title: 'Users',
        path: paths.admin.user.root,
        icon: ICONS.user,
        permission: { moduleCode: 'users' },
      },
      {
        title: 'Masters',
        path: paths.admin.brand.root,
        icon: ICONS.brand,
        permission: { moduleCode: 'masters' },
        children: [
          { title: 'Brands', path: paths.admin.brand.root, permission: { moduleCode: 'brands' } },
          { title: 'Projects', path: paths.admin.project.root, permission: { moduleCode: 'projects' } },
          { title: 'Project Phases', path: paths.admin.phase.root, permission: { moduleCode: 'phases' } },
        ],
      },
      {
        title: 'Incentives',
        path: paths.admin.reports.users.root,
        icon:  ICONS.dashboard,
        permission: { moduleCode: 'incentives' },
        children: [
          {
            title: 'Records',
            path: paths.admin.reports.users.root,
            permission: { moduleCode: 'incentives-records' },
            children: [
              {
                title: 'Users',
                path: paths.admin.reports.users.root,
                permission: { moduleCode: 'reports-users' },
              },
              {
                title: 'Bookings',
                path: paths.admin.reports.bookings.root,
                permission: { moduleCode: 'reports-bookings' },
              },
              {
                title: 'Incentive Reports',
                path: paths.admin.reports.incentives.root,
                permission: { moduleCode: 'reports-incentives' },
              },
            ],
          },
          {
            title: 'Leaderboard',
            path: paths.admin.leaderBoard.rmSummary.root,
            permission: { moduleCode: 'leaderboard' },
          },
          {
            title: 'Incentive Policy',
            path: paths.admin.incentiveStructure.root,
            permission: { moduleCode: 'incentive-policy' },
          },
          {
            title: 'Booster Policy',
            path: paths.admin.booster.root,
            permission: { moduleCode: 'booster-policy' },
          },
          {
            title: 'Modify Booking Dates​',
            path: paths.admin.uploads.bookingDateModification.root,
            permission: { moduleCode: 'booking-date-modification' },
          },
        ],
      },
      {
        title: 'EOI',
        path: paths.admin.eoiDashboard.root,
        icon: ICONS.eoi,
        permission: { moduleCode: 'eoi' },
        children: [
          {
            title: 'EOI Dashboard',
            path: paths.admin.eoiDashboard.root,
            permission: { moduleCode: 'eoi-dashboard' },
          },
          {
            title: 'EOI Leaderboard',
            path: paths.admin.eoiLeaderboard.root,
            permission: { moduleCode: 'eoi-leaderboard' },
          },
          {
            title: 'EOI Records',
            path: paths.admin.voucherEOI.root,
            permission: { moduleCode: 'eoi-records' },
          },
          {
            title: 'EOI Manager',
            path: paths.admin.eoiManagerDashboard.root,
            permission: { moduleCode: 'eoi-manager' },
          },
          {
            title: 'CP List',
            path: paths.admin.voucherChannelPartners.root,
            permission: { moduleCode: 'cp-list' },
          },
          {
            title: 'Inventory',
            path: paths.admin.unitInventory.root,
            permission: { moduleCode: 'unit-inventory' },
          },
          {
            title: 'Bank Details',
            path: paths.admin.bankDetails.root,
            permission: { moduleCode: 'bank-details' },
          },
        ],
      },
      {
        title: 'Batch',
        path: paths.admin.batch.listing,
        icon: ICONS.batchManager,
        permission: { moduleCode: 'batch' },
        children: [
          { title: 'Listing', path: paths.admin.batch.listing, permission: { moduleCode: 'batch-listing' } },
          { title: 'Tracker', path: paths.admin.batch.tracker, permission: { moduleCode: 'batch-tracker' } },
        ],
      },
    ],
  },
];

// Super Admin: same structure as adminNav but paths under /super-admin
export const superAdminNav = [
  {
    items: [
      {
        title: 'Users',
        path: paths.superAdmin.user.root,
        icon: ICONS.user,
        permission: { moduleCode: 'users' },
      },
      {
        title: 'Masters',
        path: paths.superAdmin.brand.root,
        icon: ICONS.brand,
        permission: { moduleCode: 'masters' },
        children: [
          { title: 'Brands', path: paths.superAdmin.brand.root, permission: { moduleCode: 'brands' } },
          { title: 'Projects', path: paths.superAdmin.project.root, permission: { moduleCode: 'projects' } },
          { title: 'Project Phases', path: paths.superAdmin.phase.root, permission: { moduleCode: 'phases' } },
        ],
      },
      {
        title: 'Incentives',
        path: paths.superAdmin.reports.users.root,
        icon:  ICONS.dashboard,
        permission: { moduleCode: 'incentives' },
        children: [
          {
            title: 'Records',
            path: paths.superAdmin.reports.users.root,
            permission: { moduleCode: 'incentives-records' },
            children: [
              {
                title: 'Users',
                path: paths.superAdmin.reports.users.root,
                permission: { moduleCode: 'reports-users' },
              },
              {
                title: 'Bookings',
                path: paths.superAdmin.reports.bookings.root,
                permission: { moduleCode: 'reports-bookings' },
              },
              {
                title: 'Incentive Reports',
                path: paths.superAdmin.reports.incentives.root,
                permission: { moduleCode: 'reports-incentives' },
              },
            ],
          },
          {
            title: 'Leaderboard',
            path: paths.superAdmin.leaderBoard.rmSummary.root,
            permission: { moduleCode: 'leaderboard' },
          },
          {
            title: 'Incentive Policy',
            path: paths.superAdmin.incentiveStructure.root,
            permission: { moduleCode: 'incentive-policy' },
          },
          {
            title: 'Booster Policy',
            path: paths.superAdmin.booster.root,
            permission: { moduleCode: 'booster-policy' },
          },
          {
             title: 'Modify Booking Dates​',
            path: paths.superAdmin.uploads.bookingDateModification.root,
            permission: { moduleCode: 'booking-date-modification' },
          },
        ],
      },
      {
        title: 'EOI',
        path: paths.superAdmin.eoiDashboard.root,
        icon: ICONS.eoi,
        permission: { moduleCode: 'eoi' },
        children: [
          {
            title: 'EOI Dashboard',
            path: paths.superAdmin.eoiDashboard.root,
            permission: { moduleCode: 'eoi-dashboard' },
          },
          {
            title: 'EOI Leaderboard',
            path: paths.superAdmin.eoiLeaderboard.root,
            permission: { moduleCode: 'eoi-leaderboard' },
          },
          {
            title: 'EOI Records',
            path: paths.superAdmin.voucherEOI.root,
            permission: { moduleCode: 'eoi-records' },
          },
          {
            title: 'EOI Manager',
            path: paths.superAdmin.eoiManagerDashboard.root,
            permission: { moduleCode: 'eoi-manager' },
          },
          {
            title: 'CP List',
            path: paths.superAdmin.voucherChannelPartners.root,
            permission: { moduleCode: 'cp-list' },
          },
          {
            title: 'Inventory',
            path: paths.superAdmin.unitInventory.root,
            permission: { moduleCode: 'unit-inventory' },
          },
          {
            title: 'Bank Details',
            path: paths.superAdmin.bankDetails.root,
            permission: { moduleCode: 'bank-details' },
          },
        ],
      },
     {
        title: 'Logs',
        path: paths.superAdmin.sfdcLogs.root,
        icon: ICONS.logs,
        permission: { moduleCode: 'sfdc-logs' },
      },
      {
        title: 'Batch',
        path: paths.superAdmin.batch.listing,
        icon: ICONS.batchManager,
        permission: { moduleCode: 'batch' },
        children: [
          { title: 'Listing', path: paths.superAdmin.batch.listing, permission: { moduleCode: 'batch-listing' } },
          { title: 'Tracker', path: paths.superAdmin.batch.tracker, permission: { moduleCode: 'batch-tracker' } },
        ],
      },
    ],
  },
];


export const financeAdminNav = [
  {
    items: [
      { title: 'Employee List', path: paths.financeAdmin.employeeList.root, icon: ICONS.empployee },
      {
        title: 'Uploads',
        path: paths.financeAdmin.salary.root,
        icon: ICONS.file,
        children: [
          // Adding Submenu (children)
          {
            title: 'Salary​',
            path: paths.financeAdmin.salary.root,
          },
        ],
      },
      { title: 'Logs History', path: paths.financeAdmin.logs.root, icon: ICONS.logs },
      {
        title: 'EOI',
        path: paths.financeAdmin.voucherEOI.root,
        icon: ICONS.eoi,
      },
    ],
  },
];

/** RM panel Bookings nav path — used for signature booking gate. */
export const RM_BOOKINGS_NAV_PATH = paths.rm.rmDashboard.root;

export const rmNav = [
  {
    items: [
      {
        title: 'Bookings',
        path: paths.rm.rmDashboard.root,
        icon: ICONS.rm_bookings,
      },
      { title: 'E-Signer', path: paths.rm.dashboard.root, icon: ICONS.esign },
      {
        title: 'Incentives',
        path: paths.rm.incentive.root,
        icon: ICONS.dashboard,
        children: [
          {
            title: 'Dashboard',
            path: paths.rm.incentive.root,
          },
          {
            title: 'Reports',
            path: paths.rm.reports.root,
          },
          {
            title: 'Incentive Slabs',
            path: paths.rm.incentiveSlabs.root,
          },
        ],
      },
      {
        title: 'EOI',
        path: paths.rm.voucherEOI.root,
        icon: ICONS.eoi,
        children: [
          // {
          //   title: 'EOI Dashboard',
          //   path: paths.rm.eoiDashboard.root,
          // },
          // {
          //   title: 'EOI Leaderboard',
          //   path: paths.rm.eoiLeaderboard.root,
          // },
          {
            title: 'EOI Records',
            path: paths.rm.voucherEOI.root,
          },
          {
            title: 'CP List',
            path: paths.rm.voucherChannelPartners.root,
          },
          {
            title: 'Inventory',
            path: paths.rm.unitInventory.root,
          },
          {
            title: 'Bank Details',
            path: paths.rm.bankDetails.root,
          },
        ],
      },
    ],
  },
];

export const crmNav = [

    {
    items: [
       { title: 'E-Signer', path: paths.crm.dashboard.root, icon: ICONS.esign },

      {
        title: 'EOI',
        path: paths.crm.eoiDashboard.root,
        icon: ICONS.eoi,
        children: [
          {
            title: 'EOI Dashboard',
            path: paths.crm.eoiDashboard.root,
          },
          {
            title: 'EOI Records',
            path: paths.crm.voucherEOI.root,
          }
   
        ],
      },
      {
        title: 'Batch',
        path: paths.crm.batch.listing,
        icon: ICONS.batchManager,
        children: [
          { title: 'Listing', path: paths.crm.batch.listing },
        ],
      },
      { 
        title: 'IOM Management', 
        path: paths.crm.iomManagement.root, 
        icon: ICONS.eoi,
      },
    ],
  },
];

/** Single-module nav for IOM-only roles (CRM TL/Head, Finance User/Head, Loyalty User). */
export const iomOnlyNav = (iomRoot: string) => [
  {
    items: [
      { title: 'IOM Management', path: iomRoot, icon: ICONS.eoi },
    ],
  },
];

export const greNav = [
  {
    items: [
      { title: 'Dashboard', path: paths.gre.dashboard.root, icon: ICONS.dashboard },
      {
        title: 'Batch',
        path: paths.gre.batch.records,
        icon: ICONS.batchManager,
        children: [
          { title: 'View Records', path: paths.gre.batch.records },
          { title: 'Listing', path: paths.gre.batch.listing },
        ],
      },
    ],
  },
];
export const misNav = [
  {
    items: [

      {
        title: 'EOI',
        path: paths.mis.eoiDashboard.root,
        icon: ICONS.eoi,
        children: [
          {
            title: 'EOI Dashboard',
            path: paths.mis.eoiDashboard.root,
          },
          {
            title: 'EOI Records',
            path: paths.mis.voucherEOI.root,
          },
          {
            title: 'EOI Manager',
            path: paths.mis.eoiManagerDashboard.root,
          },
          {
            title: 'Inventory',
            path: paths.mis.unitInventory.root,
          },
        ],
      },
      {
        title: 'Batch',
        path: paths.mis.batch.listing,
        icon: ICONS.batchManager,
        children: [
          { title: 'Listing', path: paths.mis.batch.listing },
        ],
      },
    ],
  },
];

export const salesTLNav = [
  {
    items: [
      {
        title: 'Bookings',
        path: paths.salesTL.rmDashboard.root,
        icon: ICONS.rm_bookings,
      },
      { title: 'E-Signer', path: paths.salesTL.dashboard.root, icon: ICONS.esign },
      {
        title: 'EOI',
        path: paths.salesTL.eoiDashboard.root,
        icon: ICONS.eoi,
        children: [
          { title: 'EOI Dashboard', path: paths.salesTL.eoiDashboard.root, },
          { title: 'EOI Records', path: paths.salesTL.voucherEOI.root },
          { title: 'CP List', path: paths.salesTL.voucherChannelPartners.root },
          { title: 'Inventory', path: paths.salesTL.unitInventory.root },
          { title: 'Bank Details', path: paths.salesTL.bankDetails.root, },
        ],
      },
    ],
  },
];
export const salesRSHNav = [
  {
    items: [
      {
        title: 'Bookings',
        path: paths.salesRSH.rmDashboard.root,
        icon: ICONS.rm_bookings,
      },
      { title: 'E-Signer', path: paths.salesRSH.dashboard.root, icon: ICONS.esign },
      {
        title: 'EOI',
        path: paths.salesRSH.eoiDashboard.root,
        icon: ICONS.eoi,
        children: [
          { title: 'EOI Dashboard', path: paths.salesRSH.eoiDashboard.root, },
          { title: 'EOI Records', path: paths.salesRSH.voucherEOI.root },
          { title: 'CP List', path: paths.salesRSH.voucherChannelPartners.root },
          { title: 'Bank Details', path: paths.salesRSH.bankDetails.root, },
        ],
      },
      {
        title: 'Batch',
        path: paths.salesRSH.batch.listing,
        icon: ICONS.batchManager,
        children: [
          { title: 'Listing', path: paths.salesRSH.batch.listing },
        ],
      },
    ],
  },
];
export const salesBHNav = [
  {
    items: [{ title: 'EOI', path: paths.salesBH.voucherEOI.root, icon: ICONS.eoi }],
  },
];

export const bisNav = [
  {
    items: [
      {
        title: 'Users',
        path: paths.bis.user.root,
        icon: ICONS.user,
      },
      {
        title: 'Bookings',
        path: paths.bis.rmDashboard.root,
        icon: ICONS.rm_bookings,
      },
      {
        title: 'Masters',
        path: paths.bis.brand.root,
        icon: ICONS.brand,
        children: [
          { title: 'Brands', path: paths.bis.brand.root },
          { title: 'Projects', path: paths.bis.project.root },
          { title: 'Project Phases', path: paths.bis.phase.root },
        ],
      },
      {
        title: 'Incentives',
        path: paths.bis.reports.users.root,
        icon: ICONS.dashboard,
        children: [
          {
            title: 'Records',
            path: paths.bis.reports.users.root,
            children: [
              {
                title: 'Users',
                path: paths.bis.reports.users.root,
              },
              {
                title: 'Bookings',
                path: paths.bis.reports.bookings.root,
              },
              {
                title: 'Incentive Reports',
                path: paths.bis.reports.incentives.root,
              },
            ],
          },
          {
            title: 'Leaderboard',
            path: paths.bis.leaderBoard.rmSummary.root,
          },
          {
            title: 'Incentive Policy',
            path: paths.bis.incentiveStructure.root,
          },
          {
            title: 'Booster Policy',
            path: paths.bis.booster.root,
          },
          {
            title: 'Modify Booking Dates',
            path: paths.bis.uploads.bookingDateModification.root,
          },
        ],
      },
      {
        title: 'EOI',
        path: paths.bis.eoiDashboard.root,
        icon: ICONS.eoi,
        children: [
          { title: 'EOI Dashboard', path: paths.bis.eoiDashboard.root },
          { title: 'EOI Records', path: paths.bis.voucherEOI.root },
          { title: 'Inventory', path: paths.bis.unitInventory.root },
        ],
      },
      {
        title: 'Batch',
        path: paths.bis.batch.listing,
        icon: ICONS.batchManager,
        children: [
          { title: 'Listing', path: paths.bis.batch.listing },
        ],
      },
    ],
  },
];

export const projectHeadNav = [
  {
    items: [
      { title: 'E-Signer', path: paths.projectHead.dashboard.root, icon: ICONS.esign },
      {
        title: 'EOI',
        path: paths.projectHead.eoiDashboard.root,
        icon: ICONS.eoi,
        children: [
          {
            title: 'EOI Dashboard',
            path: paths.projectHead.eoiDashboard.root,
          },
          {
            title: 'EOI Records',
            path: paths.projectHead.voucherEOI.root,
          },
          {
            title: 'Inventory',
            path: paths.projectHead.unitInventory.root,
          },
          { title: 'Bank Details', path: paths.projectHead.bankDetails.root, },
        ],
      }
    ],
  },
];
