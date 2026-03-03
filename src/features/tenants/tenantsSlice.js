import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getTenants,
  getTenantById,
  updateTenant,
  updateTenantPlan,
  createTenant,
  importTenantProductsFromSheet,
  createTenantUser,
  getTenantUsers,
  updateTenantUserRole,
  upgradeTenantPlan,
  renewTenantPlan,
  updateTenantAddons
} from "../../api/tenants";
import { resolveTenantFeatures } from "../../utils/featureFlags";

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

const normalizePlan = (plan) => {
  if (!plan) return plan;
  return String(plan).toLowerCase();
};

const normalizeTenant = (tenant) => {
  if (!tenant || typeof tenant !== "object") return tenant;

  const rawSubscription = tenant.subscription || tenant.subscription_details;
  const subscription =
    rawSubscription ||
    (tenant.plan ||
    tenant.plan_name ||
    tenant.plan_type ||
    tenant.expiry ||
    tenant.expiry_date ||
    tenant.end_date
      ? {
          plan: pickFirst(tenant.plan, tenant.plan_name, tenant.plan_type),
          expiry: pickFirst(
            tenant.expiry,
            tenant.expiry_date,
            tenant.end_date,
            tenant.ends_at
          )
        }
      : undefined);

  const subscriptionHistory = pickFirst(
    tenant.subscriptionHistory,
    tenant.subscription_history,
    tenant.subscriptions
  );

  const normalizedSubscriptionHistory = Array.isArray(subscriptionHistory)
    ? subscriptionHistory.map((item) => ({
        ...item,
        start: pickFirst(item.start, item.start_date, item.starts_at),
        end: pickFirst(item.end, item.end_date, item.ends_at),
        amount: pickFirst(item.amount, item.total, item.total_amount),
        status: pickFirst(item.status, item.payment_status),
        plan: pickFirst(item.plan, item.plan_name, item.plan_type)
      }))
    : subscriptionHistory;

  const paymentHistory = pickFirst(tenant.paymentHistory, tenant.payment_history, tenant.payments);
  const normalizedPaymentHistory = Array.isArray(paymentHistory)
    ? paymentHistory.map((item) => ({
        ...item,
        amount: pickFirst(item.amount, item.total, item.total_amount),
        status: pickFirst(item.status, item.payment_status),
        date: pickFirst(item.date, item.paid_at, item.created_at),
        plan: pickFirst(item.plan, item.plan_name, item.plan_type),
        payment_method: pickFirst(item.payment_method, item.method)
      }))
    : paymentHistory;

  return {
    ...tenant,
    shopName: pickFirst(tenant.shopName, tenant.shop_name, tenant.store_name, tenant.name),
    owner: pickFirst(tenant.owner, tenant.owner_name, tenant.contact_name),
    email: pickFirst(tenant.email, tenant.contact_email),
    phone: pickFirst(tenant.phone, tenant.mobile, tenant.contact_phone),
    gst_number: pickFirst(tenant.gst_number, tenant.gstNumber, tenant.gstin),
    address_line: pickFirst(tenant.address_line, tenant.addressLine, tenant.address),
    city: pickFirst(tenant.city, tenant.town),
    state: pickFirst(tenant.state, tenant.region),
    pincode: pickFirst(tenant.pincode, tenant.postal_code, tenant.zip),
    resolvedFeatures: resolveTenantFeatures(tenant),
    metrics: pickFirst(tenant.metrics, tenant.stats),
    plan: normalizePlan(pickFirst(tenant.plan, tenant.plan_type, tenant.plan_name)),
    status: pickFirst(
      tenant.status,
      typeof tenant.is_active === "boolean" ? (tenant.is_active ? "Active" : "Inactive") : undefined
    ),
    subscriptionExpiry: pickFirst(
      tenant.subscriptionExpiry,
      tenant.subscription_expiry,
      tenant.expiry,
      tenant.expiry_date,
      tenant.subscription_end_date,
    ),
    subscription,
    subscriptionHistory: normalizedSubscriptionHistory,
    paymentHistory: normalizedPaymentHistory
  };
};

