import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getSupportCases,
  getSupportCaseById,
  updateSupportCaseStatus as updateStatusApi,
  updateSupportCasePriority as updatePriorityApi,
  assignSupportCase as assignApi,
  replyToSupportCase as replyApi
} from "../../api/supportCases";

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

const normalizeMessage = (message) => {
  if (!message || typeof message !== "object") return message;
  const author =
    message.author ||
    message.sender ||
    message.user ||
    message.admin ||
    message.created_by ||
    null;
  const authorName = pickFirst(
    message.author_name,
    author?.name,
    author?.email,
    message.sender_name,
    message.user_name,
    message.admin_name,
    message.sender_type && message.sender_id
      ? `${message.sender_type} #${message.sender_id}`
      : null,
    message.from
  );
  return {
    ...message,
    id: pickFirst(message.id, message._id),
    author: authorName || author,
    role: pickFirst(message.role, message.author_role, message.sender_role, message.sender_type),
    body: pickFirst(message.body, message.message, message.text, message.content),
    created_at: pickFirst(message.created_at, message.createdAt, message.timestamp)
  };
};

const normalizeCase = (supportCase) => {
  if (!supportCase || typeof supportCase !== "object") return supportCase;

  const tenant =
    supportCase.tenant ||
    supportCase.tenant_details ||
    supportCase.tenantDetail ||
    supportCase.customer ||
    null;

  const assigned =
    supportCase.assigned_to_name ||
    supportCase.assigned ||
    supportCase.assigned_admin ||
    supportCase.assigned_to ||
    supportCase.assignee ||
    null;

  const rawMessages =
    supportCase.messages ||
    supportCase.thread ||
    supportCase.replies ||
    supportCase.comments;
  const hasMessages =
    Array.isArray(rawMessages) ||
    Object.prototype.hasOwnProperty.call(supportCase, "messages") ||
    Object.prototype.hasOwnProperty.call(supportCase, "thread") ||
    Object.prototype.hasOwnProperty.call(supportCase, "replies") ||
    Object.prototype.hasOwnProperty.call(supportCase, "comments");

  return {
    ...supportCase,
    id: pickFirst(supportCase.id, supportCase.case_id, supportCase._id),
    tenant_name: pickFirst(
      supportCase.tenant_name,
      supportCase.tenantName,
      tenant?.shop_name,
      tenant?.shopName,
      tenant?.name
    ),
    title: pickFirst(supportCase.title, supportCase.subject, supportCase.issue),
    category: pickFirst(supportCase.category, supportCase.type),
    priority: pickFirst(supportCase.priority, supportCase.severity),
    status: pickFirst(supportCase.status, supportCase.state, supportCase.case_status),
    assigned_to: pickFirst(
      supportCase.assigned_to,
      supportCase.assignedTo,
      assigned?.name,
      assigned?.email
    ),
    created_at: pickFirst(supportCase.created_at, supportCase.createdAt),
    updated_at: pickFirst(supportCase.updated_at, supportCase.updatedAt),
    messages: hasMessages
      ? Array.isArray(rawMessages)
        ? rawMessages.map(normalizeMessage)
        : []
      : undefined
  };
};

const initialState = {
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
  filters: {
    status: "all",
    priority: "all",
    category: "all",
    tenant: ""
  },
  selected: null,
  status: "idle",
  error: null,
  detailStatus: "idle",
  detailError: null,
  actionStatus: "idle",
  actionError: null
};

const updateCaseInList = (list, supportCase) => {
  if (!supportCase || !Array.isArray(list)) return list;
  const idx = list.findIndex((item) => String(item.id) === String(supportCase.id));
  if (idx === -1) return list;
  const next = [...list];
  next[idx] = { ...next[idx], ...supportCase };
  return next;
};

const mergeCase = (current, incoming) => {
  if (!current) return incoming;
  if (!incoming) return current;
  const merged = { ...current };
  Object.entries(incoming).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  });
  if (incoming.messages === undefined) {
    merged.messages = current.messages;
  }
  return merged;
};

export const fetchSupportCases = createAsyncThunk(
  "supportCases/fetch",
  async (_, thunkAPI) => {
    const state = thunkAPI.getState().supportCases;
    const params = {
      page: state.page,
      pageSize: state.pageSize,
      status: state.filters.status !== "all" ? state.filters.status : undefined,
      priority: state.filters.priority !== "all" ? state.filters.priority : undefined,
      category: state.filters.category !== "all" ? state.filters.category : undefined,
      tenant: state.filters.tenant || undefined
    };
    try {
      const response = await getSupportCases(params);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to fetch support cases"
      );
    }
  }
);

export const fetchSupportCase = createAsyncThunk(
  "supportCases/fetchOne",
  async (id, thunkAPI) => {
    try {
      const response = await getSupportCaseById(id);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to fetch support case"
      );
    }
  }
);

export const updateSupportCaseStatus = createAsyncThunk(
  "supportCases/updateStatus",
  async ({ id, status }, thunkAPI) => {
    try {
      const response = await updateStatusApi(id, { status });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to update status"
      );
    }
  }
);

export const updateSupportCasePriority = createAsyncThunk(
  "supportCases/updatePriority",
  async ({ id, priority }, thunkAPI) => {
    try {
      const response = await updatePriorityApi(id, { priority });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to update priority"
      );
    }
  }
);

export const assignSupportCase = createAsyncThunk(
  "supportCases/assign",
  async ({ id, assigned_to }, thunkAPI) => {
    try {
      const response = await assignApi(id, { assigned_to });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to assign case"
      );
    }
  }
);

