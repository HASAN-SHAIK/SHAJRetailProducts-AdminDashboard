import React, { useEffect, useMemo, useState, useContext, useRef } from "react";
import {
  Box,
  Button,
  Grid,
  TextField,
  MenuItem,
  Typography,
  Chip,
  Stack,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchTenants,
  setFilters,
  setPage,
  createNewTenant,
  saveTenant,
  saveTenantPlan
} from "../features/tenants/tenantsSlice";
import { getCreateTenantMeta } from "../api/tenants";
import DataTable from "../components/common/DataTable";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorState from "../components/common/ErrorState";
import ToastContext from "../components/common/ToastProvider";

const TenantsList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    list,
    total,
    page,
    pageSize,
    filters,
    status,
    error,
    saveStatus,
    saveError,
    createStatus,
    createError
  } =
    useAppSelector((state) => state.tenants);
  const { showToast } = useContext(ToastContext);
  const searchInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    shop_name: "",
    owner_name: "",
    email: "",
    domain_name: "",
    mobile: "",
    gst_number: "",
    address_line: "",
    city: "",
    state: "",
    pincode: "",
    plan_type: "basic",
    subscription_status: "paid",
    subscription_end_date: "",
    subscription_amount: ""
  });
  const [planDialog, setPlanDialog] = useState({ open: false, tenant: null, plan: "basic" });
  const [searchValue, setSearchValue] = useState(filters.query || "");
  const searchDebounceRef = useRef(null);
  const [meta, setMeta] = useState({ plans: [] });
  const [metaStatus, setMetaStatus] = useState("idle");
  const [metaError, setMetaError] = useState(null);

  useEffect(() => {
    dispatch(fetchTenants());
  }, [dispatch, page, filters]);

  useEffect(() => {
    setSearchValue(filters.query || "");
  }, [filters.query]);

  const handleFilterChange = (event) => {
    dispatch(setFilters({ [event.target.name]: event.target.value }));
  };

  const handleSearchChange = (event) => {
    const nextValue = event.target.value;
    setSearchValue(nextValue);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      dispatch(setFilters({ query: nextValue }));
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleCreateTenant = async () => {
    const payload = {
      ...form,
      domain: form.domain_name || undefined,
      subscription_amount:
        form.subscription_amount === "" ? undefined : Number(form.subscription_amount)
    };
    delete payload.domain_name;
    const result = await dispatch(createNewTenant(payload));
    if (createNewTenant.rejected.match(result)) {
      showToast(result.payload || "Failed to create tenant");
      return;
    }
    showToast("Tenant created");
    setOpen(false);
    dispatch(fetchTenants());
  };

  const handlePlanSave = async () => {
    if (!planDialog.tenant) return;
    const result = await dispatch(
      saveTenantPlan({
        id: planDialog.tenant.id,
        plan: planDialog.plan
      })
    );
    if (saveTenantPlan.rejected.match(result)) {
      showToast(result.payload || "Failed to update plan");
      return;
    }
    setPlanDialog({ open: false, tenant: null, plan: "basic" });
    showToast("Plan updated");
  };

  const handleStatusToggle = async (tenant) => {
    const nextStatus = tenant.status === "Active" ? "Inactive" : "Active";
    const result = await dispatch(saveTenant({ id: tenant.id, payload: { status: nextStatus } }));
    if (saveTenant.rejected.match(result)) {
      showToast(result.payload || "Failed to update status");
      return;
    }
    showToast(`Tenant marked ${nextStatus.toLowerCase()}`);
  };

  const columns = useMemo(
    () => [
      { id: "id", label: "ID" },
      { id: "shopName", label: "Shop Name" },
      { id: "owner", label: "Owner" },
      { id: "plan", label: "Plan" },
      { id: "subscriptionExpiry", label: "Subscription Expiry" },
      {
        id: "status",
        label: "Status",
        render: (row) => (
          <Chip
            label={row.status}
            size="small"
            color={row.status === "Active" ? "success" : "default"}
          />
        )
      },
      {
        id: "actions",
        label: "Actions",
        render: (row) => (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/tenants/${row.id}`);
              }}
            >
              View Details
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                setPlanDialog({
                  open: true,
                  tenant: row,
                  plan: row.plan?.toLowerCase?.() || "basic"
                });
              }}
            >
              Edit Plan
            </Button>
            <Button
              size="small"
              color="warning"
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusToggle(row);
              }}
            >
              {row.status === "Active" ? "Deactivate" : "Activate"}
            </Button>
          </Stack>
        )
      }
    ],
    [navigate]
  );

  const rows = list;

  const loadCreateMeta = async () => {
    setMetaStatus("loading");
    setMetaError(null);
    try {
      const response = await getCreateTenantMeta();
      const payload = response.data?.data || response.data || {};
      const nextPlans = payload.plans || payload.plan_types || payload.planTypes || [];
      setMeta({
        plans: Array.isArray(nextPlans) ? nextPlans : []
      });
      setMetaStatus("succeeded");
    } catch (error) {
      setMetaStatus("failed");
      setMetaError(error?.response?.data?.message || "Failed to load tenant metadata");
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Tenants</Typography>
        <Button
          variant="contained"
          onClick={() => {
            setOpen(true);
            loadCreateMeta();
          }}
        >
          Create New Tenant
        </Button>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Search tenants"
            value={searchValue}
            onChange={handleSearchChange}
            inputRef={searchInputRef}
          />
        </Grid>
        <Grid item xs={6} md={4}>
          <TextField
            select
            fullWidth
            label="Plan"
            name="plan"
            value={filters.plan}
            onChange={handleFilterChange}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="basic">Basic</MenuItem>
            <MenuItem value="pro">Pro</MenuItem>
            <MenuItem value="premium">Premium</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={6} md={4}>
          <TextField
            select
            fullWidth
            label="Status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
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
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={(row) => navigate(`/admin/tenants/${row.id}`)}
        />
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Pagination
          count={Math.max(1, Math.ceil(total / pageSize))}
          page={page}
          onChange={(_, value) => dispatch(setPage(value))}
          disabled={status === "loading"}
        />
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        onEnter={() => {
          if (metaStatus === "idle") {
            loadCreateMeta();
          }
        }}
      >
        <DialogTitle>Create Tenant</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Shop Name"
            fullWidth
            value={form.shop_name}
            onChange={(e) => setForm((prev) => ({ ...prev, shop_name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Owner"
            fullWidth
            value={form.owner_name}
            onChange={(e) => setForm((prev) => ({ ...prev, owner_name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Email"
            fullWidth
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Domain Name"
            fullWidth
            value={form.domain_name}
            onChange={(e) => setForm((prev) => ({ ...prev, domain_name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Mobile"
            fullWidth
            value={form.mobile}
            onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="GST Number"
            fullWidth
            value={form.gst_number}
            onChange={(e) => setForm((prev) => ({ ...prev, gst_number: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Address Line"
            fullWidth
            value={form.address_line}
            onChange={(e) => setForm((prev) => ({ ...prev, address_line: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="City"
            fullWidth
            value={form.city}
            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="State"
            fullWidth
            value={form.state}
            onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Pincode"
            fullWidth
            value={form.pincode}
            onChange={(e) => setForm((prev) => ({ ...prev, pincode: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Plan"
            select
            fullWidth
            value={form.plan_type}
            onChange={(e) => setForm((prev) => ({ ...prev, plan_type: e.target.value }))}
          >
            {metaStatus === "loading" && (
              <MenuItem value="" disabled>
                Loading...
              </MenuItem>
            )}
            {metaStatus === "failed" && metaError && (
              <MenuItem value="" disabled>
                {metaError}
              </MenuItem>
            )}
            {metaStatus !== "loading" && metaStatus !== "failed" && meta.plans.length === 0 && (
              <>
                <MenuItem value="basic">Basic</MenuItem>
                <MenuItem value="pro">Pro</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
              </>
            )}
            {meta.plans.map((plan) => {
              if (typeof plan === "string") {
                return (
                  <MenuItem key={plan} value={plan}>
                    {plan}
                  </MenuItem>
                );
              }
              const value =
                plan.id ||
                plan.code ||
                plan.slug ||
                plan.name ||
                plan.plan_type ||
                plan.type;
              const label = plan.name || plan.label || plan.title || value || "Plan";
              return (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              );
            })}
          </TextField>
          <TextField
            margin="dense"
            label="Subscription Status"
            select
            fullWidth
            value={form.subscription_status}
            onChange={(e) => setForm((prev) => ({ ...prev, subscription_status: e.target.value }))}
          >
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="unpaid">Unpaid</MenuItem>
          </TextField>
          <TextField
            margin="dense"
            label="Subscription End Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={form.subscription_end_date}
            onChange={(e) => setForm((prev) => ({ ...prev, subscription_end_date: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Subscription Amount"
            type="number"
            fullWidth
            value={form.subscription_amount}
            onChange={(e) => setForm((prev) => ({ ...prev, subscription_amount: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateTenant}
            disabled={createStatus === "loading"}
          >
            {createStatus === "loading" ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={planDialog.open} onClose={() => setPlanDialog({ open: false, tenant: null, plan: "basic" })}>
        <DialogTitle>Edit Tenant Plan</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Plan"
            select
            fullWidth
            value={planDialog.plan}
            onChange={(e) => setPlanDialog((prev) => ({ ...prev, plan: e.target.value }))}
          >
            <MenuItem value="basic">Basic</MenuItem>
            <MenuItem value="pro">Pro</MenuItem>
            <MenuItem value="premium">Premium</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanDialog({ open: false, tenant: null, plan: "basic" })}>Cancel</Button>
          <Button variant="contained" onClick={handlePlanSave} disabled={saveStatus === "loading"}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {saveStatus === "failed" && saveError && <ErrorState message={saveError} />}
    </Box>
  );
};

export default TenantsList;
