import { configureStore } from '@reduxjs/toolkit';

import authSlice from './slices/auth/auth-slice';
import cpSlice from './slices/rm-panel/cp-slice';
import UserSlice from './slices/admin/user-slice';
import visitSlice from './slices/gre/visit-slice';
import eoiSlice from './slices/rm-panel/eoi-slice';
import titleSlice from './slices/admin/title-slice';
import PhaseSlice from './slices/admin/phase-slice';
import BrandsSlice from './slices/admin/brands-slice';
import commonSlice from './slices/admin/common-slice';
import countrySlice from "./slices/country-list-slice"
import greDashboardSlice from './slices/gre/gre-slice';
import BoosterSlice from './slices/admin/booster-slice';
import ProjectSlice from './slices/admin/Project-slice';
import reportsSlice from './slices/admin/reports-slice';
import agreementsSlice from './slices/crm/agreement-slice';
import sfdcLogsSlice from './slices/admin/sfdc-logs-slice';
import IncentiveSlice from './slices/admin/incentive-slice';
import userBookingsSlice from './slices/admin/user-bookings';
import searchCpSlice from './slices/rm-panel/search-cp-slice';
import eoiManagerSlice from './slices/admin/eoi-manager-slice'
import DashboardSlice from './slices/rm-panel/dashboard-slice';
import multiUnitSlice from './slices/rm-panel/multi-unit-slice';
import ReportsUserSlice from './slices/admin/reports-user-slice';
import eoiFinanceSlice from './slices/rm-panel/eoi-finance-slice';
import NotificationSlice from './slices/admin/notification-slice';
import eoiDashboardSlice from './slices/admin/eoi-dashboard-slice';
import bankDetailsSlice from './slices/rm-panel/bank-details-slice';
import logHistorySlice from './slices/finance-admin/log-history-slice';
// eslint-disable-next-line import/no-named-as-default
import opportunitySlice from './slices/rm-panel/opportunityList-slice';
import unitInventorySlice from './slices/rm-panel/unit-inventory-slice';
import eoiLeaderboardSlice from './slices/rm-panel/eoi-leaderboard-slice';
import batchManagerSlice from './slices/common-module/batch-manager-slice';
import salaryUploadSlice from './slices/finance-admin/salary-upload-slice';
import employeeListSlice from './slices/finance-admin/employee-list-slice';
import iomManagementSlice from './slices/common-module/iom-management-slice';
import bookingDateUploadSlice from './slices/admin/booking-date-upload-slice';
import HighestRevenueSlice from './slices/leader-board/highest-revenue-slice';
import BoosterPrizeSlice from './slices/incentive-dashboard/booster-prize-slice';
import leaderBoardRMSummarySlice from './slices/admin/leader-board-rmSummary-slice';
import incentiveSlabsSlice from './slices/incentive-dashboard/incentive-slab-slice';
import cancellationsSlice from './slices/leader-board/leader-board-cancellations-slice';
import topPerformersSlice from './slices/leader-board/leader-board-top-performers-slice';
import incentiveDashboardSlice from './slices/incentive-dashboard/incentive-dashboard-slice';
import incentiveCardsSlice from './slices/incentive-dashboard/incentive-dashboard-card-slices';
import currentSalesChartSlice from './slices/incentive-dashboard/incentive-dashboard-charts-slices';

export const makeStore = () =>
  configureStore({
    reducer: {
      dashboard: DashboardSlice,
      auth: authSlice,
      opportunity: opportunitySlice,
      incentiveDashboard: incentiveDashboardSlice,
      userlist: UserSlice,
      project: ProjectSlice,
      projects: ProjectSlice,
      common: commonSlice,
      boosters: BoosterSlice,
      incentive: IncentiveSlice,
      reportsList: reportsSlice,
      brandsList: BrandsSlice,
      phasesList: PhaseSlice,
      notification: NotificationSlice,
      title: titleSlice,
      logHistory: logHistorySlice,
      semicircleChartData: currentSalesChartSlice,
      salaryUpload: salaryUploadSlice,
      employeeList: employeeListSlice,
      topPerformers: topPerformersSlice,
      cancellations: cancellationsSlice,
      highestRevenue: HighestRevenueSlice,
      boosterPrize: BoosterPrizeSlice,
      incentiveSlabs: incentiveSlabsSlice,
      cards: incentiveCardsSlice,
      reportsUser: ReportsUserSlice,
      bookings: userBookingsSlice,
      selectedUser: userBookingsSlice,
      bookingDateUpload: bookingDateUploadSlice,
      leaderBoardRMSummary: leaderBoardRMSummarySlice,
      expressonOfInterest: eoiSlice,
      eoiFinance: eoiFinanceSlice,
      channelpartner: cpSlice,
      unitInventory: unitInventorySlice,
      searchCp: searchCpSlice,
      visit: visitSlice,
      greDashboard: greDashboardSlice,
      agreements: agreementsSlice,
      countries: countrySlice,
      multiUnit: multiUnitSlice,
      eoiManager: eoiManagerSlice,
      eoiDashboard: eoiDashboardSlice,
      eoiLeaderboard: eoiLeaderboardSlice,
      bankDetails: bankDetailsSlice,
      sfdcLogsHistory: sfdcLogsSlice,
      batchManager: batchManagerSlice,
      iomManagement: iomManagementSlice,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // ❌ Disables serializable check
      }),
  });

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export const store = makeStore();
