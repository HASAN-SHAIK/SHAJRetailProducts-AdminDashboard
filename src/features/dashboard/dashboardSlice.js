import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getSubscriptions } from "../../api/subscriptions";
import { getDashboardReports } from "../../api/reports";

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

const normalizeRevenueSeries = (series) => {
  if (!Array.isArray(series)) return [];
  return series
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const month = pickFirst(item.month, item.label, item.period, item.date, item.name);
      const revenue = pickFirst(
        item.revenue,
        item.value,
        item.amount,
        item.total,
        item.totalRevenue
      );
      if (month === undefined && revenue === undefined) return null;
      return {
        ...item,
        ...(month !== undefined ? { month } : {}),
        ...(revenue !== undefined ? { revenue } : {})
      };
    })
    .filter(Boolean);
};

const normalizeSummary = (summary, reports) => {
  const recentOrders =
    pickFirst(summary?.recentOrders, summary?.recent_orders, reports?.recentOrders, reports?.recent_orders) ||
    [];
  const systemLogs =
    pickFirst(summary?.systemLogs, summary?.system_logs, reports?.logs, reports?.system_logs) || [];
  const revenueByPlan =
    pickFirst(
      summary?.revenueByPlan,
      summary?.revenue_by_plan,
      reports?.revenueByPlan,
      reports?.revenue_by_plan
    ) || [];

  return {
    totalTenants: pickFirst(
      summary?.totalTenants,
      summary?.total_tenants,
      summary?.tenants?.total,
      reports?.totalTenants,
      reports?.total_tenants
    ),
    activeTenants: pickFirst(
      summary?.activeTenants,
      summary?.active_tenants,
      summary?.tenants?.active,
      reports?.activeTenants,
      reports?.active_tenants
    ),
    inactiveTenants: pickFirst(
      summary?.inactiveTenants,
      summary?.inactive_tenants,
      summary?.tenants?.inactive,
      reports?.inactiveTenants,
      reports?.inactive_tenants
    ),
    expiredTenants: pickFirst(
      summary?.expiredTenants,
      summary?.expired_tenants,
      summary?.tenants?.expired,
      reports?.expiredTenants,
      reports?.expired_tenants
    ),
    monthlyRevenue: pickFirst(
      summary?.monthlyRevenue,
      summary?.monthly_revenue,
      summary?.revenue?.monthly,
      reports?.monthlyRevenue,
      reports?.monthly_revenue
    ),
    paidSubscriptions: pickFirst(
      summary?.paidSubscriptions,
      summary?.paid_subscriptions,
      summary?.subscriptions?.paid,
      reports?.paidSubscriptions,
      reports?.paid_subscriptions
    ),
    newTenants: pickFirst(
      summary?.newTenants,
      summary?.new_tenants,
      summary?.tenants?.new,
      reports?.newTenants,
      reports?.new_tenants
    ),
    recentOrders,
    systemLogs,
    revenueByPlan
  };
};

const initialState = {
  summary: null,
  revenueSeries: [],
  subscriptions: null,
  status: "idle",
  error: null
};

export const fetchDashboard = createAsyncThunk("dashboard/fetch", async (_, thunkAPI) => {
  try {
    const [subscriptionsRes, reportsRes] = await Promise.all([
      getSubscriptions(),
      getDashboardReports()
    ]);
    const reportsPayload = reportsRes?.data?.data ?? reportsRes?.data;
    const summaryPayload = reportsPayload?.summary ?? reportsPayload?.overview ?? reportsPayload;
    const revenueSeriesPayload = pickFirst(
      reportsPayload?.revenueSeries,
      reportsPayload?.revenue_series,
      reportsPayload?.monthlyRevenue,
      reportsPayload?.monthly_revenue,
      reportsPayload?.revenue
    );
    return {
      subscriptions: subscriptionsRes.data,
      reports: reportsPayload,
      summary: normalizeSummary(summaryPayload, reportsPayload),
      revenueSeries: normalizeRevenueSeries(revenueSeriesPayload)
    };
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to fetch dashboard data");
  }
});

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.subscriptions = action.payload.subscriptions;
        state.summary = action.payload.summary || null;
        state.revenueSeries = action.payload.revenueSeries || [];
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch dashboard data";
      });
  }
});

export default dashboardSlice.reducer;
