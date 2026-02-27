import React from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import SubscriptionBanner from "../common/SubscriptionBanner";

const DashboardLayout = ({ children, onLogout, adminName, subscription }) => {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar onLogout={onLogout} />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar adminName={adminName} />
        <SubscriptionBanner subscription={subscription} />
        <Box sx={{ p: { xs: 2, md: 4 } }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
