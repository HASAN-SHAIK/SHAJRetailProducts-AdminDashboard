import React, { useEffect } from "react";
import { Box, Card, CardContent, Grid, Typography } from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from "recharts";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchReports } from "../features/reports/reportsSlice";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorState from "../components/common/ErrorState";
import { isFeatureEnabled } from "../utils/featureFlags";

const Reports = () => {
  const dispatch = useAppDispatch();
  const { data, status, error } = useAppSelector((state) => state.reports);
  const selectedTenant = useAppSelector((state) => state.tenants.selected);
  const resolvedFeatures = selectedTenant?.resolvedFeatures || {};
  const canViewReports = isFeatureEnabled(resolvedFeatures, "analytical_reports", true);

  useEffect(() => {
    dispatch(fetchReports());
  }, [dispatch]);

  if (!canViewReports) {
    return <ErrorState message="Premium analytics are not enabled for this plan." />;
  }
  if (status === "loading") return <LoadingSpinner />;
  if (status === "failed") return <ErrorState message={error} />;

  const revenueSeries = Array.isArray(data?.revenueSeries) ? data.revenueSeries : [];
  const topTenants = Array.isArray(data?.topTenants) ? data.topTenants : [];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Global Reports
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Revenue Over 6 Months
              </Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueSeries}>
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
        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Top 10 Tenants
              </Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTenants} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Subscription Payment History
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                No subscription payment history available.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