const initialState = {
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
  filters: {
    plan: "all",
    status: "all",
    query: ""
  },
  selected: null,
  importResult: null,
  importStatus: "idle",
  importError: null,
  createUserStatus: "idle",
  createUserError: null,
  createdUser: null,
  createStatus: "idle",
  createError: null,
  users: [],
  usersStatus: "idle",
  usersError: null,
  upgradeStatus: "idle",
  upgradeError: null,
  upgradedSubscription: null,
  renewStatus: "idle",
  renewError: null,
  renewedSubscription: null,
  updateUserRoleStatus: "idle",
  updateUserRoleError: null,
  addonSaveStatus: "idle",
  addonSaveError: null,
  saveStatus: "idle",
  saveError: null,
  status: "idle",
  error: null
};

const updateTenantInList = (list, tenant) => {
  if (!tenant || !Array.isArray(list)) return list;
  const idx = list.findIndex((item) => String(item.id) === String(tenant.id));
  if (idx === -1) return list;
  const next = [...list];
  next[idx] = { ...next[idx], ...tenant };
  return next;
};

export const fetchTenants = createAsyncThunk("tenants/fetch", async (_, thunkAPI) => {
  const state = thunkAPI.getState().tenants;
  const params = {
    page: state.page,
    pageSize: state.pageSize,
    plan: state.filters.plan !== "all" ? state.filters.plan : undefined,
    status: state.filters.status !== "all" ? state.filters.status : undefined,
    query: state.filters.query || undefined
  };
  try {
    const response = await getTenants(params);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to fetch tenants");
  }
});

export const fetchTenant = createAsyncThunk("tenants/fetchOne", async (id, thunkAPI) => {
  try {
    const response = await getTenantById(id);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to fetch tenant");
  }
});

export const saveTenant = createAsyncThunk("tenants/save", async ({ id, payload }, thunkAPI) => {
  try {
    const normalizedPayload = { ...payload };
    if (normalizedPayload.plan_type && !normalizedPayload.plan) {
      normalizedPayload.plan = normalizedPayload.plan_type;
      delete normalizedPayload.plan_type;
    }
    const response = await updateTenant(id, normalizedPayload);
    const data = response.data;
    if (!data?.tenant && !data?.data?.tenant) {
      thunkAPI.dispatch(fetchTenant(id));
      thunkAPI.dispatch(fetchTenants());
    }
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to update tenant");
  }
});

export const saveTenantPlan = createAsyncThunk("tenants/savePlan", async ({ id, plan }, thunkAPI) => {
  try {
    const response = await updateTenantPlan(id, { plan });
    const data = response.data;
    if (!data?.tenant && !data?.data?.tenant) {
      thunkAPI.dispatch(fetchTenant(id));
      thunkAPI.dispatch(fetchTenants());
    }
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to update plan");
  }
});

export const createNewTenant = createAsyncThunk("tenants/create", async (payload, thunkAPI) => {
  try {
    const response = await createTenant(payload);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to create tenant");
  }
});

export const importTenantProducts = createAsyncThunk(
  "tenants/importProducts",
  async ({ id, payload }, thunkAPI) => {
    try {
      const response = await importTenantProductsFromSheet(id, payload);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to import products");
    }
  }
);

export const registerTenantUser = createAsyncThunk(
  "tenants/registerUser",
  async ({ id, payload }, thunkAPI) => {
    try {
      const response = await createTenantUser(id, payload);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to register tenant user"
      );
    }
  }
);

export const fetchTenantUsers = createAsyncThunk(
  "tenants/fetchUsers",
  async (id, thunkAPI) => {
    try {
      const response = await getTenantUsers(id);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to fetch tenant users"
      );
    }
  }
);

export const updateTenantUserRoleAction = createAsyncThunk(
  "tenants/updateUserRole",
  async ({ userId, role, tenantId }, thunkAPI) => {
    try {
      const response = await updateTenantUserRole(userId, { role, tenant_id: tenantId });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to update user role"
      );
    }
  }
);

export const upgradeTenantSubscription = createAsyncThunk(
  "tenants/upgradeSubscription",
  async ({ id, payload }, thunkAPI) => {
    try {
      const response = await upgradeTenantPlan(id, payload);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to upgrade subscription"
      );
    }
  }
);

export const renewTenantSubscription = createAsyncThunk(
  "tenants/renewPlan",
  async ({ id, payload }, thunkAPI) => {
    try {
      const response = await renewTenantPlan(id, payload);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to renew subscription"
      );
    }
  }
);

