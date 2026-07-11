// ==========================================
// Barrel — re-exports all types and assembles dashboardService object.
// All consumers that import from '@/services/dashboardService' continue
// to work without any changes: types, interfaces, and dashboardService
// are all still available from this path.
// ==========================================

export * from './dashboard/types';

import * as overview     from './dashboard/overviewService';
import * as advisor      from './dashboard/advisorService';
import * as daily        from './dashboard/dailyService';
import * as crossing     from './dashboard/crossingService';
import * as transaction  from './dashboard/transactionService';
import * as analytics    from './dashboard/analyticsService';
import * as footfall     from './dashboard/footfallService';
import * as crmDash      from './dashboard/crmDashService';
import * as product      from './dashboard/productService';

export const dashboardService = {
  // Overview
  getMonthlyOverview:          overview.getMonthlyOverview,

  // Advisor
  getAdvisorPerformance:       advisor.getAdvisorPerformance,
  getAnnualAdvisorPerformance: advisor.getAnnualAdvisorPerformance,
  getAdvisorSetup:             advisor.getAdvisorSetup,
  updateAdvisorHomeBase:       advisor.updateAdvisorHomeBase,
  saveRotation:                advisor.saveRotation,
  deleteRotation:              advisor.deleteRotation,
  saveAdvisorTarget:           advisor.saveAdvisorTarget,
  saveStoreTarget:             advisor.saveStoreTarget,

  // Daily
  getDailyReport:              daily.getDailyReport,
  getDailyBreakdown:           daily.getDailyBreakdown,

  // Crossing
  getCrossingSalesData:        crossing.getCrossingSalesData,

  // Transactions
  getTransactions:             transaction.getTransactions,
  updateTransaction:           transaction.updateTransaction,
  deleteTransaction:           transaction.deleteTransaction,

  // Analytics
  getQuarterlyBudget:          analytics.getQuarterlyBudget,
  getAnnualNetSales:           analytics.getAnnualNetSales,
  getQuarterlyStandard:        analytics.getQuarterlyStandard,
  getForecastingData:          analytics.getForecastingData,
  getSimulatorBaseline:        analytics.getSimulatorBaseline,
  getCategorySalesTrend:       analytics.getCategorySalesTrend,
  getStorePerformance:         analytics.getStorePerformance,

  // Footfall
  getFootfallStore:            footfall.getFootfallStore,
  getStockStore:               footfall.getStockStore,
  getFootfallCrm:              footfall.getFootfallCrm,
  saveFootfallStore:           footfall.saveFootfallStore,
  saveFootfallCrm:             footfall.saveFootfallCrm,

  // CRM Dashboard
  getCrmProfiling:             crmDash.getCrmProfiling,
  getEventSellingPlan:         crmDash.getEventSellingPlan,
  getClientelingData:          crmDash.getClientelingData,

  // Product
  getProductRank:              product.getProductRank,
  getHeatmapData:              product.getHeatmapData,
};
