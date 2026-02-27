import React from "react";
import {
  AppBar,
  Box,
  IconButton,
  InputBase,
  Toolbar,
  Typography,
  Badge
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";

const Topbar = ({ adminName }) => {
  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{
        borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
        backdropFilter: "blur(6px)",
        backgroundColor: "rgba(255, 255, 255, 0.8)"
      }}
    >
      <Toolbar sx={{ py: 1.5 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#fff",
            px: 2,
            py: 0.75,
            borderRadius: 99,
            border: "1px solid rgba(148, 163, 184, 0.3)",
            minWidth: 240
          }}
        >
          <SearchIcon sx={{ color: "#94a3b8" }} />
          <InputBase placeholder="Search tenants, orders..." sx={{ ml: 1, flex: 1 }} />
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton>
          <Badge color="secondary" variant="dot">
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
        <Box sx={{ ml: 2 }}>
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            Welcome back
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {adminName || "Platform Owner"}
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