export const saveTenantAddons = createAsyncThunk(
  "tenants/saveAddons",
  async ({ id, addons }, thunkAPI) => {
    try {
      const response = await updateTenantAddons(id, { addons });
      const data = response.data;
      if (!data?.tenant && !data?.data?.tenant) {
        thunkAPI.dispatch(fetchTenant(id));
        thunkAPI.dispatch(fetchTenants());
      }
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to update add-ons");
    }
  }
);

const tenantsSlice = createSlice({
  name: "tenants",
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
    },
    setPage(state, action) {
      state.page = action.payload;
    },
    setSelectedTenant(state, action) {
      state.selected = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenants.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload?.data?.page) {
          state.page = action.payload.data.page;
        }
        if (action.payload?.data?.pageSize) {
          state.pageSize = action.payload.data.pageSize;
        }
        const list =
          action.payload?.data?.tenants ||
          action.payload?.tenants ||
          action.payload?.data ||
          [];
        state.list = Array.isArray(list) ? list.map(normalizeTenant) : [];
        state.total =
          action.payload?.data?.total ||
          action.payload?.data?.count ||
          action.payload?.total ||
          action.payload?.count ||
          state.list.length;
      })
      .addCase(fetchTenants.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch tenants";
      })
      .addCase(fetchTenant.fulfilled, (state, action) => {
        const payload = action.payload?.data || action.payload || null;
        const tenant = payload?.tenant || payload || null;
        const normalized = normalizeTenant(tenant);
        if (payload?.subscription) {
          normalized.subscription = {
            ...normalized.subscription,
            plan: normalizePlan(
              pickFirst(
                normalized.subscription?.plan,
                payload.subscription?.plan_name,
                tenant?.plan_type,
                tenant?.plan_name
              )
            ),
            expiry: pickFirst(payload.subscription?.end_date, normalized.subscription?.expiry),
            paymentStatus: payload.subscription?.payment_status,
            amount: payload.subscription?.amount
          };
        }
        state.selected = normalized;
      })
      .addCase(saveTenant.pending, (state) => {
        state.saveStatus = "loading";
        state.saveError = null;
      })
      .addCase(saveTenant.fulfilled, (state, action) => {
        state.saveStatus = "succeeded";
        const tenant = action.payload?.tenant || action.payload || state.selected;
        const normalized = normalizeTenant(tenant);
        state.selected = normalized;
        state.list = updateTenantInList(state.list, normalized);
      })
      .addCase(saveTenant.rejected, (state, action) => {
        state.saveStatus = "failed";
        state.saveError = action.payload || "Failed to update tenant";
      })
      .addCase(saveTenantPlan.pending, (state) => {
        state.saveStatus = "loading";
        state.saveError = null;
      })
      .addCase(saveTenantPlan.fulfilled, (state, action) => {
        state.saveStatus = "succeeded";
        const tenant = action.payload?.tenant || action.payload || state.selected;
        const normalized = normalizeTenant(tenant);
        state.selected = normalized;
        state.list = updateTenantInList(state.list, normalized);
      })
      .addCase(saveTenantPlan.rejected, (state, action) => {
        state.saveStatus = "failed";
        state.saveError = action.payload || "Failed to update plan";
      })
      .addCase(createNewTenant.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createNewTenant.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        const tenant = action.payload?.data?.tenant || action.payload?.tenant || action.payload;
        const normalized = normalizeTenant(tenant);
        if (normalized) {
          state.list = [normalized, ...state.list];
        }
      })
      .addCase(createNewTenant.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload || "Failed to create tenant";
      })
      .addCase(importTenantProducts.pending, (state) => {
        state.importStatus = "loading";
        state.importError = null;
        state.importResult = null;
      })
      .addCase(importTenantProducts.fulfilled, (state, action) => {
        state.importStatus = "succeeded";
        state.importResult = action.payload?.data || action.payload;
      })
      .addCase(importTenantProducts.rejected, (state, action) => {
        state.importStatus = "failed";
        state.importError = action.payload || "Failed to import products";
      })
      .addCase(registerTenantUser.pending, (state) => {
        state.createUserStatus = "loading";
        state.createUserError = null;
        state.createdUser = null;
      })
      .addCase(registerTenantUser.fulfilled, (state, action) => {
        state.createUserStatus = "succeeded";
        state.createdUser = action.payload?.data?.user || action.payload?.user || null;
        if (state.createdUser) {
          state.users = [state.createdUser, ...state.users];
        }
      })
      .addCase(registerTenantUser.rejected, (state, action) => {
        state.createUserStatus = "failed";
        state.createUserError = action.payload || "Failed to register tenant user";
      })
      .addCase(fetchTenantUsers.pending, (state) => {
        state.usersStatus = "loading";
        state.usersError = null;
      })
      .addCase(fetchTenantUsers.fulfilled, (state, action) => {
        state.usersStatus = "succeeded";
        state.users = action.payload?.data?.users || action.payload?.users || [];
      })
      .addCase(fetchTenantUsers.rejected, (state, action) => {
        state.usersStatus = "failed";
        state.usersError = action.payload || "Failed to fetch tenant users";
      })
      .addCase(updateTenantUserRoleAction.pending, (state) => {
        state.updateUserRoleStatus = "loading";
        state.updateUserRoleError = null;
      })
      .addCase(updateTenantUserRoleAction.fulfilled, (state, action) => {
        state.updateUserRoleStatus = "succeeded";
        const updatedUser = action.payload?.data?.user || action.payload?.user || null;
        if (updatedUser) {
          state.users = state.users.map((user) =>
            String(user.id) === String(updatedUser.id) ? { ...user, ...updatedUser } : user
          );
        }
      })
      .addCase(updateTenantUserRoleAction.rejected, (state, action) => {
        state.updateUserRoleStatus = "failed";
        state.updateUserRoleError = action.payload || "Failed to update user role";
      })
      .addCase(upgradeTenantSubscription.pending, (state) => {
        state.upgradeStatus = "loading";
        state.upgradeError = null;
        state.upgradedSubscription = null;
      })
      .addCase(upgradeTenantSubscription.fulfilled, (state, action) => {
        state.upgradeStatus = "succeeded";
        state.upgradedSubscription =
          action.payload?.data?.subscription || action.payload?.subscription || null;
        const tenant = action.payload?.data?.tenant || action.payload?.tenant || state.selected;
        if (tenant) {
          const normalized = normalizeTenant(tenant);
          state.selected = normalized;
          state.list = updateTenantInList(state.list, normalized);
        }
      })
      .addCase(upgradeTenantSubscription.rejected, (state, action) => {
        state.upgradeStatus = "failed";
        state.upgradeError = action.payload || "Failed to upgrade subscription";
      })
      .addCase(renewTenantSubscription.pending, (state) => {
        state.renewStatus = "loading";
        state.renewError = null;
        state.renewedSubscription = null;
      })
      .addCase(renewTenantSubscription.fulfilled, (state, action) => {
        state.renewStatus = "succeeded";
        state.renewedSubscription =
          action.payload?.data?.subscription || action.payload?.subscription || null;
        const tenant = action.payload?.data?.tenant || action.payload?.tenant || state.selected;
        if (tenant) {
          const normalized = normalizeTenant(tenant);
          state.selected = normalized;
          state.list = updateTenantInList(state.list, normalized);
        }
      })
      .addCase(renewTenantSubscription.rejected, (state, action) => {
        state.renewStatus = "failed";
        state.renewError = action.payload || "Failed to renew subscription";
      })
      .addCase(saveTenantAddons.pending, (state) => {
        state.addonSaveStatus = "loading";
        state.addonSaveError = null;
      })
      .addCase(saveTenantAddons.fulfilled, (state, action) => {
        state.addonSaveStatus = "succeeded";
        const tenant = action.payload?.data?.tenant || action.payload?.tenant || state.selected;
        if (tenant) {
          const normalized = normalizeTenant(tenant);
          state.selected = normalized;
          state.list = updateTenantInList(state.list, normalized);
        }
      })
      .addCase(saveTenantAddons.rejected, (state, action) => {
        state.addonSaveStatus = "failed";
        state.addonSaveError = action.payload || "Failed to update add-ons";
      });
  }
});

export const { setFilters, setPage, setSelectedTenant } = tenantsSlice.actions;
export default tenantsSlice.reducer;
