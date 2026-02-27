import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  assignSupportCase,
  fetchSupportCases,
  replySupportCase,
  setFilters,
  setPage,
  updateSupportCasePriority,
  updateSupportCaseStatus
} from "../features/supportCases/supportCasesSlice";
import DataTable from "../components/common/DataTable";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorState from "../components/common/ErrorState";
import ToastContext from "../components/common/ToastProvider";
import { formatDateTimeIST } from "../utils/date";
import RefreshIcon from "@mui/icons-material/Refresh";

const statusOptions = ["open", "in_progress", "resolved", "closed"];
const priorityOptions = ["low", "medium", "high", "urgent"];

const getStatusChipColor = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "open") return "info";
  if (value === "in_progress") return "warning";
  if (value === "resolved") return "success";
  if (value === "closed") return "default";
  return "default";
};

const getPriorityChipColor = (priority) => {
  const value = String(priority || "").toLowerCase();
  if (value === "low") return "default";
  if (value === "medium") return "info";
  if (value === "high") return "warning";
  if (value === "urgent") return "error";
  return "default";
};

const SupportCases = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useContext(ToastContext);
  const { list, total, page, pageSize, filters, status, error, actionStatus, actionError } =
    useAppSelector((state) => state.supportCases);

  const [statusDialog, setStatusDialog] = useState({ open: false, caseItem: null, status: "open" });
  const [priorityDialog, setPriorityDialog] = useState({
    open: false,
    caseItem: null,
    priority: "low"
  });
  const [assignDialog, setAssignDialog] = useState({ open: false, caseItem: null, assigned_to: "" });
  const [replyDialog, setReplyDialog] = useState({ open: false, caseItem: null, message: "" });

  useEffect(() => {
    dispatch(fetchSupportCases());
  }, [dispatch, page, filters]);

  useEffect(() => {
    if (actionStatus === "failed" && actionError) {
      showToast(actionError, "error");
    }
  }, [actionStatus, actionError, showToast]);

  const handleFilterChange = (event) => {
    dispatch(setFilters({ [event.target.name]: event.target.value }));
  };

  const categoryOptions = useMemo(() => {
    const values = Array.from(new Set(list.map((item) => item.category).filter(Boolean)));
    return values;
  }, [list]);

  const columns = useMemo(
    () => [
      { id: "id", label: "ID" },
      { id: "tenant_name", label: "Tenant" },
      { id: "title", label: "Title" },
      { id: "category", label: "Category" },
      {
        id: "priority",
        label: "Priority",
        render: (row) => (
          <Chip
            label={row.priority || "-"}
            size="small"
            color={getPriorityChipColor(row.priority)}
          />
        )
      },
      {
        id: "status",
        label: "Status",
        render: (row) => (
          <Chip label={row.status || "-"} size="small" color={getStatusChipColor(row.status)} />
        )
      },
      { id: "assigned_to", label: "Assigned To" },
      {
        id: "created_at",
        label: "Created",
        render: (row) => (row.created_at ? formatDateTimeIST(row.created_at) : "-")
      },
      {
        id: "updated_at",
        label: "Updated",
        render: (row) => (row.updated_at ? formatDateTimeIST(row.updated_at) : "-")
      },
      {
        id: "actions",
        label: "Actions",
        render: (row) => (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              sx={{ minHeight: 30, py: 0.5 }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/support-cases/${row.id}`);
              }}
            >
              View
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{ minHeight: 30, py: 0.5 }}
              onClick={(e) => {
                e.stopPropagation();
                setStatusDialog({
                  open: true,
                  caseItem: row,
                  status: row.status || "open"
                });
              }}
            >
              Status
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{ minHeight: 30, py: 0.5 }}
              onClick={(e) => {
                e.stopPropagation();
                setPriorityDialog({
                  open: true,
                  caseItem: row,
                  priority: row.priority || "low"
                });
              }}
            >
              Priority
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{ minHeight: 30, py: 0.5 }}
              onClick={(e) => {
                e.stopPropagation();
                setAssignDialog({
                  open: true,
                  caseItem: row,
                  assigned_to: row.assigned_to || ""
                });
              }}
            >
              Assign
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{ minHeight: 30, py: 0.5 }}
              onClick={(e) => {
                e.stopPropagation();
                setReplyDialog({ open: true, caseItem: row, message: "" });
              }}
            >
              Reply
            </Button>
          </Stack>
        )
      }
    ],
    [navigate]
  );

  const handleStatusSave = async () => {
    if (!statusDialog.caseItem) return;
    const result = await dispatch(
      updateSupportCaseStatus({ id: statusDialog.caseItem.id, status: statusDialog.status })
    );
    if (!updateSupportCaseStatus.rejected.match(result)) {
      showToast("Status updated");
      setStatusDialog({ open: false, caseItem: null, status: "open" });
    }
  };

  const handlePrioritySave = async () => {
    if (!priorityDialog.caseItem) return;
    const result = await dispatch(
      updateSupportCasePriority({
        id: priorityDialog.caseItem.id,
        priority: priorityDialog.priority
      })
    );
    if (!updateSupportCasePriority.rejected.match(result)) {
      showToast("Priority updated");
      setPriorityDialog({ open: false, caseItem: null, priority: "low" });
    }
  };

  const handleAssignSave = async () => {
    if (!assignDialog.caseItem) return;
    const result = await dispatch(
      assignSupportCase({
        id: assignDialog.caseItem.id,
        assigned_to: assignDialog.assigned_to
      })
    );
    if (!assignSupportCase.rejected.match(result)) {
      showToast("Case assigned");
      setAssignDialog({ open: false, caseItem: null, assigned_to: "" });
    }
  };

  const handleReplySend = async () => {
    if (!replyDialog.caseItem || !replyDialog.message.trim()) return;
    const result = await dispatch(
      replySupportCase({ id: replyDialog.caseItem.id, message: replyDialog.message.trim() })
    );
    if (!replySupportCase.rejected.match(result)) {
      showToast("Reply sent");
      setReplyDialog({ open: false, caseItem: null, message: "" });
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Support Cases</Typography>
        <Tooltip title="Refresh">
          <IconButton
            color="primary"
            onClick={() => dispatch(fetchSupportCases())}
            aria-label="Refresh support cases"
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <TextField
            select
            fullWidth
            label="Status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <MenuItem value="all">All</MenuItem>
            {statusOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            fullWidth
            label="Priority"
            name="priority"
            value={filters.priority}
            onChange={handleFilterChange}
          >
            <MenuItem value="all">All</MenuItem>
            {priorityOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            fullWidth
            label="Category"
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
          >
            <MenuItem value="all">All</MenuItem>
            {categoryOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Tenant"
            name="tenant"
            value={filters.tenant}
            onChange={handleFilterChange}
          />
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
          rows={list}
          onRowClick={(row) => navigate(`/admin/support-cases/${row.id}`)}
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
        open={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, caseItem: null, status: "open" })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Change Status</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            select
            fullWidth
            label="Status"
            value={statusDialog.status}
            onChange={(e) => setStatusDialog((prev) => ({ ...prev, status: e.target.value }))}
          >
            {statusOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog({ open: false, caseItem: null, status: "open" })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleStatusSave} disabled={actionStatus === "loading"}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={priorityDialog.open}
        onClose={() => setPriorityDialog({ open: false, caseItem: null, priority: "low" })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Change Priority</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            select
            fullWidth
            label="Priority"
            value={priorityDialog.priority}
            onChange={(e) => setPriorityDialog((prev) => ({ ...prev, priority: e.target.value }))}
          >
            {priorityOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriorityDialog({ open: false, caseItem: null, priority: "low" })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handlePrioritySave} disabled={actionStatus === "loading"}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={assignDialog.open}
        onClose={() => setAssignDialog({ open: false, caseItem: null, assigned_to: "" })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Assign Admin</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            fullWidth
            label="Admin Email or Name"
            value={assignDialog.assigned_to}
            onChange={(e) => setAssignDialog((prev) => ({ ...prev, assigned_to: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog({ open: false, caseItem: null, assigned_to: "" })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAssignSave} disabled={actionStatus === "loading"}>
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={replyDialog.open}
        onClose={() => setReplyDialog({ open: false, caseItem: null, message: "" })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Reply to Case</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            fullWidth
            multiline
            minRows={4}
            label="Message"
            value={replyDialog.message}
            onChange={(e) => setReplyDialog((prev) => ({ ...prev, message: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialog({ open: false, caseItem: null, message: "" })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReplySend}
            disabled={actionStatus === "loading" || !replyDialog.message.trim()}
          >
            Send Reply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupportCases;
