import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  assignSupportCase,
  clearSelectedCase,
  fetchSupportCase,
  replySupportCase,
  updateSupportCasePriority,
  updateSupportCaseStatus
} from "../features/supportCases/supportCasesSlice";
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

const SupportCaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showToast } = useContext(ToastContext);
  const { selected, detailStatus, detailError, actionStatus, actionError } = useAppSelector(
    (state) => state.supportCases
  );

  const [statusDialog, setStatusDialog] = useState({ open: false, status: "open" });
  const [priorityDialog, setPriorityDialog] = useState({ open: false, priority: "low" });
  const [assignDialog, setAssignDialog] = useState({ open: false, assigned_to: "" });
  const [replyMessage, setReplyMessage] = useState("");

  useEffect(() => {
    dispatch(fetchSupportCase(id));
    return () => {
      dispatch(clearSelectedCase());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (actionStatus === "failed" && actionError) {
      showToast(actionError, "error");
    }
  }, [actionStatus, actionError, showToast]);

  const caseMeta = useMemo(() => {
    if (!selected) return [];
    return [
      { label: "Case ID", value: selected.id },
      { label: "Tenant", value: selected.tenant_name || "-" },
      { label: "Category", value: selected.category || "-" },
      { label: "Assigned To", value: selected.assigned_to_name || "-" },
      { label: "Created", value: selected.created_at ? formatDateTimeIST(selected.created_at) : "-" },
      { label: "Updated", value: selected.updated_at ? formatDateTimeIST(selected.updated_at) : "-" }
    ];
  }, [selected]);

  const handleStatusSave = async () => {
    const result = await dispatch(updateSupportCaseStatus({ id, status: statusDialog.status }));
    if (!updateSupportCaseStatus.rejected.match(result)) {
      showToast("Status updated");
      setStatusDialog({ open: false, status: "open" });
    }
  };

  const handlePrioritySave = async () => {
    const result = await dispatch(updateSupportCasePriority({ id, priority: priorityDialog.priority }));
    if (!updateSupportCasePriority.rejected.match(result)) {
      showToast("Priority updated");
      setPriorityDialog({ open: false, priority: "low" });
    }
  };

  const handleAssignSave = async () => {
    const result = await dispatch(assignSupportCase({ id, assigned_to: assignDialog.assigned_to }));
    if (!assignSupportCase.rejected.match(result)) {
      showToast("Case assigned");
      setAssignDialog({ open: false, assigned_to: "" });
    }
  };

  const handleReplySend = async () => {
    if (!replyMessage.trim()) return;
    const result = await dispatch(replySupportCase({ id, message: replyMessage.trim() }));
    if (!replySupportCase.rejected.match(result)) {
      showToast("Reply sent");
      setReplyMessage("");
    }
  };

  if (detailStatus === "loading") return <LoadingSpinner />;
  if (detailStatus === "failed") return <ErrorState message={detailError} />;
  if (!selected) return <ErrorState message="No support case data available." />;

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Button variant="text" onClick={() => navigate("/admin/support-cases")}>
            Back to Cases
          </Button>
          <Typography variant="h4" sx={{ mt: 1 }}>
            {selected.title || "Support Case"}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip label={selected.status || "-"} color={getStatusChipColor(selected.status)} size="small" />
            <Chip
              label={selected.priority || "-"}
              color={getPriorityChipColor(selected.priority)}
              size="small"
            />
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: { xs: 2, md: 0 } }}>
          <Tooltip title="Refresh">
            <IconButton
              color="primary"
              onClick={() => dispatch(fetchSupportCase(id))}
              aria-label="Refresh support case"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            variant="outlined"
            sx={{ minHeight: 30, py: 0.5 }}
            onClick={() => setStatusDialog({ open: true, status: selected.status || "open" })}
          >
            Change Status
          </Button>
          <Button
            size="small"
            variant="outlined"
            sx={{ minHeight: 30, py: 0.5 }}
            onClick={() => setPriorityDialog({ open: true, priority: selected.priority || "low" })}
          >
            Change Priority
          </Button>
          <Button
            size="small"
            variant="outlined"
            sx={{ minHeight: 30, py: 0.5 }}
            onClick={() => setAssignDialog({ open: true, assigned_to: selected.assigned_to || "" })}
          >
            Assign Admin
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Case Details
              </Typography>
              <Stack spacing={1.5}>
                {caseMeta.map((item) => (
                  <Box key={item.label}>
                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                      {item.label}
                    </Typography>
                    <Typography variant="body1">{item.value}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Description
              </Typography>
              <Typography variant="body1">
                {selected.description || selected.details || selected.body || "No description provided."}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Messages
              </Typography>
              {Array.isArray(selected.messages) && selected.messages.length > 0 ? (
                <Stack spacing={2}>
                  {selected.messages.map((message, index) => (
                    <Box
                      key={message.id || index}
                      sx={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 2,
                        p: 2,
                        backgroundColor: "#f8fafc"
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">
                          {message.author || "User"}
                        </Typography>
                        {message.role && (
                          <Chip
                            label={message.role}
                            size="small"
                            variant="outlined"
                            sx={{ textTransform: "capitalize" }}
                          />
                        )}
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                          {message.created_at ? formatDateTimeIST(message.created_at) : ""}
                        </Typography>
                      </Stack>
                      <Typography variant="body2">{message.body || "-"}</Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  No messages yet.
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Reply
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={3}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your response..."
              />
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleReplySend}
                  disabled={actionStatus === "loading" || !replyMessage.trim()}
                >
                  Send Reply
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, status: "open" })}
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
          <Button onClick={() => setStatusDialog({ open: false, status: "open" })}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusSave} disabled={actionStatus === "loading"}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={priorityDialog.open}
        onClose={() => setPriorityDialog({ open: false, priority: "low" })}
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
          <Button onClick={() => setPriorityDialog({ open: false, priority: "low" })}>Cancel</Button>
          <Button variant="contained" onClick={handlePrioritySave} disabled={actionStatus === "loading"}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={assignDialog.open}
        onClose={() => setAssignDialog({ open: false, assigned_to: "" })}
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
          <Button onClick={() => setAssignDialog({ open: false, assigned_to: "" })}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignSave} disabled={actionStatus === "loading"}>
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupportCaseDetail;
