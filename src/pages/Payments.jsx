import React, { useEffect, useMemo, useState, useContext } from "react";
import {
  Box,
  Button,
  Grid,
  MenuItem,
  TextField,
  Typography,
  Stack
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchPayments } from "../features/payments/paymentsSlice";
import DataTable from "../components/common/DataTable";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorState from "../components/common/ErrorState";
import ToastContext from "../components/common/ToastProvider";
import { formatDateTimeIST } from "../utils/date";

const Payments = () => {
  const dispatch = useAppDispatch();
  const { list, status, error } = useAppSelector((state) => state.payments);
  const { showToast } = useContext(ToastContext);
  const [filters, setFilters] = useState({ from: "", to: "", plan: "all" });

  useEffect(() => {
    const params = {
      from: filters.from || undefined,
      to: filters.to || undefined,
      plan: filters.plan !== "all" ? filters.plan : undefined
    };
    dispatch(fetchPayments(params));
  }, [dispatch, filters]);

  const rows = list.map((payment) => ({
    id: payment.id,
    tenant: payment.shop_name,
    plan: payment.plan_name,
    amount: Number(payment.amount),
    method: payment.payment_method,
    date: formatDateTimeIST(payment.paid_at),
    status: payment.status
  }));

  const columns = useMemo(
    () => [
      { id: "id", label: "Payment ID" },
      { id: "tenant", label: "Tenant" },
      { id: "plan", label: "Plan" },
      { id: "amount", label: "Amount" },
      { id: "method", label: "Method" },
      { id: "date", label: "Paid At" },
      { id: "status", label: "Status" }
    ],
    []
  );

  const handleExport = () => {
    const header = columns.map((col) => col.label).join(",");
    const body = rows
      .map((row) =>
        [row.id, row.tenant, row.plan, row.amount, row.method, row.date, row.status]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `subscription_payments_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported successfully");
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Payments</Typography>
        <Button variant="contained" onClick={handleExport}>
          Export CSV
        </Button>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={filters.from}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={filters.to}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            select
            fullWidth
            label="Plan"
            value={filters.plan}
            onChange={(e) => setFilters((prev) => ({ ...prev, plan: e.target.value }))}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="basic">Basic</MenuItem>
            <MenuItem value="pro">Pro</MenuItem>
            <MenuItem value="premium">Premium</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {status === "loading" ? (
        <Box sx={{ py: 6 }}>
          <LoadingSpinner />
        </Box>
      ) : status === "failed" ? (
        <ErrorState message={error} />
      ) : (
        <DataTable columns={columns} rows={rows} />
      )}
    </Box>
  );
};

export default Payments;
