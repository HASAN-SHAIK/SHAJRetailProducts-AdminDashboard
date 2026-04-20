import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Typography,
  TextField,
  Stack,
  Switch
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { getTenantBranches, createTenantBranch } from "../api/tenants";
import {
  fetchTenant,
  importTenantProducts,
  registerTenantUser,
  fetchTenantUsers,
  updateTenantUserRoleAction,
  upgradeTenantSubscription,
  renewTenantSubscription,
  saveTenant,
  saveTenantAddons
} from "../features/tenants/tenantsSlice";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorState from "../components/common/ErrorState";
import DataTable from "../components/common/DataTable";
import { formatDateTimeIST } from "../utils/date";

import FeatureFlags from "../components/common/FeatureFlags";
import { isFeatureEnabled } from "../utils/featureFlags";

const TenantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    selected,
    selectedStatus,
    selectedError,
    importStatus,
    importError,
    importResult,
    createUserStatus,
    createUserError,
    createdUser,
    users,
    usersStatus,
    usersError,
    updateUserRoleStatus,
    updateUserRoleError,
    upgradeStatus,
    upgradeError,
    renewStatus,
    renewError,
    addonSaveStatus,
    addonSaveError,
    saveStatus,
    saveError
  } = useAppSelector((state) => state.tenants);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetNames, setSheetNames] = useState("");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin"
  });
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    id: null,
    name: "",
    email: "",
    role: "staff"
  });
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({
    newPlan: "basic",
    payment_amount: "",
    payment_status: "paid",
    payment_method: "card"
  });
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({
    payment_amount: "",
    payment_status: "",
    payment_method: ""
  });
  const [branches, setBranches] = useState([]);
  const [branchesStatus, setBranchesStatus] = useState("idle");
  const [branchesError, setBranchesError] = useState("");
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: "",
    location: "",
    subscription_plan: "basic",
    max_devices_allowed: ""
  });
  const [branchCreateStatus, setBranchCreateStatus] = useState("idle");
  const [branchCreateError, setBranchCreateError] = useState("");
  const addonDefinitions = useMemo(
    () => [
      { key: "HSN_MODULE", label: "HSN Module" },
      { key: "CUSTOMER_MODULE", label: "Customer Module" },
      { key: "WHATSAPP_BILL", label: "WhatsApp Bill" },
      { key: "ORDER_NOTIFICATION", label: "Order Notification" },
      { key: "enable_barcode", label: "Barcode Scanner" },
      { key: "mobile_access", label: "Mobile Access" }
    ],
    []
  );
  const buildAddonState = useCallback(
    (source) =>
      addonDefinitions.reduce((acc, addon) => {
        const value = source?.[addon.key];
        acc[addon.key] = typeof value === "boolean" ? value : false;
        return acc;
      }, {}),
    [addonDefinitions]
  );
  const [addonInitial, setAddonInitial] = useState(() => buildAddonState(null));
  const [addonForm, setAddonForm] = useState(() => buildAddonState(null));
  const [isEditingGst, setIsEditingGst] = useState(false);
  const [gstValue, setGstValue] = useState("");

  useEffect(() => {
    dispatch(fetchTenant(id));
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(fetchTenantUsers(id));
  }, [dispatch, id]);

  const fetchBranches = useCallback(async () => {
    if (!id) return;
    setBranchesStatus("loading");
    setBranchesError("");
    try {
      const response = await getTenantBranches(id);
      const payload =
        response?.data?.branches ||
        response?.data?.data?.branches ||
        response?.data?.data ||
        response?.data?.branches ||
        [];
      setBranches(Array.isArray(payload) ? payload : []);
      setBranchesStatus("succeeded");
    } catch (error) {
      setBranches([]);
      setBranchesStatus("failed");
      setBranchesError(error?.response?.data?.message || "Failed to load branches");
    }
  }, [id]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    setGstValue(selected?.shop_details?.gst_number || selected?.gst_number || "");
  }, [selected?.gst_number, selected?.shop_details?.gst_number]);

  useEffect(() => {
    const source = selected?.addons || selected?.add_ons || selected?.addon || null;
    const nextState = buildAddonState(source);
    setAddonInitial(nextState);
    setAddonForm(nextState);
  }, [selected, buildAddonState]);

  useEffect(() => {
    if (!branchDialogOpen) return;
    const defaultPlan =
      selected?.subscription?.plan ||
      selected?.plan_type ||
      selected?.plan ||
      "basic";
    setBranchForm((prev) => ({
      ...prev,
      subscription_plan: prev.subscription_plan || defaultPlan || "basic"
    }));
  }, [branchDialogOpen, selected]);

  const metrics = useMemo(
    () => ({
      products: selected?.metrics?.products,
      orders7d: selected?.metrics?.orders7d,
      revenue7d: selected?.metrics?.revenue7d,
      lastLogin: selected?.metrics?.lastLogin
        ? formatDateTimeIST(selected.metrics.lastLogin)
        : ""
    }),
    [selected]
  );

  const handleImportProducts = () => {
    const names = sheetNames
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    dispatch(importTenantProducts({ id, payload: { sheetUrl, sheetNames: names } }));
  };

  const handleRegisterUser = async () => {
    const result = await dispatch(registerTenantUser({ id, payload: userForm }));
    if (registerTenantUser.rejected.match(result)) {
      return;
    }
    setUserDialogOpen(false);
    setUserForm({ name: "", email: "", password: "", role: "admin" });
  };

  const handleUpgradePlan = async () => {
    const payload = {
      ...upgradeForm,
      payment_amount:
        upgradeForm.payment_amount === "" ? undefined : Number(upgradeForm.payment_amount)
    };
    const result = await dispatch(upgradeTenantSubscription({ id, payload }));
    setUpgradeDialogOpen(false);
    if (!upgradeTenantSubscription.rejected.match(result)) {
      setUpgradeForm({
        newPlan: "basic",
        payment_amount: "",
        payment_status: "paid",
        payment_method: "card"
      });
    }
  };

  const handleRenewPlan = async () => {
    const payload = {
      payment_amount: renewForm.payment_amount === "" ? undefined : Number(renewForm.payment_amount),
      payment_status: renewForm.payment_status || undefined,
      payment_method: renewForm.payment_method || undefined
    };
    const result = await dispatch(renewTenantSubscription({ id, payload }));
    setRenewDialogOpen(false);
    if (!renewTenantSubscription.rejected.match(result)) {
      setRenewForm({
        payment_amount: "",
        payment_status: "",
        payment_method: ""
      });
    }
  };

  const handleCreateBranch = async () => {
    const name = String(branchForm.name || "").trim();
    if (!name) return;
    setBranchCreateStatus("loading");
    setBranchCreateError("");
    try {
      const response = await createTenantBranch(id, {
        name,
        location: branchForm.location || undefined,
        subscription_plan: branchForm.subscription_plan || undefined,
        max_devices_allowed:
          branchForm.max_devices_allowed === ""
            ? undefined
            : Number(branchForm.max_devices_allowed)
      });
      const branch =
        response?.data?.branch ||
        response?.data?.data?.branch ||
        response?.data?.data ||
        response?.data?.branch ||
        null;
      if (branch) {
        setBranches((prev) => [branch, ...prev]);
      } else {
        await fetchBranches();
      }
      setBranchDialogOpen(false);
      setBranchForm({
        name: "",
        location: "",
        subscription_plan: "basic",
        max_devices_allowed: ""
      });
    } catch (error) {
      setBranchCreateError(error?.response?.data?.message || "Failed to create branch");
    } finally {
      setBranchCreateStatus("idle");
    }
  };

  const handleOpenEditUser = (user) => {
    setEditUserForm({
      id: user?.id ?? null,
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "staff"
    });
    setEditUserDialogOpen(true);
  };

  const handleUpdateUserRole = async () => {
    if (!editUserForm.id) return;
    const result = await dispatch(
      updateTenantUserRoleAction({ userId: editUserForm.id, role: editUserForm.role, tenantId: id })
    );
    if (!updateTenantUserRoleAction.rejected.match(result)) {
      setEditUserDialogOpen(false);
    }
  };

  const handleGstSave = async () => {
    const shopDetails = selected?.shop_details || {};
    const result = await dispatch(
      saveTenant({
        id,
        payload: {
          gst_number: gstValue,
          shop_details: {
            ...shopDetails,
            gst_number: gstValue
          }
        }
      })
    );
    if (!saveTenant.rejected.match(result)) {
      setIsEditingGst(false);
    }
  };

  const handleAddonToggle = (key) => (event) => {
    const checked = event.target.checked;
    setAddonForm((prev) => ({ ...prev, [key]: checked }));
  };

  const isAddonDirty = useMemo(
    () => addonDefinitions.some((addon) => addonForm[addon.key] !== addonInitial[addon.key]),
    [addonDefinitions, addonForm, addonInitial]
  );

  const handleSaveAddons = async () => {
    const result = await dispatch(saveTenantAddons({ id, addons: addonForm }));
    if (!saveTenantAddons.rejected.match(result)) {
      setAddonInitial(addonForm);
    }
  };

  const userColumns = [
    { id: "name", label: "Name" },
    { id: "email", label: "Email" },
    { id: "role", label: "Role" },
    { id: "created_at", label: "Created" },
    {
      id: "actions",
      label: "Actions",
      render: (row) => (
        <Button size="small" variant="outlined" onClick={() => handleOpenEditUser(row)}>
          Edit Role
        </Button>
      )
    }
  ];

  if (selectedStatus === "loading")
    return (
      <Box sx={{ py: 6 }}>
        <Stack spacing={1} alignItems="center">
          <LoadingSpinner />
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            Tenant details are loading...
          </Typography>
        </Stack>
      </Box>
    );
  if (selectedStatus === "failed") return <ErrorState message={selectedError} />;
  if (!selected) return <ErrorState message="No tenant data available." />;

  const tenant = selected;
  const shopDetails = tenant?.shop_details || {};
  // Use plan_features from API response if available, fallback to resolvedFeatures
  const planFeatures = tenant?.plan_features || tenant?.resolvedFeatures || {};
  const maxUsers = Number(planFeatures?.max_users);
  const currentUsers = Array.isArray(users) ? users.length : 0;
  const isUserLimitReached =
    Number.isFinite(maxUsers) && maxUsers > 0 && currentUsers >= maxUsers;

  const subscriptionRows = tenant.subscriptionHistory || [];
  const paymentRows = tenant.paymentHistory || [];

  const subscriptionColumns = [
    { id: "id", label: "Subscription ID" },
    { id: "plan", label: "Plan" },
    { id: "start", label: "Start" },
    { id: "end", label: "End" }
  ];

  const paymentColumns = [
    { id: "id", label: "Payment ID" },
    { id: "amount", label: "Amount" },
    { id: "date", label: "Date" },
    { id: "status", label: "Status" }
  ];
  const branchPlanOptions = ["basic", "pro", "premium", "enterprise"];
  const branchColumns = [
    { id: "name", label: "Branch Name" },
    { id: "location", label: "Location" },
    {
      id: "subscription_plan",
      label: "Plan",
      render: (row) => (row.subscription_plan ? String(row.subscription_plan) : "-")
    },
    {
      id: "max_devices_allowed",
      label: "Device Limit",
      render: (row) =>
        row.max_devices_allowed === null || row.max_devices_allowed === undefined
          ? "Unlimited"
          : row.max_devices_allowed
    },
    {
      id: "created_at",
      label: "Created",
      render: (row) => (row.created_at ? formatDateTimeIST(row.created_at) : "-")
    }
  ];

  return (
    <Box>
      <Button variant="text" onClick={() => navigate("/admin/tenants")}>
        Back to Tenants
      </Button>
      <Typography variant="h4" sx={{ mb: 2, mt: 1 }}>
        Tenant Details
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Tenant Info
              </Typography>
              <Stack spacing={1}>
                <TextField label="Tenant ID" value={tenant.id || ""} InputProps={{ readOnly: true }} />
                <TextField label="Shop Name" value={tenant.shopName || ""} InputProps={{ readOnly: true }} />
                <TextField label="Owner" value={tenant.owner || ""} InputProps={{ readOnly: true }} />
                <TextField label="Email" value={tenant.email || ""} InputProps={{ readOnly: true }} />
                <TextField label="Phone" value={tenant.phone || ""} InputProps={{ readOnly: true }} />
                <Stack spacing={1}>
                  <TextField
                    label="GST Number"
                    value={gstValue}
                    onChange={(e) => setGstValue(e.target.value)}
                    InputProps={{ readOnly: !isEditingGst }}
                  />
                  <Stack direction="row" spacing={1}>
                    {!isEditingGst ? (
                      <Button size="small" variant="outlined" onClick={() => setIsEditingGst(true)}>
                        Add / Edit GST
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={handleGstSave}
                          disabled={saveStatus === "loading"}
                        >
                          Save GST
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setGstValue(shopDetails.gst_number || tenant.gst_number || "");
                            setIsEditingGst(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </Stack>
                  {saveStatus === "failed" && saveError && <ErrorState message={saveError} />}
                </Stack>
                <TextField
                  label="Address Line"
                  value={shopDetails.address_line || tenant.address_line || ""}
                  InputProps={{ readOnly: true }}
                />
                <TextField
                  label="City"
                  value={shopDetails.city || tenant.city || ""}
                  InputProps={{ readOnly: true }}
                />
                <TextField
                  label="State"
                  value={shopDetails.state || tenant.state || ""}
                  InputProps={{ readOnly: true }}
                />
                <TextField
                  label="Pincode"
                  value={shopDetails.pincode || tenant.pincode || ""}
                  InputProps={{ readOnly: true }}
                />
                <TextField label="Last Login" value={metrics.lastLogin || ""} InputProps={{ readOnly: true }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Subscription
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                Plan
              </Typography>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {tenant.subscription?.plan || ""}
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                Expiry
              </Typography>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {tenant.subscription?.expiry ? formatDateTimeIST(tenant.subscription.expiry) : ""}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => setRenewDialogOpen(true)}>
                  Renew Plan
                </Button>
                <Button variant="contained" onClick={() => setUpgradeDialogOpen(true)}>
                  Upgrade Plan
                </Button>
              </Stack>
              {upgradeStatus === "failed" && upgradeError && (
                <Box sx={{ mt: 2 }}>
                  <ErrorState message={upgradeError} />
                </Box>
              )}
              {renewStatus === "failed" && renewError && (
                <Box sx={{ mt: 2 }}>
                  <ErrorState message={renewError} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <FeatureFlags planFeatures={planFeatures} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Add-ons
              </Typography>
              <Stack spacing={1}>
                {addonDefinitions.map((addon) => (
                  <Stack
                    key={addon.key}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="body1">{addon.label}</Typography>
                    <Switch
                      checked={Boolean(addonForm[addon.key])}
                      onChange={handleAddonToggle(addon.key)}
                      disabled={addonSaveStatus === "loading"}
                    />
                  </Stack>
                ))}
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSaveAddons}
                  disabled={!isAddonDirty || addonSaveStatus === "loading"}
                >
                  {addonSaveStatus === "loading" ? "Saving..." : "Save Add-ons"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setAddonForm(addonInitial)}
                  disabled={!isAddonDirty || addonSaveStatus === "loading"}
                >
                  Reset
                </Button>
              </Stack>
              {addonSaveStatus === "failed" && addonSaveError && (
                <Box sx={{ mt: 2 }}>
                  <ErrorState message={addonSaveError} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Bulk Products Import
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Google Sheet URL"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/<ID>/edit"
                  fullWidth
                />
                <TextField
                  label="Sheet Names (comma separated)"
                  value={sheetNames}
                  onChange={(e) => setSheetNames(e.target.value)}
                  placeholder="Sheet1, Sheet2"
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={handleImportProducts}
                  disabled={!sheetUrl || importStatus === "loading"}
                >
                  {importStatus === "loading" ? "Importing..." : "Import Products"}
                </Button>
                {importStatus === "failed" && importError && (
                  <ErrorState message={importError} />
                )}
                {importStatus === "succeeded" && importResult && (
                  <Box>
                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                      Imported: {importResult.insertedCount || 0} | Skipped:{" "}
                      {importResult.skippedCount || 0} | Errors: {importResult.errorCount || 0}
                    </Typography>
                    {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {importResult.errors.map((err, index) => (
                          <Typography key={`${err.sheet}-${err.row}-${index}`} variant="body2">
                            {err.sheet} row {err.row}: {err.errors?.join(", ")}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Tenant Users
              </Typography>
              <Button
                variant="contained"
                onClick={() => setUserDialogOpen(true)}
                disabled={isUserLimitReached}
              >
                Register User
              </Button>
              {isUserLimitReached && (
                <Typography variant="body2" sx={{ color: "#dc2626", mt: 1 }}>
                  User limit reached ({currentUsers}/{maxUsers}). Upgrade the plan to add more users.
                </Typography>
              )}
              <Box sx={{ mt: 2 }}>
                {usersStatus === "loading" && <LoadingSpinner />}
                {usersStatus === "failed" && usersError && <ErrorState message={usersError} />}
                {usersStatus === "succeeded" && <DataTable columns={userColumns} rows={users} />}
              </Box>
              {createUserStatus === "failed" && createUserError && (
                <Box sx={{ mt: 2 }}>
                  <ErrorState message={createUserError} />
                </Box>
              )}
              {updateUserRoleStatus === "failed" && updateUserRoleError && (
                <Box sx={{ mt: 2 }}>
                  <ErrorState message={updateUserRoleError} />
                </Box>
              )}
              {createUserStatus === "succeeded" && createdUser && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ color: "#16a34a" }}>
                    User created: {createdUser.name} ({createdUser.email})
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Branches</Typography>
                <Button variant="contained" onClick={() => setBranchDialogOpen(true)}>
                  Add Branch
                </Button>
              </Stack>
              {branchesStatus === "loading" && <LoadingSpinner />}
              {branchesStatus === "failed" && branchesError && <ErrorState message={branchesError} />}
              {branchesStatus === "succeeded" && branches.length === 0 && (
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  No branches created yet.
                </Typography>
              )}
              {branchesStatus === "succeeded" && branches.length > 0 && (
                <DataTable columns={branchColumns} rows={branches} />
              )}
              {branchCreateError && (
                <Box sx={{ mt: 2 }}>
                  <ErrorState message={branchCreateError} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Register Tenant User</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Name"
              fullWidth
              value={userForm.name}
              onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              margin="dense"
              label="Email"
              fullWidth
              value={userForm.email}
              onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <TextField
              margin="dense"
              label="Password"
              type="password"
              fullWidth
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <TextField
              margin="dense"
              label="Role"
              select
              fullWidth
              value={userForm.role}
              onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleRegisterUser}
              disabled={createUserStatus === "loading"}
            >
              {createUserStatus === "loading" ? "Creating..." : "Create User"}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={branchDialogOpen}
          onClose={() => setBranchDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Create Branch</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Branch Name"
              fullWidth
              value={branchForm.name}
              onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              margin="dense"
              label="Location"
              fullWidth
              value={branchForm.location}
              onChange={(e) => setBranchForm((prev) => ({ ...prev, location: e.target.value }))}
            />
            <TextField
              margin="dense"
              label="Subscription Plan"
              select
              fullWidth
              value={branchForm.subscription_plan}
              onChange={(e) =>
                setBranchForm((prev) => ({ ...prev, subscription_plan: e.target.value }))
              }
            >
              {branchPlanOptions.map((plan) => (
                <MenuItem key={plan} value={plan}>
                  {plan}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              margin="dense"
              label="Max Devices Allowed (optional)"
              type="number"
              fullWidth
              value={branchForm.max_devices_allowed}
              onChange={(e) =>
                setBranchForm((prev) => ({ ...prev, max_devices_allowed: e.target.value }))
              }
              helperText="Leave empty to use plan default (enterprise can be unlimited)."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBranchDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateBranch}
              disabled={branchCreateStatus === "loading" || !branchForm.name.trim()}
            >
              {branchCreateStatus === "loading" ? "Creating..." : "Create Branch"}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={editUserDialogOpen}
          onClose={() => setEditUserDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Update User Role</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Name"
              fullWidth
              value={editUserForm.name}
              InputProps={{ readOnly: true }}
            />
            <TextField
              margin="dense"
              label="Email"
              fullWidth
              value={editUserForm.email}
              InputProps={{ readOnly: true }}
            />
            <TextField
              margin="dense"
              label="Role"
              select
              fullWidth
              value={editUserForm.role}
              onChange={(e) => setEditUserForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
            </TextField>
            {updateUserRoleStatus === "failed" && updateUserRoleError && (
              <Box sx={{ mt: 2 }}>
                <ErrorState message={updateUserRoleError} />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditUserDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleUpdateUserRole}
              disabled={updateUserRoleStatus === "loading"}
            >
              {updateUserRoleStatus === "loading" ? "Updating..." : "Update Role"}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={upgradeDialogOpen}
          onClose={() => setUpgradeDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Upgrade Plan</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="New Plan"
              select
              fullWidth
              value={upgradeForm.newPlan}
              onChange={(e) => setUpgradeForm((prev) => ({ ...prev, newPlan: e.target.value }))}
            >
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="pro">Pro</MenuItem>
              <MenuItem value="premium">Premium</MenuItem>
            </TextField>
            <TextField
              margin="dense"
              label="Payment Amount"
              type="number"
              fullWidth
              value={upgradeForm.payment_amount}
              onChange={(e) =>
                setUpgradeForm((prev) => ({ ...prev, payment_amount: e.target.value }))
              }
            />
            <TextField
              margin="dense"
              label="Payment Status"
              select
              fullWidth
              value={upgradeForm.payment_status}
              onChange={(e) =>
                setUpgradeForm((prev) => ({ ...prev, payment_status: e.target.value }))
              }
            >
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="unpaid">Unpaid</MenuItem>
            </TextField>
            <TextField
              margin="dense"
              label="Payment Method"
              select
              fullWidth
              value={upgradeForm.payment_method}
              onChange={(e) =>
                setUpgradeForm((prev) => ({ ...prev, payment_method: e.target.value }))
              }
            >
              <MenuItem value="card">Card</MenuItem>
              <MenuItem value="upi">UPI</MenuItem>
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUpgradeDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleUpgradePlan}
              disabled={upgradeStatus === "loading"}
            >
              {upgradeStatus === "loading" ? "Upgrading..." : "Upgrade"}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={renewDialogOpen}
          onClose={() => setRenewDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Renew Plan</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Payment Amount"
              type="number"
              fullWidth
              value={renewForm.payment_amount}
              onChange={(e) =>
                setRenewForm((prev) => ({ ...prev, payment_amount: e.target.value }))
              }
            />
            <TextField
              margin="dense"
              label="Payment Status"
              select
              fullWidth
              value={renewForm.payment_status}
              onChange={(e) =>
                setRenewForm((prev) => ({ ...prev, payment_status: e.target.value }))
              }
            >
              <MenuItem value="">Not set</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="unpaid">Unpaid</MenuItem>
            </TextField>
            <TextField
              margin="dense"
              label="Payment Method"
              select
              fullWidth
              value={renewForm.payment_method}
              onChange={(e) =>
                setRenewForm((prev) => ({ ...prev, payment_method: e.target.value }))
              }
            >
              <MenuItem value="">Not set</MenuItem>
              <MenuItem value="card">Card</MenuItem>
              <MenuItem value="upi">UPI</MenuItem>
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenewDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleRenewPlan}
              disabled={renewStatus === "loading"}
            >
              {renewStatus === "loading" ? "Renewing..." : "Renew"}
            </Button>
          </DialogActions>
        </Dialog>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                Products
              </Typography>
              <Typography variant="h5">{metrics.products}</Typography>
            </CardContent>
          </Card>
        </Grid>
        {isFeatureEnabled(planFeatures, "is_order_based", true) && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Orders (7 days)
                </Typography>
                <Typography variant="h5">{metrics.orders7d}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                Gross Revenue (7 days)
              </Typography>
              <Typography variant="h5">₹{metrics.revenue7d}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Subscription History
          </Typography>
          <DataTable columns={subscriptionColumns} rows={subscriptionRows} />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Payment History
          </Typography>
          <DataTable columns={paymentColumns} rows={paymentRows} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default TenantDetails;
