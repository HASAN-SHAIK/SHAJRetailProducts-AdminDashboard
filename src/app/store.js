import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import tenantsReducer from "../features/tenants/tenantsSlice";
import reportsReducer from "../features/reports/reportsSlice";
import dashboardReducer from "../features/dashboard/dashboardSlice";
import paymentsReducer from "../features/payments/paymentsSlice";
import logsReducer from "../features/logs/logsSlice";
import plansReducer from "../features/plans/plansSlice";
import supportCasesReducer from "../features/supportCases/supportCasesSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    tenants: tenantsReducer,
    reports: reportsReducer,
    dashboard: dashboardReducer,
    payments: paymentsReducer,
    logs: logsReducer,
    plans: plansReducer,
    supportCases: supportCasesReducer
  }
});

export default store;