export const replySupportCase = createAsyncThunk(
  "supportCases/reply",
  async ({ id, message }, thunkAPI) => {
    try {
      const response = await replyApi(id, { message });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message || "Failed to send reply"
      );
    }
  }
);

const supportCasesSlice = createSlice({
  name: "supportCases",
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
    },
    setPage(state, action) {
      state.page = action.payload;
    },
    clearSelectedCase(state) {
      state.selected = null;
      state.detailStatus = "idle";
      state.detailError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSupportCases.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSupportCases.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload?.data?.page) {
          state.page = action.payload.data.page;
        }
        if (action.payload?.data?.pageSize) {
          state.pageSize = action.payload.data.pageSize;
        }
        const list =
          action.payload?.data?.cases ||
          action.payload?.cases ||
          action.payload?.data ||
          [];
        state.list = Array.isArray(list) ? list.map(normalizeCase) : [];
        state.total =
          action.payload?.data?.total ||
          action.payload?.data?.count ||
          action.payload?.total ||
          action.payload?.count ||
          state.list.length;
      })
      .addCase(fetchSupportCases.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch support cases";
      })
      .addCase(fetchSupportCase.pending, (state) => {
        state.detailStatus = "loading";
        state.detailError = null;
      })
      .addCase(fetchSupportCase.fulfilled, (state, action) => {
        state.detailStatus = "succeeded";
        const payload = action.payload?.data || action.payload || null;
        const supportCase = payload?.case || payload?.support_case || payload || null;
        const supportMessages = payload?.messages || payload?.case_messages || payload?.thread;
        const normalized = normalizeCase({
          ...supportCase,
          messages: supportMessages ?? supportCase?.messages
        });
        state.selected = normalized;
        state.list = updateCaseInList(state.list, normalized);
      })
      .addCase(fetchSupportCase.rejected, (state, action) => {
        state.detailStatus = "failed";
        state.detailError = action.payload || "Failed to fetch support case";
      })
      .addCase(updateSupportCaseStatus.pending, (state) => {
        state.actionStatus = "loading";
        state.actionError = null;
      })
      .addCase(updateSupportCaseStatus.fulfilled, (state, action) => {
        state.actionStatus = "succeeded";
        const payload = action.payload?.data || action.payload || null;
        const supportCase =
          payload?.case ||
          payload?.support_case ||
          payload ||
          { id: action.meta.arg.id, status: action.meta.arg.status };
        const normalized = normalizeCase(supportCase);
        state.selected = mergeCase(state.selected, normalized);
        state.list = updateCaseInList(state.list, normalized);
      })
      .addCase(updateSupportCaseStatus.rejected, (state, action) => {
        state.actionStatus = "failed";
        state.actionError = action.payload || "Failed to update status";
      })
      .addCase(updateSupportCasePriority.pending, (state) => {
        state.actionStatus = "loading";
        state.actionError = null;
      })
      .addCase(updateSupportCasePriority.fulfilled, (state, action) => {
        state.actionStatus = "succeeded";
        const payload = action.payload?.data || action.payload || null;
        const supportCase =
          payload?.case ||
          payload?.support_case ||
          payload ||
          { id: action.meta.arg.id, priority: action.meta.arg.priority };
        const normalized = normalizeCase(supportCase);
        state.selected = mergeCase(state.selected, normalized);
        state.list = updateCaseInList(state.list, normalized);
      })
      .addCase(updateSupportCasePriority.rejected, (state, action) => {
        state.actionStatus = "failed";
        state.actionError = action.payload || "Failed to update priority";
      })
      .addCase(assignSupportCase.pending, (state) => {
        state.actionStatus = "loading";
        state.actionError = null;
      })
      .addCase(assignSupportCase.fulfilled, (state, action) => {
        state.actionStatus = "succeeded";
        const payload = action.payload?.data || action.payload || null;
        const supportCase =
          payload?.case ||
          payload?.support_case ||
          payload ||
          { id: action.meta.arg.id, assigned_to: action.meta.arg.assigned_to };
        const normalized = normalizeCase(supportCase);
        state.selected = mergeCase(state.selected, normalized);
        state.list = updateCaseInList(state.list, normalized);
      })
      .addCase(assignSupportCase.rejected, (state, action) => {
        state.actionStatus = "failed";
        state.actionError = action.payload || "Failed to assign case";
      })
      .addCase(replySupportCase.pending, (state) => {
        state.actionStatus = "loading";
        state.actionError = null;
      })
      .addCase(replySupportCase.fulfilled, (state, action) => {
        state.actionStatus = "succeeded";
        const payload = action.payload?.data || action.payload || null;
        const supportCase =
          payload?.case ||
          payload?.support_case ||
          payload ||
          { id: action.meta.arg.id };
        const normalized = normalizeCase(supportCase);
        if (state.selected && String(state.selected.id) === String(action.meta.arg.id)) {
          if (normalized.messages?.length) {
            state.selected = { ...state.selected, ...normalized };
          } else {
            state.selected = {
              ...state.selected,
              messages: [
                ...(state.selected.messages || []),
                normalizeMessage({
                  body: action.meta.arg.message,
                  created_at: new Date().toISOString(),
                  role: "admin",
                  author_name: "Admin"
                })
              ]
            };
          }
        }
        state.list = updateCaseInList(state.list, normalized);
      })
      .addCase(replySupportCase.rejected, (state, action) => {
        state.actionStatus = "failed";
        state.actionError = action.payload || "Failed to send reply";
      });
  }
});

export const { setFilters, setPage, clearSelectedCase } = supportCasesSlice.actions;
export default supportCasesSlice.reducer;
