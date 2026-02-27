import React, { useEffect } from "react";
import { Box, Grid, Typography, Card, CardContent, Chip } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchDashboard } from "../features/dashboard/dashboardSlice";
import StatCard from "../components/common/StatCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorState from "../components/common/ErrorState";
import DataTable from "../components/common/DataTable";
import { isFeatureEnabled } from "../utils/featureFlags";

const fallbackRevenue = [
  { month: "Aug", revenue: 24000 },
  { month: "Sep", revenue: 28000 },
  { month: "Oct", revenue: 32000 },
  { month: "Nov", revenue: 36000 },
  { month: "Dec", revenue: 41000 },
  { month: "Jan", revenue: 46000 }
];

const fallbackOrders = [
  { id: "ORD-3902", tenant: "Urban Mart", amount: "₹420", status: "Paid" },
  { id: "ORD-3901", tenant: "FreshLane", amount: "₹110", status: "Pending" },
  { id: "ORD-3899", tenant: "Central Grocers", amount: "₹980", status: "Paid" }
];

const fallbackLogs = [
  { id: "LOG-9001", message: "Tenant FreshLane upgraded to Growth plan.", level: "info" },
  { id: "LOG-8998", message: "Failed webhook delivery for tenant Urban Mart.", level: "warning" },
  { id: "LOG-8991", message: "Admin password reset requested.", level: "info" }
];

const fallbackPlanRevenue = [
  { name: "Starter", value: 12000 },
  { name: "Growth", value: 21000 },
  { name: "Enterprise", value: 13000 }
];

const DashboardHome = () => {
  const dispatch = useAppDispatch();
  const { summary, revenueSeries, status, error, subscriptions } = useAppSelector(
    (state) => state.dashboard
  );
  const selectedTenant = useAppSelector((state) => state.tenants.selected);
  const resolvedFeatures = selectedTenant?.resolvedFeatures || {};
  const canViewDashboard = isFeatureEnabled(resolvedFeatures, "advanced_reports", true);

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  if (!canViewDashboard) {
    return <ErrorState message="Advanced dashboard is not enabled for this plan." />;
  }
  if (status === "loading") return <LoadingSpinner />;
  if (status === "failed") return <ErrorState message={error} />;

  const stats = {
    totalTenants: summary?.totalTenants ?? 128,
    activeTenants: summary?.activeTenants ?? 103,
    inactiveTenants: summary?.inactiveTenants ?? 25,
    expiredTenants: summary?.expiredTenants ?? 14,
    monthlyRevenue: summary?.monthlyRevenue ?? 46000,
    paidSubscriptions: subscriptions?.paidCount ?? summary?.paidSubscriptions ?? 112,
    newTenants: summary?.newTenants ?? 12
  };

  const orders = summary?.recentOrders || fallbackOrders;
  const logs = summary?.systemLogs || fallbackLogs;
  const planRevenue = summary?.revenueByPlan || fallbackPlanRevenue;
  const pieColors = ["#1f5eff", "#22c55e", "#f97316", "#0ea5e9"];

  const columns = [
    { id: "id", label: "Order ID" },
    { id: "tenant", label: "Tenant" },
    { id: "amount", label: "Amount" },
    {
      id: "status",
      label: "Status",
      render: (row) => (
        <Chip
          label={row.status}
          size="small"
          color={row.status === "Paid" ? "success" : "warning"}
        />
      )
    }
  ];

  const revenueChartData = Array.isArray(revenueSeries) ? revenueSeries : fallbackRevenue;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Platform Overview
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <StatCard title="Total Tenants" value={stats.totalTenants} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard title="Active Tenants" value={stats.activeTenants} accent="#22c55e" />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard title="Inactive Tenants" value={stats.inactiveTenants} accent="#f97316" />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard title="Expired Tenants" value={stats.expiredTenants} accent="#ef4444" />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard title="Total Monthly Revenue" value={`₹${stats.monthlyRevenue}`} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard title="Total Subscriptions Paid" value={stats.paidSubscriptions} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard title="New Tenants (This Month)" value={stats.newTenants} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Revenue Over Time
              </Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#1f5eff" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Revenue By Plan
              </Typography>
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planRevenue}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {planRevenue.map((entry, index) => (
                        <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                {planRevenue.map((plan, index) => (
                  <Box key={plan.name} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: pieColors[index % pieColors.length],
                        mr: 1
                      }}
                    />
                    <Typography variant="body2" sx={{ color: "#475569" }}>
                      {plan.name}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      ₹{plan.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                System Logs
              </Typography>
              {logs.map((log) => (
                <Box key={log.id} sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                    {log.id}
                  </Typography>
                  <Typography variant="body2">{log.message}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Recent Orders Across Tenants
          </Typography>
          <DataTable columns={columns} rows={orders} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardHome;
