import React, { useEffect, useMemo, useState } from "react";
import { Box, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchLogs } from "../features/logs/logsSlice";
import DataTable from "../components/common/DataTable";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorState from "../components/common/ErrorState";
import { formatDateTimeIST } from "../utils/date";

const ActivityLogs = () => {
  const dispatch = useAppDispatch();
  const { list, status, error } = useAppSelector((state) => state.logs);
  const [filters, setFilters] = useState({ admin: "all", action: "all", type: "all" });

  useEffect(() => {
    const params = {
      admin: filters.admin !== "all" ? filters.admin : undefined,
      action: filters.action !== "all" ? filters.action : undefined,
      type: filters.type !== "all" ? filters.type : undefined
    };
    dispatch(fetchLogs(params));
  }, [dispatch, filters]);

  const rows = list.map((log) => ({
    id: log.id,
    admin: log.admin_name || log.admin_email || "-",
    action: log.action,
    entity: log.entity_type,
    entityId: log.entity_id ?? "-",
    metadata: log.metadata && Object.keys(log.metadata).length
      ? JSON.stringify(log.metadata)
      : "-",
    date: formatDateTimeIST(log.created_at)
  }));

  const adminOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        list
          .map((log) => log.admin_email || log.admin_name)
          .filter(Boolean)
      )
    );
    return values;
  }, [list]);

  const actionOptions = useMemo(() => {
    const values = Array.from(new Set(list.map((log) => log.action).filter(Boolean)));
    return values;
  }, [list]);

  const columns = useMemo(
    () => [
      { id: "id", label: "Log ID" },
      { id: "admin", label: "Admin" },
      { id: "action", label: "Action" },
      { id: "entity", label: "Entity" },
      { id: "entityId", label: "Entity ID" },
      {
        id: "metadata",
        label: "Metadata",
        render: (row) => (
          <Typography
            variant="body2"
            title={row.metadata}
            sx={{
              maxWidth: 260,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {row.metadata}
          </Typography>
        )
      },
      { id: "date", label: "Date" }
    ],
    []
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Activity Logs
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="Admin"
            value={filters.admin}
            onChange={(e) => setFilters((prev) => ({ ...prev, admin: e.target.value }))}
          >
            <MenuItem value="all">All</MenuItem>
            {adminOptions.map((admin) => (
              <MenuItem key={admin} value={admin}>
                {admin}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            fullWidth
            label="Action Type"
            value={filters.action}
            onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
          >
            <MenuItem value="all">All</MenuItem>
            {actionOptions.map((action) => (
              <MenuItem key={action} value={action}>
                {action}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            fullWidth
            label="Type"
            value={filters.type}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="updates_made">Updates Made</MenuItem>
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

export default ActivityLogs;
