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

const formatStatValue = (value) => (value === null || value === undefined ? "—" : value);

const formatCurrency = (value) => (value === null || value === undefined ? "—" : `₹${value}`);

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
    totalTenants: formatStatValue(summary?.totalTenants),
    activeTenants: formatStatValue(summary?.activeTenants),
    inactiveTenants: formatStatValue(summary?.inactiveTenants),
    expiredTenants: formatStatValue(summary?.expiredTenants),
    monthlyRevenue: summary?.monthlyRevenue ?? null,
    paidSubscriptions: formatStatValue(subscriptions?.paidCount ?? summary?.paidSubscriptions),
    newTenants: formatStatValue(summary?.newTenants)
  };

  const orders = summary?.recentOrders ?? [];
  const logs = summary?.systemLogs ?? [];
  const planRevenue = summary?.revenueByPlan ?? [];
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

  const revenueChartData = Array.isArray(revenueSeries) ? revenueSeries : [];

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
          <StatCard title="Total Monthly Revenue" value={formatCurrency(stats.monthlyRevenue)} />
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
                      {formatCurrency(plan.value)}
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
              {logs.length === 0 ? (
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  No system logs available.
                </Typography>
              ) : (
                logs.map((log) => (
                  <Box key={log.id} sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                      {log.id}
                    </Typography>
                    <Typography variant="body2">{log.message}</Typography>
                  </Box>
                ))
              )}
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
